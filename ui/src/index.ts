import cytoscape from 'cytoscape';

interface NodeData {
  name: string;
  call_count: number;
  error_count: number;
}

interface EdgeData {
  src: string;
  dst: string;
  call_count: number;
  p95_ms: number;
  error_count: number;
}

interface GraphData {
  nodes: NodeData[];
  edges: EdgeData[];
}

let cy: cytoscape.Core | null = null;
let currentWindowSec = 60;
let ws: WebSocket | null = null;

function getHealthColor(errorCount: number, callCount: number): string {
  if (callCount === 0) return '#ccc';
  const errorRate = errorCount / callCount;
  if (errorRate > 0.1) return '#ff4d4f'; // Red
  if (errorRate > 0.01) return '#faad14'; // Yellow
  return '#52c41a'; // Green
}

function updateGraph(data: GraphData) {
  if (!cy) {
    cy = cytoscape({
      container: document.getElementById('cy'),
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label': 'data(label)',
            'text-valign': 'center',
            'color': '#fff',
            'text-outline-width': 2,
            'text-outline-color': '#888',
            'width': 60,
            'height': 60
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': 'data(color)',
            'target-arrow-color': 'data(color)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'text-rotation': 'autorotate',
            'text-margin-y': -10
          }
        },
        {
          selector: ':selected',
          style: {
            'border-width': 3,
            'border-color': '#333'
          }
        }
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        padding: 10
      }
    });

    cy.on('tap', 'node, edge', (evt) => {
      const ele = evt.target;
      showDetails(ele.data());
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        hideDetails();
      }
    });
  }

  const elements: cytoscape.ElementDefinition[] = [];

  // Prepare nodes
  data.nodes.forEach(node => {
    // Robustly handle if node is a string (old API) or an object (new API)
    let nodeId: string;
    let totalCalls: number;
    let totalErrors: number;

    if (typeof node === 'string') {
      nodeId = node;
      totalCalls = 0; // Unknown if old API
      totalErrors = 0;
    } else {
      nodeId = String(node.name || 'unknown');
      totalCalls = Number(node.call_count || 0);
      totalErrors = Number(node.error_count || 0);
    }

    elements.push({
      data: {
        id: String(nodeId),
        label: String(nodeId),
        color: getHealthColor(totalErrors, totalCalls),
        metrics: {
          totalCalls: Number(totalCalls),
          totalErrors: Number(totalErrors),
          errorRate: totalCalls > 0 ? (totalErrors / totalCalls * 100).toFixed(2) : "0.00"
        }
      }
    });
  });

  // Prepare edges
  data.edges.forEach((edge, index) => {
    const src = String(edge.src);
    const dst = String(edge.dst);
    const id = `e_${src}_${dst}`;
    elements.push({
      data: {
        id: String(id),
        source: String(src),
        target: String(dst),
        label: `${edge.call_count} calls`,
        color: getHealthColor(Number(edge.error_count), Number(edge.call_count)),
        metrics: {
          src: String(edge.src),
          dst: String(edge.dst),
          call_count: Number(edge.call_count),
          p95_ms: Number(edge.p95_ms),
          error_count: Number(edge.error_count)
        }
      }
    });
  });

  // Use batch update to preserve positions as much as possible, or just replace all
  // For a dynamic graph, we might want to use cy.json() or add/remove
  const existingIds = cy.elements().map(e => e.id());
  const newIds = elements.map(e => e.data.id!);

  // Remove elements not in new data
  existingIds.forEach(id => {
    if (!newIds.includes(id)) {
      const elToRemove = cy?.getElementById(id);
      if (elToRemove && elToRemove.length > 0) {
        cy?.remove(elToRemove);
      }
    }
  });

  // Add or Update elements
  elements.forEach(el => {
    try {
      const id = el.data.id!;
      if (typeof id !== 'string') {
        console.error('Non-string ID detected before Cytoscape operation:', id, el);
      }

      // EXHAUSTIVE SANITIZATION: Ensure everything in el.data is a primitive (or a shallow object of primitives)
      // and that no [object Object] strings are present as IDs.
      if (id.includes('[object Object]')) {
         console.error('INVALID ID DETECTED (contains [object Object]):', id, el);
         return; // Skip this element
      }

      const existing = cy?.getElementById(id);
      if (existing && existing.length > 0) {
        // console.log(`Updating existing element: ${id}`);
        existing.data(JSON.parse(JSON.stringify(el.data))); // Deep copy/sanitize via JSON serialization
      } else {
        // console.log(`Adding new element: ${id}`);
        cy?.add(JSON.parse(JSON.stringify(el))); // Deep copy/sanitize via JSON serialization
      }
    } catch (e) {
      console.error('Error adding/updating element in Cytoscape:', e, JSON.stringify(el, null, 2));
    }
  });

  // Re-run layout if it's the first time or if nodes changed significantly
  if (existingIds.length === 0 || (newIds.length > 0 && existingIds.length !== newIds.length)) {
      cy.layout({ name: 'breadthfirst', directed: true, padding: 10 }).run();
  }
}

function showDetails(data: any) {
  const sidebar = document.getElementById('sidebar')!;
  const title = document.getElementById('side-title')!;
  const content = document.getElementById('side-content')!;

  sidebar.style.display = 'block';

  if (data.source) { // Edge
    title.innerText = `Edge: ${data.source} -> ${data.target}`;
    content.innerHTML = `
      <p><b>Call Count:</b> ${data.metrics.call_count}</p>
      <p><b>p95 Latency:</b> ${data.metrics.p95_ms}ms</p>
      <p><b>Error Count:</b> ${data.metrics.error_count}</p>
      <p><b>Error Rate:</b> ${(data.metrics.error_count / data.metrics.call_count * 100).toFixed(2)}%</p>
    `;
  } else { // Node
    title.innerText = `Service: ${data.id}`;
    content.innerHTML = `
      <p><b>Total Calls:</b> ${data.metrics.totalCalls}</p>
      <p><b>Total Errors:</b> ${data.metrics.totalErrors}</p>
      <p><b>Aggregate Error Rate:</b> ${data.metrics.errorRate}%</p>
    `;
  }
}

function hideDetails() {
  document.getElementById('sidebar')!.style.display = 'none';
}

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  console.log(`Connecting to WebSocket: ${wsUrl}`);
  ws = new WebSocket(wsUrl);

  const statusEl = document.getElementById('ws-status')!;

  ws.onopen = () => {
    statusEl.innerText = 'Connected';
    statusEl.style.color = 'green';
    ws?.send(`window:${currentWindowSec}`);
  };

  ws.onmessage = (event) => {
    try {
        const data: GraphData = JSON.parse(event.data);
        console.log('WebSocket data received:', JSON.stringify(data, null, 2));
        updateGraph(data);
    } catch (err) {
        console.error('Error processing WebSocket message:', err);
    }
  };

  ws.onclose = () => {
    statusEl.innerText = 'Disconnected (Retrying...)';
    statusEl.style.color = 'red';
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    ws?.close();
  };
}

async function manualFetch() {
    try {
        const response = await fetch(`/graph?window_sec=${currentWindowSec}`);
        const data: GraphData = await response.json();
        updateGraph(data);
    } catch (err) {
        console.error('Manual fetch failed:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
  // connectWebSocket();
  manualFetch();

  document.getElementById('refresh-btn')?.addEventListener('click', manualFetch);

  const selector = document.getElementById('window-selector') as HTMLSelectElement;
  selector.addEventListener('change', () => {
    currentWindowSec = parseInt(selector.value);
    // if (ws && ws.readyState === WebSocket.OPEN) {
    //   ws.send(`window:${currentWindowSec}`);
    // }
    manualFetch();
  });
});
