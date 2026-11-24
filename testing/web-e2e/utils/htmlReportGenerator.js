import fs from 'fs';
import path from 'path';
import config from '../config/selenium.config.js';

export function generateHtmlReport(results, outputPath = config.paths.htmlReport) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIPPED' || r.status === 'BLOCKED').length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
  const totalDuration = (results.reduce((acc, r) => acc + (r.duration || 0), 0) / 1000).toFixed(2);

  const modules = [...new Set(results.map(r => r.module))];
  const moduleCards = modules.map(mod => {
    const inMod = results.filter(r => r.module === mod);
    const mPass = inMod.filter(r => r.status === 'PASS').length;
    const mFail = inMod.filter(r => r.status === 'FAIL').length;
    const mRate = inMod.length > 0 ? ((mPass / inMod.length) * 100).toFixed(0) : '0';
    return `
      <div class="module-card">
        <div class="module-title">${mod}</div>
        <div class="module-stats">
          <span>${mPass}/${inMod.length} Passed</span>
          <span class="rate-badge ${mFail === 0 ? 'rate-good' : 'rate-warn'}">${mRate}%</span>
        </div>
      </div>
    `;
  }).join('');

  const tableRows = results.map(r => {
    const statusClass = r.status === 'PASS' ? 'status-pass' : (r.status === 'FAIL' ? 'status-fail' : 'status-skip');
    return `
      <tr>
        <td class="font-mono">${r.testId}</td>
        <td><span class="category-pill">${r.module}</span></td>
        <td><strong>${r.scenario}</strong></td>
        <td>${r.expected}</td>
        <td>${r.actual}</td>
        <td><span class="status-pill ${statusClass}">${r.status}</span></td>
        <td>${r.duration} ms</td>
        <td class="error-cell">${r.error ? `<code>${r.error.replace(/</g, '&lt;')}</code>` : '-'}</td>
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>StockSmart AI — Selenium E2E Automation Report</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --pass: #22c55e;
      --fail: #ef4444;
      --warn: #f59e0b;
      --accent: #3b82f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding: 2rem; line-height: 1.5; }
    .header { margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; }
    .header h1 { font-size: 1.8rem; font-weight: 700; color: #fff; }
    .header p { color: var(--text-muted); font-size: 0.95rem; margin-top: 0.25rem; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .metric-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; }
    .metric-title { font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; }
    .metric-val { font-size: 2rem; font-weight: 700; margin-top: 0.25rem; }
    .val-pass { color: var(--pass); }
    .val-fail { color: var(--fail); }
    .val-accent { color: var(--accent); }
    .progress-bar { background: var(--border); border-radius: 999px; height: 10px; overflow: hidden; margin-bottom: 2rem; display: flex; }
    .progress-pass { background: var(--pass); height: 100%; }
    .progress-fail { background: var(--fail); height: 100%; }
    .modules-section { margin-bottom: 2rem; }
    .modules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem; margin-top: 0.75rem; }
    .module-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; padding: 0.85rem 1rem; }
    .module-title { font-weight: 600; font-size: 0.9rem; }
    .module-stats { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-muted); }
    .rate-badge { padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 0.75rem; }
    .rate-good { background: rgba(34, 197, 94, 0.15); color: var(--pass); }
    .rate-warn { background: rgba(239, 68, 68, 0.15); color: var(--fail); }
    table { width: 100%; border-collapse: collapse; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; font-size: 0.875rem; }
    th { background: #111827; text-align: left; padding: 0.75rem 1rem; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .status-pill { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 0.75rem; }
    .status-pass { background: rgba(34, 197, 94, 0.2); color: var(--pass); }
    .status-fail { background: rgba(239, 68, 68, 0.2); color: var(--fail); }
    .status-skip { background: rgba(245, 158, 11, 0.2); color: var(--warn); }
    .category-pill { background: rgba(59, 130, 246, 0.15); color: #93c5fd; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; }
    .font-mono { font-family: monospace; }
    .error-cell { max-width: 280px; word-break: break-word; color: #fca5a5; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>StockSmart AI — Selenium E2E Automation Report</h1>
    <p>Target: ${config.baseUrl} | Browser: ${config.browser.toUpperCase()} (Headless=${config.headless}) | Generated: ${new Date().toUTCString()}</p>
  </div>

  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-title">Total Tests</div>
      <div class="metric-val">${total}</div>
    </div>
    <div class="metric-card">
      <div class="metric-title">Passed</div>
      <div class="metric-val val-pass">${passed}</div>
    </div>
    <div class="metric-card">
      <div class="metric-title">Failed</div>
      <div class="metric-val val-fail">${failed}</div>
    </div>
    <div class="metric-card">
      <div class="metric-title">Pass Rate</div>
      <div class="metric-val ${failed === 0 ? 'val-pass' : 'val-fail'}">${passRate}%</div>
    </div>
    <div class="metric-card">
      <div class="metric-title">Duration</div>
      <div class="metric-val val-accent">${totalDuration}s</div>
    </div>
  </div>

  <div class="progress-bar">
    <div class="progress-pass" style="width: ${passRate}%"></div>
    <div class="progress-fail" style="width: ${100 - passRate}%"></div>
  </div>

  <div class="modules-section">
    <h2 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">Module Breakdown</h2>
    <div class="modules-grid">
      ${moduleCards}
    </div>
  </div>

  <h2 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem;">Execution Details</h2>
  <table>
    <thead>
      <tr>
        <th>Test ID</th>
        <th>Module</th>
        <th>Test Scenario</th>
        <th>Expected Result</th>
        <th>Actual Result</th>
        <th>Status</th>
        <th>Duration</th>
        <th>Error Details</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`[HTML Reporter]: Report generated at ${outputPath}`);
  return outputPath;
}

export default generateHtmlReport;
