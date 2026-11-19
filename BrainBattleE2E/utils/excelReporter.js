import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import config from '../config/selenium.config.js';

class ExcelTestReporter {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  recordTestResult(testData) {
    this.results.push({
      testId: testData.testId || `TC-${this.results.length + 1}`,
      category: testData.category || 'General',
      module: testData.module || 'Web',
      scenario: testData.scenario || testData.title,
      expected: testData.expected || 'Assertion passes',
      actual: testData.actual || (testData.status === 'PASS' ? 'Assertion verified successfully' : testData.error),
      status: testData.status || 'PASS',
      duration: testData.duration || 0,
      timestamp: new Date().toISOString(),
      error: testData.error || null,
      stack: testData.stack || null,
      screenshot: testData.screenshot || null
    });
  }

  async generateReport(outputPath = config.paths.excelReport) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'StockSmart Automation Suite';
    workbook.created = new Date();

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    const skippedTests = this.results.filter(r => r.status === 'SKIPPED' || r.status === 'BLOCKED').length;
    const passPercentage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : '0.00';
    const failPercentage = totalTests > 0 ? ((failedTests / totalTests) * 100).toFixed(2) : '0.00';
    const totalDuration = this.results.reduce((acc, r) => acc + (r.duration || 0), 0);
    const avgDuration = totalTests > 0 ? (totalDuration / totalTests).toFixed(2) : '0';

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
        row.eachCell(c => {
          c.font = { name: 'Calibri', size: 10 };
          c.alignment = { vertical: 'middle', horizontal: 'left' };
          c.border = thinBorder;
        });
        rIdx++;
      });
      sheet.views = [{ state: 'frozen', ySplit: startRow }];
    };

    // -------------------------------------------------------------
    // Sheet 1: Executive Summary
    // -------------------------------------------------------------
    const ws1 = workbook.addWorksheet('Executive Summary');
    ws1.columns = [{ width: 28 }, { width: 32 }, { width: 25 }];
    ws1.getCell('A1').value = 'StockSmart AI — Web E2E Executive Test Summary';
    ws1.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0F172A' } };
    ws1.getCell('A2').value = `Executed on ${new Date().toISOString()} | Target: ${config.baseUrl}`;
    ws1.getCell('A2').font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF64748B' } };

    const summaryRows = [
      ['Total Tests Executed', totalTests, 'Full suite execution count'],
      ['Passed Tests', passedTests, 'Verified functional assertions'],
      ['Failed Tests', failedTests, 'Assertions requiring defect review'],
      ['Skipped / Blocked Tests', skippedTests, 'Pending feature requirements'],
      ['Pass Percentage', `${passPercentage}%`, 'Target: >= 95%'],
      ['Failure Percentage', `${failPercentage}%`, 'Defect tolerance rate'],
      ['Total Execution Time', `${(totalDuration / 1000).toFixed(2)} s`, 'Cumulative test runtime'],
      ['Average Test Duration', `${avgDuration} ms`, 'Per-test performance'],
      ['Browser Engine', `${config.browser.toUpperCase()} (Headless=${config.headless})`, 'Execution environment'],
      ['Overall Suite Status', failedTests === 0 ? 'PASS' : 'FAIL', failedTests === 0 ? 'All assertions satisfied' : 'Defects encountered']
    ];
    styleTable(ws1, 4, ['Metric', 'Observed Value', 'Description'], summaryRows);

    // -------------------------------------------------------------
    // Sheet 2: Complete Test Inventory
    // -------------------------------------------------------------
    const ws2 = workbook.addWorksheet('Complete Test Inventory');
    ws2.columns = [
      { width: 14 }, { width: 18 }, { width: 16 }, { width: 35 },
      { width: 30 }, { width: 35 }, { width: 14 }, { width: 14 }, { width: 24 }
    ];
    ws2.getCell('A1').value = 'Complete Automated Web E2E Test Inventory';
    ws2.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const inventoryRows = this.results.map(r => [
      r.testId, r.category, r.module, r.scenario,
      r.expected, r.actual, r.status, `${r.duration} ms`, r.timestamp
    ]);
    styleTable(ws2, 3, [
      'Test ID', 'Category', 'Module', 'Test Scenario',
      'Expected Result', 'Actual Result', 'Status', 'Duration', 'Timestamp'
    ], inventoryRows);

    // -------------------------------------------------------------
    // Sheet 3: Category-wise Analysis
    // -------------------------------------------------------------
    const ws3 = workbook.addWorksheet('Category-wise Analysis');
    ws3.columns = [{ width: 24 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }];
    ws3.getCell('A1').value = 'Category-wise Test Performance Breakdown';
    ws3.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const categories = [...new Set(this.results.map(r => r.category))];
    const categoryRows = categories.map(cat => {
      const inCat = this.results.filter(r => r.category === cat);
      const passed = inCat.filter(r => r.status === 'PASS').length;
      const failed = inCat.filter(r => r.status === 'FAIL').length;
      const skipped = inCat.filter(r => r.status === 'SKIPPED').length;
      const passPct = inCat.length > 0 ? ((passed / inCat.length) * 100).toFixed(1) : '0.0';
      return [cat, inCat.length, passed, failed, skipped, `${passPct}%`];
    });
    styleTable(ws3, 3, ['Category', 'Total', 'Passed', 'Failed', 'Skipped', 'Pass Rate'], categoryRows);

    // -------------------------------------------------------------
    // Sheet 4: Failed Test Cases
    // -------------------------------------------------------------
    const ws4 = workbook.addWorksheet('Failed Test Cases');
    ws4.columns = [
      { width: 14 }, { width: 30 }, { width: 18 }, { width: 25 },
      { width: 35 }, { width: 45 }, { width: 25 }
    ];
    ws4.getCell('A1').value = 'Defect Inventory & Failed Test Stack Traces';
    ws4.getCell('A1').font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFB91C1C' } };

    const failedRows = this.results.filter(r => r.status === 'FAIL').map(r => [
      r.testId, r.scenario, r.category, 'AssertionError / ElementTimeout',
      r.error || 'N/A', (r.stack || '').substring(0, 300), r.screenshot || 'None'
    ]);
    styleTable(ws4, 3, [
      'Test ID', 'Test Scenario', 'Category', 'Failure Reason',
      'Error Message', 'Stack Trace', 'Screenshot Reference'
    ], failedRows.length > 0 ? failedRows : [['None', 'No failed tests', 'All', 'N/A', 'N/A', 'N/A', 'N/A']]);

    // -------------------------------------------------------------
    // Sheet 5: Execution Time Analysis
    // -------------------------------------------------------------
    const ws5 = workbook.addWorksheet('Execution Time Analysis');
    ws5.columns = [{ width: 14 }, { width: 40 }, { width: 24 }, { width: 16 }];
    ws5.getCell('A1').value = 'Test Execution Latency Breakdown';
    ws5.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const timeRows = this.results.map(r => [
      r.testId, r.scenario, r.timestamp, `${r.duration} ms`
    ]);
    styleTable(ws5, 3, ['Test ID', 'Test Name', 'Timestamp', 'Execution Duration'], timeRows);

    // -------------------------------------------------------------
    // Sheet 6: Browser Compatibility
    // -------------------------------------------------------------
    const ws6 = workbook.addWorksheet('Browser Compatibility');
    ws6.columns = [{ width: 25 }, { width: 35 }, { width: 30 }];
    ws6.getCell('A1').value = 'Runtime Browser & Host Environment';
    ws6.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const browserRows = [
      ['Target Browser', config.browser.toUpperCase(), 'Verified Engine'],
      ['Headless Mode', config.headless ? 'Enabled (--headless=new)' : 'Disabled (Windowed)', 'Display Configuration'],
      ['Explicit Wait Timeout', `${config.timeouts.explicitWait} ms`, 'Selenium Synchronization Window'],
      ['Page Load Timeout', `${config.timeouts.pageLoad} ms`, 'Navigation Timeout Window'],
      ['Host Node Version', process.version, 'Runtime Environment'],
      ['Operating System', process.platform, 'Test Execution Host']
    ];
    styleTable(ws6, 3, ['Environment Attribute', 'Configured Value', 'Operational Note'], browserRows);

    // -------------------------------------------------------------
    // Sheet 7: Defect Analysis
    // -------------------------------------------------------------
    const ws7 = workbook.addWorksheet('Defect Analysis');
    ws7.columns = [{ width: 20 }, { width: 22 }, { width: 20 }, { width: 35 }, { width: 35 }];
    ws7.getCell('A1').value = 'Defect Root Cause & Triage Categorization';
    ws7.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const defectRows = this.results.filter(r => r.status === 'FAIL').map(r => [
      'UI Assertion', 'Selector / State Mismatch', r.module,
      r.error || 'Assertion failed', 'Verify DOM attribute or async state transition'
    ]);
    styleTable(ws7, 3, [
      'Failure Category', 'Error Type', 'Affected Module',
      'Failure Description', 'Suggested Investigation'
    ], defectRows.length > 0 ? defectRows : [['N/A', 'No Defects', 'All Modules', 'Zero failures encountered during execution', 'No action needed']]);

    await workbook.xlsx.writeFile(outputPath);
    console.log(`Excel Web Test Report written to: ${outputPath}`);
    return outputPath;
  }
}

export const excelReporter = new ExcelTestReporter();
export default excelReporter;
