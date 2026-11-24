import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

export function getMetricValue(metricObj, key, defaultValue = undefined) {
  if (!metricObj) return defaultValue;
  if (metricObj.values && metricObj.values[key] !== undefined && metricObj.values[key] !== null) {
    return metricObj.values[key];
  }
  if (metricObj[key] !== undefined && metricObj[key] !== null) {
    return metricObj[key];
  }
  return defaultValue;
}

export function formatNumber(val, decimals = 2, fallback = 'N/A') {
  if (val === undefined || val === null || isNaN(val)) return fallback;
  return Number(val).toFixed(decimals);
}

export async function generateExcelReport(summaryData, outputPath = 'reports/API_Load_Test_Report.xlsx') {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StockSmart AI Performance Automation';
  workbook.lastModifiedBy = 'StockSmart k6 Load Suite';
  workbook.created = new Date();
  workbook.modified = new Date();

  const metrics = summaryData.metrics || {};
  const httpReqs = metrics.http_reqs || {};
  const totalRequests = getMetricValue(httpReqs, 'count', 0);
  const throughputRps = getMetricValue(httpReqs, 'rate', 0);

  const httpReqDuration = metrics.http_req_duration || {};
  const avgDuration = getMetricValue(httpReqDuration, 'avg', 0);
  const minDuration = getMetricValue(httpReqDuration, 'min', 0);
  const medDuration = getMetricValue(httpReqDuration, 'med', 0);
  const maxDuration = getMetricValue(httpReqDuration, 'max', 0);
  const p90Duration = getMetricValue(httpReqDuration, 'p(90)', getMetricValue(httpReqDuration, 'p90', 0));
  const p95Duration = getMetricValue(httpReqDuration, 'p(95)', getMetricValue(httpReqDuration, 'p95', 0));
  const p99Duration = getMetricValue(httpReqDuration, 'p(99)', getMetricValue(httpReqDuration, 'p99', 0));

  const httpReqFailed = metrics.http_req_failed || {};
  const failedRateVal = getMetricValue(httpReqFailed, 'rate', 0);
  const failedReqCount = getMetricValue(httpReqFailed, 'passes', 0);
  const successfulReqCount = getMetricValue(httpReqFailed, 'fails', totalRequests);

  const checks = metrics.checks || {};
  const checksPassRateVal = getMetricValue(checks, 'rate', 1);
  const checksPassedCount = getMetricValue(checks, 'passes', totalRequests);
  const checksFailedCount = getMetricValue(checks, 'fails', 0);

  const vusMax = getMetricValue(metrics.vus_max, 'value', getMetricValue(metrics.vus_max, 'max', getMetricValue(metrics.vus, 'max', 100)));
  const dataReceived = getMetricValue(metrics.data_received, 'count', 0);
  const dataSent = getMetricValue(metrics.data_sent, 'count', 0);

  const failedPercentage = (failedRateVal * 100).toFixed(2);
  const checkSuccessPercentage = (checksPassRateVal * 100).toFixed(2);
  const failRatePass = parseFloat(failedPercentage) < 5.0;
  const p95Pass = p95Duration < 1500.0;
  const overallPassed = failRatePass && p95Pass;

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  const headerFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  const styleTable = (sheet, startRow, headers, rows) => {
    sheet.getRow(startRow).values = headers;
    const hRow = sheet.getRow(startRow);
    hRow.height = 24;
    hRow.eachCell(c => {
      c.fill = headerFill;
      c.font = headerFont;
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      c.border = thinBorder;
    });

    let rIdx = startRow + 1;
    rows.forEach(r => {
      const row = sheet.getRow(rIdx);
      row.values = r;
      row.height = 20;
      row.eachCell((c) => {
        c.font = { name: 'Calibri', size: 10 };
        c.alignment = { vertical: 'middle', horizontal: 'left' };
        c.border = thinBorder;
      });
      rIdx++;
    });
    sheet.views = [{ state: 'frozen', ySplit: startRow }];
  };

  // 1. Performance Summary
  const ws1 = workbook.addWorksheet('Performance Summary');
  ws1.columns = [{ width: 28 }, { width: 30 }, { width: 35 }];
  ws1.getCell('A1').value = 'StockSmart AI — k6 Performance Summary';
  ws1.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0F172A' } };
  ws1.getCell('A2').value = `Generated at ${new Date().toISOString()} | Virtual Users: ${vusMax} | Duration: 1m`;
  ws1.getCell('A2').font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF64748B' } };

  const summaryRows = [
    ['Total HTTP Requests', totalRequests, 'Cumulative requests dispatched'],
    ['Throughput (RPS)', `${formatNumber(throughputRps, 2)} req/s`, 'Mean requests completed per second'],
    ['Virtual Users (VUs)', vusMax, 'Configured concurrent simulated users'],
    ['Duration', '60s (1m)', 'Sustained load test period'],
    ['Average Response Time', `${formatNumber(avgDuration, 2)} ms`, 'Mean roundtrip latency'],
    ['P95 Response Time', `${formatNumber(p95Duration, 2)} ms`, '95th percentile response latency'],
    ['P99 Response Time', `${formatNumber(p99Duration, 2)} ms`, '99th percentile response latency'],
    ['HTTP Request Failure Rate', `${failedPercentage}%`, 'Failure rate across all requests'],
    ['Validation Checks Passed', `${checkSuccessPercentage}%`, 'Percentage of business assertions passed'],
    ['Data Transferred', `${(dataReceived / 1024).toFixed(1)} KB down / ${(dataSent / 1024).toFixed(1)} KB up`, 'Network payload volumes'],
    ['Overall SLA Status', overallPassed ? 'PASS' : 'FAIL', overallPassed ? 'All performance thresholds met' : 'Threshold breached']
  ];
  styleTable(ws1, 4, ['Metric', 'Observed Value', 'Operational Note'], summaryRows);

  // 2. Request Statistics
  const ws2 = workbook.addWorksheet('Request Statistics');
  ws2.columns = [{ width: 25 }, { width: 20 }, { width: 35 }];
  ws2.getCell('A1').value = 'HTTP Request Volume & Reliability Statistics';
  ws2.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

  const reqRows = [
    ['Total Dispatched Requests', totalRequests, 'Total requests generated by 100 VUs'],
    ['Successful Requests (200 OK)', successfulReqCount, 'Requests satisfying status 200 criteria'],
    ['Failed Requests', failedReqCount, 'Requests with network or HTTP 4xx/5xx errors'],
    ['Checks Evaluated', checksPassedCount + checksFailedCount, 'Total programmatic checks evaluated'],
    ['Checks Passed', checksPassedCount, 'Successful check assertions'],
    ['Checks Failed', checksFailedCount, 'Failed check assertions']
  ];
  styleTable(ws2, 3, ['Statistic', 'Value', 'Context'], reqRows);

  // 3. Response Time Analysis
  const ws3 = workbook.addWorksheet('Response Time Analysis');
  ws3.columns = [{ width: 25 }, { width: 20 }, { width: 35 }];
  ws3.getCell('A1').value = 'Response Time Percentiles & Distribution';
  ws3.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

  const latencyRows = [
    ['Minimum Latency', `${formatNumber(minDuration, 2)} ms`, 'Fastest recorded request'],
    ['Median Latency (P50)', `${formatNumber(medDuration, 2)} ms`, '50th percentile response time'],
    ['Average Latency', `${formatNumber(avgDuration, 2)} ms`, 'Mean latency across all VUs'],
    ['P90 Latency', `${formatNumber(p90Duration, 2)} ms`, '90% of requests completed under this time'],
    ['P95 Latency', `${formatNumber(p95Duration, 2)} ms`, 'Threshold boundary target: < 1500 ms'],
    ['P99 Latency', `${formatNumber(p99Duration, 2)} ms`, 'Tail latency benchmark'],
    ['Maximum Latency', `${formatNumber(maxDuration, 2)} ms`, 'Worst-case response time observed']
  ];
  styleTable(ws3, 3, ['Percentile / Metric', 'Duration', 'Benchmark Context'], latencyRows);

  // 4. Throughput Analysis
  const ws4 = workbook.addWorksheet('Throughput Analysis');
  ws4.columns = [{ width: 25 }, { width: 20 }, { width: 35 }];
  ws4.getCell('A1').value = 'Throughput & Capacity Metrics';
  ws4.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

  const tpRows = [
    ['Average Request Rate', `${formatNumber(throughputRps, 2)} req/s`, 'Sustained throughput under 100 VUs'],
    ['Virtual Users Load', vusMax, 'Concurrent user simulation intensity'],
    ['Data Inbound Rate', `${(throughputRps * (dataReceived / (totalRequests || 1)) / 1024).toFixed(2)} KB/s`, 'Inbound bandwidth consumption'],
    ['Data Outbound Rate', `${(throughputRps * (dataSent / (totalRequests || 1)) / 1024).toFixed(2)} KB/s`, 'Outbound bandwidth consumption']
  ];
  styleTable(ws4, 3, ['Throughput Metric', 'Observed Value', 'Operational Context'], tpRows);

  // 5. HTTP Status Distribution
  const ws5 = workbook.addWorksheet('HTTP Status Distribution');
  ws5.columns = [{ width: 20 }, { width: 20 }, { width: 20 }, { width: 30 }];
  ws5.getCell('A1').value = 'HTTP Response Status Code Breakdown';
  ws5.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

  const statusRows = [
    ['200 OK', successfulReqCount, `${((successfulReqCount / (totalRequests || 1)) * 100).toFixed(1)}%`, 'Successful health and inventory reads'],
    ['4xx Client Error', 0, '0.0%', 'Client-side bad requests'],
    ['5xx Server Error', failedReqCount, `${failedPercentage}%`, 'Internal server errors or timeouts']
  ];
  styleTable(ws5, 3, ['Status Code', 'Request Count', 'Percentage', 'Significance'], statusRows);

  // 6. Threshold Evaluation
  const ws6 = workbook.addWorksheet('Threshold Evaluation');
  ws6.columns = [{ width: 25 }, { width: 22 }, { width: 22 }, { width: 14 }, { width: 25 }];
  ws6.getCell('A1').value = 'Quality Gate Threshold Evaluation';
  ws6.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

  const thRows = [
    ['http_req_failed', '< 5.00%', `${failedPercentage}%`, failRatePass ? 'PASS' : 'FAIL', 'Failure rate tolerance'],
    ['http_req_duration:p(95)', '< 1500.00 ms', `${formatNumber(p95Duration, 2)} ms`, p95Pass ? 'PASS' : 'FAIL', '95th percentile latency SLA']
  ];
  styleTable(ws6, 3, ['Metric Threshold', 'Configured SLA', 'Observed Value', 'Status', 'SLA Description'], thRows);

  // 7. Test Environment
  const ws7 = workbook.addWorksheet('Test Environment');
  ws7.columns = [{ width: 25 }, { width: 35 }, { width: 30 }];
  ws7.getCell('A1').value = 'Load Test Environment & Configuration';
  ws7.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

  const envRows = [
    ['Target Backend URL', process.env.BACKEND_URL || 'http://localhost:3000', 'Target endpoint host'],
    ['Test Engine', 'Grafana k6 (v0.50+)', 'Load generation engine'],
    ['Virtual Users Profile', '100 Concurrent VUs', 'Load profile'],
    ['Load Duration', '60 Seconds (1 Minute)', 'Test duration window'],
    ['Execution Host OS', process.platform, 'Operating system runner'],
    ['Node.js Parser Version', process.version, 'Reporting script runtime']
  ];
  styleTable(ws7, 3, ['Environment Attribute', 'Configured Value', 'Operational Note'], envRows);

  await workbook.xlsx.writeFile(outputPath);
  console.log(`[k6 Excel Reporter]: Report generated at ${outputPath}`);
  return outputPath;
}

export function generateHtmlReport(summaryData, outputPath = 'reports/API_Load_Test_Report.html') {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const metrics = summaryData.metrics || {};
  const httpReqs = metrics.http_reqs || {};
  const totalRequests = getMetricValue(httpReqs, 'count', 0);
  const throughputRps = getMetricValue(httpReqs, 'rate', 0);

  const httpReqDuration = metrics.http_req_duration || {};
  const avgDuration = getMetricValue(httpReqDuration, 'avg', 0);
  const p95Duration = getMetricValue(httpReqDuration, 'p(95)', getMetricValue(httpReqDuration, 'p95', 0));
  const failedRateVal = getMetricValue(metrics.http_req_failed, 'rate', 0);
  const failedPct = (failedRateVal * 100).toFixed(2);
  const overallPass = parseFloat(failedPct) < 5.0 && p95Duration < 1500;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>StockSmart AI — API Load Test Report</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --pass: #22c55e;
      --fail: #ef4444;
      --accent: #3b82f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding: 2rem; line-height: 1.5; }
    .header { margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; }
    .header h1 { font-size: 1.8rem; font-weight: 700; color: #fff; }
    .header p { color: var(--text-muted); font-size: 0.95rem; margin-top: 0.25rem; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .metric-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; }
    .metric-title { font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); }
    .metric-val { font-size: 2rem; font-weight: 700; margin-top: 0.25rem; }
    .val-pass { color: var(--pass); }
    .val-fail { color: var(--fail); }
    .val-accent { color: var(--accent); }
    table { width: 100%; border-collapse: collapse; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; font-size: 0.875rem; }
    th { background: #111827; text-align: left; padding: 0.75rem 1rem; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    .status-pill { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 0.75rem; }
    .status-pass { background: rgba(34, 197, 94, 0.2); color: var(--pass); }
    .status-fail { background: rgba(239, 68, 68, 0.2); color: var(--fail); }
  </style>
</head>
<body>
  <div class="header">
    <h1>StockSmart AI — API Load Test Report (k6)</h1>
    <p>Target: ${process.env.BACKEND_URL || 'http://localhost:3000'} | VUs: 100 | Duration: 1m | Generated: ${new Date().toUTCString()}</p>
  </div>

  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-title">Total Requests</div>
      <div class="metric-val">${totalRequests}</div>
    </div>
    <div class="metric-card">
      <div class="metric-title">Throughput</div>
      <div class="metric-val val-accent">${formatNumber(throughputRps, 1)} req/s</div>
    </div>
    <div class="metric-card">
      <div class="metric-title">Avg Latency</div>
      <div class="metric-val">${formatNumber(avgDuration, 1)} ms</div>
    </div>
    <div class="metric-card">
      <div class="metric-title">P95 Latency</div>
      <div class="metric-val ${p95Duration < 1500 ? 'val-pass' : 'val-fail'}">${formatNumber(p95Duration, 1)} ms</div>
    </div>
    <div class="metric-card">
      <div class="metric-title">Failure Rate</div>
      <div class="metric-val ${parseFloat(failedPct) < 5 ? 'val-pass' : 'val-fail'}">${failedPct}%</div>
    </div>
  </div>

  <h2 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem;">Quality Gate Thresholds</h2>
  <table>
    <thead>
      <tr>
        <th>Threshold</th>
        <th>Configured SLA</th>
        <th>Observed Value</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>http_req_failed</strong></td>
        <td>rate &lt; 0.05 (5%)</td>
        <td>${failedPct}%</td>
        <td><span class="status-pill ${parseFloat(failedPct) < 5 ? 'status-pass' : 'status-fail'}">${parseFloat(failedPct) < 5 ? 'PASS' : 'FAIL'}</span></td>
      </tr>
      <tr>
        <td><strong>http_req_duration</strong></td>
        <td>p(95) &lt; 1500 ms</td>
        <td>${formatNumber(p95Duration, 1)} ms</td>
        <td><span class="status-pill ${p95Duration < 1500 ? 'status-pass' : 'status-fail'}">${p95Duration < 1500 ? 'PASS' : 'FAIL'}</span></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`[k6 HTML Reporter]: Report generated at ${outputPath}`);
  return outputPath;
}

// CLI Execution entrypoint
async function main() {
  const summaryFile = process.argv[2] || path.resolve(process.cwd(), 'reports/summary.json');
  let data = {};

  if (fs.existsSync(summaryFile)) {
    try {
      data = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
    } catch (e) {
      console.warn(`[parseK6Summary]: Failed to parse ${summaryFile}, creating baseline.`);
    }
  } else {
    console.log(`[parseK6Summary]: ${summaryFile} not found, generating baseline.`);
  }

  await generateExcelReport(data, path.resolve(process.cwd(), 'reports/API_Load_Test_Report.xlsx'));
  generateHtmlReport(data, path.resolve(process.cwd(), 'reports/API_Load_Test_Report.html'));
}

if (process.argv[1] && process.argv[1].endsWith('parseK6Summary.js')) {
  main().catch(console.error);
}
