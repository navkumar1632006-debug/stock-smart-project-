import fs from 'fs';
import path from 'path';
import config from '../config/selenium.config.js';

export function generateHtmlReport(results, outputPath = config.paths.htmlReport) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const totalTests = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIPPED' || r.status === 'BLOCKED').length;
  const passRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : '0';
  const totalDuration = results.reduce((acc, r) => acc + (r.duration || 0), 0);

  const categories = [...new Set(results.map(r => r.category))];
  const categoryCards = categories.map(cat => {
    const inCat = results.filter(r => r.category === cat);
    const catPassed = inCat.filter(r => r.status === 'PASS').length;
    const catFailed = inCat.filter(r => r.status === 'FAIL').length;
    const catRate = inCat.length > 0 ? ((catPassed / inCat.length) * 100).toFixed(0) : '0';
    return `
      <div class="cat-card">
        <div class="cat-title">${cat}</div>
        <div class="cat-stats">${catPassed}/${inCat.length} Passed (${catRate}%)</div>
        <div class="bar-container">
          <div class="bar-fill" style="width: ${catRate}%;"></div>
        </div>
      </div>
    `;
  }).join('');

  const rowsHtml = results.map(r => {
    const badgeClass = r.status === 'PASS' ? 'badge-pass' : (r.status === 'FAIL' ? 'badge-fail' : 'badge-skip');
    return `
      <tr>
        <td><code>${r.testId}</code></td>
        <td><strong>${r.category}</strong></td>
        <td>${r.scenario}</td>
        <td><span class="badge ${badgeClass}">${r.status}</span></td>
        <td>${r.duration} ms</td>
        <td>${r.error ? `<span class="err-text">${r.error}</span>` : '—'}</td>
        <td>${r.screenshot ? `<a href="../screenshots/${r.screenshot}" target="_blank">View</a>` : '—'}</td>
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>StockSmart AI — Web E2E Test Execution Report</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --pass: #10b981;
      --fail: #ef4444;
      --primary: #6366f1;
    }
    body {
      margin: 0;
      padding: 30px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    .header {
      margin-bottom: 30px;
    }
    h1 { margin: 0 0 8px 0; font-size: 26px; }
    .sub { color: var(--text-muted); font-size: 14px; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    .card-num { font-size: 32px; font-weight: bold; margin-top: 6px; }
    .pass-color { color: var(--pass); }
    .fail-color { color: var(--fail); }
    .primary-color { color: var(--primary); }
    .cat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .cat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .cat-title { font-weight: 600; font-size: 15px; margin-bottom: 6px; }
    .cat-stats { font-size: 13px; color: var(--text-muted); margin-bottom: 8px; }
    .bar-container { background: #334155; border-radius: 4px; height: 6px; overflow: hidden; }
    .bar-fill { background: var(--pass); height: 100%; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--card-bg);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      font-size: 14px;
    }
    th { background: #182234; color: var(--text-muted); text-transform: uppercase; font-size: 12px; }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-pass { background: rgba(16, 185, 129, 0.2); color: var(--pass); }
    .badge-fail { background: rgba(239, 68, 68, 0.2); color: var(--fail); }
    .badge-skip { background: rgba(148, 163, 184, 0.2); color: var(--text-muted); }
    .err-text { color: var(--fail); font-family: monospace; font-size: 12px; }
    a { color: var(--primary); text-decoration: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>StockSmart AI — Web E2E Test Execution Report</h1>
    <div class="sub">Generated: ${new Date().toISOString()} | Target: ${config.baseUrl} | Engine: Chrome (${config.headless ? 'Headless' : 'Windowed'})</div>
  </div>

  <div class="summary-grid">
    <div class="card">
      <div class="sub">Total Executed</div>
      <div class="card-num primary-color">${totalTests}</div>
    </div>
    <div class="card">
      <div class="sub">Passed Tests</div>
      <div class="card-num pass-color">${passed}</div>
    </div>
    <div class="card">
      <div class="sub">Failed Tests</div>
      <div class="card-num fail-color">${failed}</div>
    </div>
    <div class="card">
      <div class="sub">Pass Rate</div>
      <div class="card-num pass-color">${passRate}%</div>
    </div>
    <div class="card">
      <div class="sub">Total Duration</div>
      <div class="card-num">${(totalDuration / 1000).toFixed(2)}s</div>
    </div>
  </div>

  <h2>Categories Breakdown</h2>
  <div class="cat-grid">
    ${categoryCards}
  </div>

  <h2>Test Execution Inventory</h2>
  <table>
    <thead>
      <tr>
        <th>Test ID</th>
        <th>Category</th>
        <th>Scenario</th>
        <th>Status</th>
        <th>Duration</th>
        <th>Failure Details</th>
        <th>Artifact</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>
  `;

  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`HTML Web Test Report written to: ${outputPath}`);
  return outputPath;
}

export default generateHtmlReport;
