import cytoscape from 'https://esm.sh/cytoscape@3.33.1';
import dagre from 'https://esm.sh/cytoscape-dagre@2.5.0';
import { GraphData } from './model';
import { showDetails, hideDetails } from './details';

cytoscape.use(dagre);

let cy: cytoscape.Core | null = null;

/**
 * Reads a CSS variable value from the #cy element and returns it as a string.
 * This allows us to keep graph styles in style.css.
 */
export function getCyStyle(varName: string): string {
  const cyEl = document.getElementById('cy');
  if (!cyEl) return '';
  return getComputedStyle(cyEl).getPropertyValue(varName).trim();
}

/**
 * Reads a CSS variable and returns its value as a number (stripping 'px' etc).
 */
export function getCyStyleNum(varName: string): number {
  const val = getCyStyle(varName);
  return parseFloat(val) || 0;
}

export function getHealthColor(errorCount: number, callCount: number): string {
  if (callCount === 0) return getCyStyle('--health-color-unknown') || '#ccc';
  const errorRate = errorCount / callCount;
  if (errorRate > 0.1) return getCyStyle('--health-color-error') || '#ff4d4f'; // Red
  if (errorRate > 0.01) return getCyStyle('--health-color-warning') || '#faad14'; // Yellow
  return getCyStyle('--health-color-good') || '#52c41a'; // Green
}

export function updateGraph(data: GraphData) {
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
            'color': getCyStyle('--cy-node-text-color') || '#fff',
            'text-outline-width': getCyStyleNum('--cy-node-outline-width') || 2,
            'text-outline-color': getCyStyle('--cy-node-outline-color') || '#888',
            'width': getCyStyleNum('--cy-node-size') || 60,
            'height': getCyStyleNum('--cy-node-size') || 60
          }
        },
        {
          selector: 'edge',
          style: {
            'width': getCyStyleNum('--cy-edge-width') || 3,
            'line-color': 'data(color)',
            'target-arrow-color': 'data(color)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'color': getCyStyle('--cy-edge-text-color') || '#fff',
            'font-size': getCyStyle('--cy-edge-font-size') || '10px',
            'text-rotation': 'autorotate',
            'text-margin-y': getCyStyleNum('--cy-edge-text-margin-y') || -10
          }
        },
        {
          selector: ':selected',
          style: {
            'border-width': getCyStyleNum('--cy-selected-border-width') || 3,
            'border-color': getCyStyle('--cy-selected-border-color') || '#333'
          }
        }
      ],
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 50,
        edgeSep: 10,
        rankSep: 50,
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 30,
        nodeDimensionsIncludeLabels: true,
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
    let nodeId: string = String(node.name || 'unknown');
    let totalCalls: number = Number(node.call_count || 0);
    let totalErrors: number = Number(node.error_count || 0);

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
      cy.layout({
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 50,
        edgeSep: 10,
        rankSep: 50,
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 30,
        nodeDimensionsIncludeLabels: true,
      }).run();
  }
}
