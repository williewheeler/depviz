import cytoscape from 'cytoscape';

interface EdgeData {
  src: string;
  dst: string;
  call_count: number;
  p95_ms: number;
  error_count: number;
}

interface GraphData {
  nodes: string[];
  edges: EdgeData[];
}

function getHealthColor(errorCount: number, callCount: number): string {
  if (callCount === 0) return '#ccc';
  const errorRate = errorCount / callCount;
  if (errorRate > 0.1) return '#ff4d4f'; // Red
  if (errorRate > 0.01) return '#faad14'; // Yellow
  return '#52c41a'; // Green
}

async function fetchAndRender() {
  try {
    const response = await fetch('/graph');
    const data: GraphData = await response.json();

    const elements: cytoscape.ElementDefinition[] = [];

    // Add nodes
    data.nodes.forEach(nodeId => {
      // For simplicity, we'll determine node health based on its outgoing edges' health
      const outgoingEdges = data.edges.filter(e => e.src === nodeId);
      const totalErrors = outgoingEdges.reduce((acc, e) => acc + e.error_count, 0);
      const totalCalls = outgoingEdges.reduce((acc, e) => acc + e.call_count, 0);
      
      elements.push({
        data: { 
          id: nodeId, 
          label: nodeId,
          color: getHealthColor(totalErrors, totalCalls)
        }
      });
    });

    // Add edges
    data.edges.forEach((edge, index) => {
      elements.push({
        data: {
          id: `e${index}`,
          source: edge.src,
          target: edge.dst,
          label: `${edge.call_count} calls, ${edge.p95_ms}ms`,
          color: getHealthColor(edge.error_count, edge.call_count)
        }
      });
    });

    cytoscape({
      container: document.getElementById('cy'),
      elements: elements,
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
        }
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        padding: 10
      }
    });

  } catch (error) {
    console.error('Error fetching graph data:', error);
    document.getElementById('cy')!.innerHTML = `<p style="color:red; padding:20px;">Error fetching graph data: ${error}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', fetchAndRender);
