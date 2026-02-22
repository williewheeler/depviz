import { GraphData } from './model';

let ws: WebSocket | null = null;

export function connectWebSocket(
  currentWindowSec: number,
  onData: (data: GraphData) => void,
  onStatusUpdate: (status: 'connected' | 'disconnected') => void
) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  console.log(`Connecting to WebSocket: ${wsUrl}`);
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    onStatusUpdate('connected');
    ws?.send(`window:${currentWindowSec}`);
  };

  ws.onmessage = (event) => {
    try {
      const data: GraphData = JSON.parse(event.data);
      console.log('WebSocket data received:', JSON.stringify(data, null, 2));
      onData(data);
    } catch (err) {
      console.error('Error processing WebSocket message:', err);
    }
  };

  ws.onclose = () => {
    onStatusUpdate('disconnected');
    setTimeout(() => connectWebSocket(currentWindowSec, onData, onStatusUpdate), 3000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    ws?.close();
  };
}

export function sendWindowUpdate(currentWindowSec: number) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(`window:${currentWindowSec}`);
  }
}

export async function manualFetch(
  currentWindowSec: number,
  onData: (data: GraphData) => void
) {
  try {
    const response = await fetch(`/graph?window_sec=${currentWindowSec}`);
    const data: GraphData = await response.json();
    onData(data);
  } catch (err) {
    console.error('Manual fetch failed:', err);
  }
}
