import { connectWebSocket, manualFetch, sendWindowUpdate } from './network';
import { updateGraph } from './graph';
import './style.css';

let currentWindowSec = 60;

function updateStatus(status: 'connected' | 'disconnected') {
  const statusEl = document.getElementById('ws-status')!;
  if (!statusEl) return;

  if (status === 'connected') {
    statusEl.innerText = 'Connected';
    statusEl.classList.remove('disconnected');
    statusEl.classList.add('connected');
  } else {
    statusEl.innerText = 'Disconnected (Retrying...)';
    statusEl.classList.remove('connected');
    statusEl.classList.add('disconnected');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  connectWebSocket(currentWindowSec, updateGraph, updateStatus);
  manualFetch(currentWindowSec, updateGraph);

  document.getElementById('refresh-btn')?.addEventListener('click', () => manualFetch(currentWindowSec, updateGraph));

  const selector = document.getElementById('window-selector') as HTMLSelectElement;
  selector.addEventListener('change', () => {
    currentWindowSec = parseInt(selector.value);
    sendWindowUpdate(currentWindowSec);
    manualFetch(currentWindowSec, updateGraph);
  });
});
