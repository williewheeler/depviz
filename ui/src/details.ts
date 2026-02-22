/**
 * Updates the sidebar with details about the selected node or edge.
 */
export function showDetails(data: any) {
  const sidebar = document.getElementById('sidebar')!;
  const title = document.getElementById('side-title')!;
  const content = document.getElementById('side-content')!;

  if (!sidebar || !title || !content) return;

  // Defensive metrics extraction
  const metrics = data.metrics || {};

  if (data.source) { // Edge
    title.innerText = `Dependency Details`;
    const callCount = Number(metrics.call_count || 0);
    const errorCount = Number(metrics.error_count || 0);
    const errorRate = callCount > 0 ? (errorCount / callCount * 100).toFixed(2) : "0.00";
    const p95 = Number(metrics.p95_ms || 0);

    content.innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">Relationship</div>
        <div class="detail-item">
          <span class="detail-label">Source:</span>
          <span class="detail-value">${data.source}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Target:</span>
          <span class="detail-value">${data.target}</span>
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Metrics</div>
        <div class="detail-item">
          <span class="detail-label">Call Count:</span>
          <span class="detail-value">${callCount}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">p95 Latency:</span>
          <span class="detail-value">${p95}ms</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Error Count:</span>
          <span class="detail-value">${errorCount}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Error Rate:</span>
          <span class="detail-value">${errorRate}%</span>
        </div>
      </div>
    `;
  } else { // Node
    title.innerText = `Service: ${data.id}`;
    const totalCalls = Number(metrics.totalCalls || 0);
    const totalErrors = Number(metrics.totalErrors || 0);
    const errorRate = metrics.errorRate || (totalCalls > 0 ? (totalErrors / totalCalls * 100).toFixed(2) : "0.00");

    content.innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">Metrics (Window)</div>
        <div class="detail-item">
          <span class="detail-label">Total Calls:</span>
          <span class="detail-value">${totalCalls}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Total Errors:</span>
          <span class="detail-value">${totalErrors}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Error Rate:</span>
          <span class="detail-value">${errorRate}%</span>
        </div>
      </div>
    `;
  }
}

/**
 * Resets the sidebar to its default placeholder state.
 */
export function hideDetails() {
  const title = document.getElementById('side-title')!;
  const content = document.getElementById('side-content')!;
  if (title) title.innerText = 'Selection Details';
  if (content) content.innerHTML = '<p>Click a node or edge to see metrics.</p>';
}
