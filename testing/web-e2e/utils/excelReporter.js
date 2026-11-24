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
    workbook.creator = 'StockSmart AI Quality Automation';
    workbook.lastModifiedBy = 'StockSmart Selenium E2E Suite';
    workbook.created = new Date();
    workbook.modified = new Date();

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    const skippedTests = this.results.filter(r => r.status === 'SKIPPED' || r.status === 'BLOCKED').length;
    const passPercentage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : '0.00';
    const failPercentage = totalTests > 0 ? ((failedTests / totalTests) * 100).toFixed(2) : '0.00';
    const totalDuration = this.results.reduce((acc, r) => acc + (r.duration || 0), 0);
    const avgDuration = totalTests > 0 ? (totalDuration / totalTests).toFixed(2) : '0';

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Slate 800
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
        row.eachCell((c, colIdx) => {
          c.font = { name: 'Calibri', size: 10 };
          c.alignment = { vertical: 'middle', horizontal: 'left' };
          c.border = thinBorder;

          // Format status cells
          const textVal = String(c.value || '');
          if (textVal === 'PASS') {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Green 100
            c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF166534' } };
          } else if (textVal === 'FAIL') {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Red 100
            c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
          } else if (textVal === 'SKIPPED') {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Amber 100
            c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF92400E' } };
          }
        });
        rIdx++;
      });
      sheet.views = [{ state: 'frozen', ySplit: startRow }];
    };

    // -------------------------------------------------------------
    // Sheet 1: Executive Summary
    // -------------------------------------------------------------
    const ws1 = workbook.addWorksheet('Executive Summary');
    ws1.columns = [{ width: 28 }, { width: 32 }, { width: 35 }];
    ws1.getCell('A1').value = 'StockSmart AI — Selenium E2E Executive Summary';
    ws1.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0F172A' } };
    ws1.getCell('A2').value = `Generated at ${new Date().toISOString()} | Target: ${config.baseUrl}`;
    ws1.getCell('A2').font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF64748B' } };

    const summaryRows = [
      ['Total Tests Executed', totalTests, 'Total Selenium E2E automated test scenarios'],
      ['Passed Tests', passedTests, 'Assertions successfully verified against live UI'],
      ['Failed Tests', failedTests, 'Assertions requiring defect triage'],
      ['Skipped / Blocked Tests', skippedTests, 'Scenarios conditionally bypassed'],
      ['Pass Percentage', `${passPercentage}%`, 'Target threshold: >= 95%'],
      ['Failure Percentage', `${failPercentage}%`, 'Defect rate on target build'],
      ['Total Execution Time', `${(totalDuration / 1000).toFixed(2)} s`, 'Cumulative test execution runtime'],
      ['Average Test Duration', `${avgDuration} ms`, 'Mean latency per test case'],
      ['Target Browser Engine', `${config.browser.toUpperCase()} (Headless=${config.headless})`, 'Selenium WebDriver browser environment'],
      ['Overall Suite Status', failedTests === 0 ? 'PASS' : 'FAIL', failedTests === 0 ? 'Quality gate satisfied' : 'Defect review required']
    ];
    styleTable(ws1, 4, ['Metric', 'Observed Value', 'Operational Context'], summaryRows);

    // -------------------------------------------------------------
    // Sheet 2: Test Case Details
    // -------------------------------------------------------------
    const ws2 = workbook.addWorksheet('Test Case Details');
    ws2.columns = [
      { width: 14 }, { width: 18 }, { width: 16 }, { width: 38 },
      { width: 32 }, { width: 35 }, { width: 12 }, { width: 14 }, { width: 24 }
    ];
    ws2.getCell('A1').value = 'Complete Automated Web E2E Test Case Inventory';
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
    // Sheet 3: Module-wise Analysis
    // -------------------------------------------------------------
    const ws3 = workbook.addWorksheet('Module-wise Analysis');
    ws3.columns = [{ width: 22 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }];
    ws3.getCell('A1').value = 'Module-wise Test Coverage & Pass Rate';
    ws3.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const modules = [...new Set(this.results.map(r => r.module))];
    const moduleRows = modules.map(mod => {
      const inMod = this.results.filter(r => r.module === mod);
      const passed = inMod.filter(r => r.status === 'PASS').length;
      const failed = inMod.filter(r => r.status === 'FAIL').length;
      const skipped = inMod.filter(r => r.status === 'SKIPPED').length;
      const passPct = inMod.length > 0 ? ((passed / inMod.length) * 100).toFixed(1) : '0.0';
      return [mod, inMod.length, passed, failed, skipped, `${passPct}%`];
    });
    styleTable(ws3, 3, ['Module', 'Total Tests', 'Passed', 'Failed', 'Skipped', 'Pass Rate'], moduleRows);

    // -------------------------------------------------------------
    // Sheet 4: Pass/Fail Distribution
    // -------------------------------------------------------------
    const ws4 = workbook.addWorksheet('Pass-Fail Distribution');
    ws4.columns = [{ width: 24 }, { width: 16 }, { width: 16 }, { width: 20 }];
    ws4.getCell('A1').value = 'Pass / Fail / Skipped Distribution by Category';
    ws4.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const categories = [...new Set(this.results.map(r => r.category))];
    const distRows = categories.map(cat => {
      const inCat = this.results.filter(r => r.category === cat);
      const passed = inCat.filter(r => r.status === 'PASS').length;
      const failed = inCat.filter(r => r.status === 'FAIL').length;
      const skipped = inCat.filter(r => r.status === 'SKIPPED').length;
      return [cat, passed, failed, skipped];
    });
    styleTable(ws4, 3, ['Test Category', 'Passed Scenarios', 'Failed Scenarios', 'Skipped Scenarios'], distRows);

    // -------------------------------------------------------------
    // Sheet 5: Execution Time Analysis
    // -------------------------------------------------------------
    const ws5 = workbook.addWorksheet('Execution Time Analysis');
    ws5.columns = [{ width: 14 }, { width: 20 }, { width: 42 }, { width: 16 }, { width: 24 }];
    ws5.getCell('A1').value = 'Individual Test Execution Latencies';
    ws5.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const timeRows = this.results.map(r => [
      r.testId, r.module, r.scenario, `${r.duration} ms`, r.timestamp
    ]);
    styleTable(ws5, 3, ['Test ID', 'Module', 'Scenario Description', 'Duration', 'Execution Timestamp'], timeRows);

    // -------------------------------------------------------------
    // Sheet 6: Defect Analysis
    // -------------------------------------------------------------
    const ws6 = workbook.addWorksheet('Defect Analysis');
    ws6.columns = [{ width: 18 }, { width: 22 }, { width: 20 }, { width: 38 }, { width: 35 }];
    ws6.getCell('A1').value = 'Defect Root Cause & Triage Categorization';
    ws6.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const defectRows = this.results.filter(r => r.status === 'FAIL').map(r => [
      'UI Assertion', 'Selector / State Mismatch', r.module,
      r.error || 'Assertion failed', 'Verify DOM attribute or async state transition'
    ]);
    styleTable(ws6, 3, [
      'Failure Category', 'Error Type', 'Affected Module',
      'Failure Description', 'Suggested Investigation'
    ], defectRows.length > 0 ? defectRows : [['N/A', 'Zero Defects', 'All Modules', 'All assertions verified successfully', 'No action needed']]);

    // -------------------------------------------------------------
    // Sheet 7: Failed Test Details
    // -------------------------------------------------------------
    const ws7 = workbook.addWorksheet('Failed Test Details');
    ws7.columns = [
      { width: 14 }, { width: 32 }, { width: 18 }, { width: 25 },
      { width: 35 }, { width: 45 }, { width: 25 }
    ];
    ws7.getCell('A1').value = 'Defect Inventory & Failed Test Stack Traces';
    ws7.getCell('A1').font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFB91C1C' } };

    const failedRows = this.results.filter(r => r.status === 'FAIL').map(r => [
      r.testId, r.scenario, r.category, 'AssertionError / ElementTimeout',
      r.error || 'N/A', (r.stack || '').substring(0, 300), r.screenshot || 'None'
    ]);
    styleTable(ws7, 3, [
      'Test ID', 'Test Scenario', 'Category', 'Failure Reason',
      'Error Message', 'Stack Trace', 'Screenshot Reference'
    ], failedRows.length > 0 ? failedRows : [['None', 'No failed tests', 'All', 'N/A', 'N/A', 'N/A', 'N/A']]);

    // -------------------------------------------------------------
    // Sheet 8: Browser and Environment Details
    // -------------------------------------------------------------
    const ws8 = workbook.addWorksheet('Browser and Environment Details');
    ws8.columns = [{ width: 26 }, { width: 36 }, { width: 32 }];
    ws8.getCell('A1').value = 'Runtime Browser & Host Environment Details';
    ws8.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const browserRows = [
      ['Target Browser Engine', config.browser.toUpperCase(), 'Verified browser driver'],
      ['Headless Mode', config.headless ? 'Enabled (--headless=new)' : 'Disabled (Windowed mode)', 'Display configuration'],
      ['Explicit Wait Timeout', `${config.timeouts.explicitWait} ms`, 'Selenium element synchronization window'],
      ['Page Load Timeout', `${config.timeouts.pageLoad} ms`, 'Document navigation timeout'],
      ['Script Timeout', `${config.timeouts.script} ms`, 'Asynchronous script execution timeout'],
      ['Host Node Version', process.version, 'Runtime execution environment'],
      ['Host Platform / OS', process.platform, 'Operating system runner'],
      ['Target Base URL', config.baseUrl, 'Target application web entrypoint']
    ];
    styleTable(ws8, 3, ['Environment Attribute', 'Configured Value', 'Operational Note'], browserRows);

    await workbook.xlsx.writeFile(outputPath);
    console.log(`[Excel Reporter]: Report generated at ${outputPath}`);
    return outputPath;
  }
}

export const excelReporter = new ExcelTestReporter();
export default excelReporter;
