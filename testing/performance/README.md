# StockSmart AI — Performance & Load Testing Suite (k6)

Automated performance, capacity, and baseline load testing suite for StockSmart AI backend services using Grafana k6 and ExcelJS.

## Test Profile
- **Virtual Users:** 100 concurrent VUs.
- **Duration:** 60 seconds (1 minute).
- **Target Endpoint:** Configurable via `BACKEND_URL` (default: `http://localhost:3000/api/health`).
- **SLA Thresholds:**
  - `http_req_failed`: `< 0.05` (< 5% error rate).
  - `http_req_duration`: `p(95) < 1500ms` (95% requests respond within 1.5s).

## Running Locally
```bash
cd testing/performance

# Install reporter dependencies
npm install

# Run load test against local or remote instance
BACKEND_URL=http://localhost:3000 k6 run --summary-export=reports/summary.json load-test.js

# Parse metrics and build Excel & HTML reports
node parseK6Summary.js
```

## Generated Reports
Outputs in `reports/`:
- `reports/API_Load_Test_Report.xlsx` (7 worksheets: Performance Summary, Request Statistics, Response Time Analysis, Throughput Analysis, HTTP Status Distribution, Threshold Evaluation, Test Environment)
- `reports/API_Load_Test_Report.html`
- `reports/summary.json`
