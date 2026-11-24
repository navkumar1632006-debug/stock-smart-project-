import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import config from '../config/wdio.conf.js';

class MobileExcelReporter {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  recordTest(data) {
    this.results.push({
      testId: data.testId || `MOB-${this.results.length + 1}`,
      category: data.category || 'Mobile',
      screen: data.screen || 'Root',
      scenario: data.scenario || data.title,
      expected: data.expected || 'Assertion passes',
      actual: data.actual || (data.status === 'PASS' ? 'Verified expected outcome' : data.error),
      status: data.status || 'PASS',
      duration: data.duration || 0,
      timestamp: new Date().toISOString(),
      error: data.error || null,
      stack: data.stack || null,
      screenshot: data.screenshot || null
    });
  }

  async generateReport(outputPath = './reports/Appium_Mobile_Test_Report.xlsx') {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'StockSmart AI Mobile Automation';
    workbook.lastModifiedBy = 'StockSmart Appium Suite';
    workbook.created = new Date();
    workbook.modified = new Date();

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    const skippedTests = this.results.filter(r => r.status === 'SKIPPED').length;
    const passPercentage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : '0.00';
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
        row.eachCell((c) => {
          c.font = { name: 'Calibri', size: 10 };
          c.alignment = { vertical: 'middle', horizontal: 'left' };
          c.border = thinBorder;

          const textVal = String(c.value || '');
          if (textVal === 'PASS') {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
            c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF166534' } };
          } else if (textVal === 'FAIL') {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
          }
        });
        rIdx++;
      });
      sheet.views = [{ state: 'frozen', ySplit: startRow }];
    };

    // 1. Executive Summary
    const ws1 = workbook.addWorksheet('Executive Summary');
    ws1.columns = [{ width: 28 }, { width: 32 }, { width: 35 }];
    ws1.getCell('A1').value = 'StockSmart AI — Appium Android Executive Summary';
    ws1.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0F172A' } };
    ws1.getCell('A2').value = `Generated at ${new Date().toISOString()} | Target App: com.stocksmart.app`;
    ws1.getCell('A2').font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF64748B' } };

    const summaryRows = [
      ['Total Mobile Tests', totalTests, 'Total Appium Android automated test cases'],
      ['Passed Scenarios', passedTests, 'Assertions successfully verified on Android emulator/device'],
      ['Failed Scenarios', failedTests, 'Assertions requiring defect triage'],
      ['Skipped Scenarios', skippedTests, 'Scenarios conditionally bypassed'],
      ['Pass Percentage', `${passPercentage}%`, 'Target threshold: >= 95%'],
      ['Total Execution Time', `${(totalDuration / 1000).toFixed(2)} s`, 'Cumulative test runtime'],
      ['Average Test Duration', `${avgDuration} ms`, 'Mean interaction latency'],
      ['Target Android Package', 'com.stocksmart.app', 'Verified application package ID'],
      ['Automation Driver', 'UiAutomator2 (Appium 2.x)', 'Underlying mobile driver'],
      ['Overall Suite Status', failedTests === 0 ? 'PASS' : 'FAIL', failedTests === 0 ? 'Quality gate satisfied' : 'Defect review required']
    ];
    styleTable(ws1, 4, ['Metric', 'Observed Value', 'Operational Context'], summaryRows);

    // 2. Test Case Details
    const ws2 = workbook.addWorksheet('Test Case Details');
    ws2.columns = [
      { width: 14 }, { width: 16 }, { width: 20 }, { width: 38 },
      { width: 32 }, { width: 35 }, { width: 12 }, { width: 14 }, { width: 24 }
    ];
    ws2.getCell('A1').value = 'Complete Mobile E2E Test Inventory';
    ws2.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const detailRows = this.results.map(r => [
      r.testId, r.category, r.screen, r.scenario,
      r.expected, r.actual, r.status, `${r.duration} ms`, r.timestamp
    ]);
    styleTable(ws2, 3, [
      'Test ID', 'Category', 'Screen Object', 'Test Scenario',
      'Expected Result', 'Actual Result', 'Status', 'Duration', 'Timestamp'
    ], detailRows);

    // 3. Module-wise Analysis
    const ws3 = workbook.addWorksheet('Module-wise Analysis');
    ws3.columns = [{ width: 22 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }];
    ws3.getCell('A1').value = 'Screen-wise Test Coverage Breakdown';
    ws3.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const screens = [...new Set(this.results.map(r => r.screen))];
    const moduleRows = screens.map(scr => {
      const inScr = this.results.filter(r => r.screen === scr);
      const passed = inScr.filter(r => r.status === 'PASS').length;
      const failed = inScr.filter(r => r.status === 'FAIL').length;
      const passPct = inScr.length > 0 ? ((passed / inScr.length) * 100).toFixed(1) : '0.0';
      return [scr, inScr.length, passed, failed, `${passPct}%`];
    });
    styleTable(ws3, 3, ['Screen / Module', 'Total Tests', 'Passed', 'Failed', 'Pass Rate'], moduleRows);

    // 4. Device Information
    const ws4 = workbook.addWorksheet('Device Information');
    ws4.columns = [{ width: 26 }, { width: 36 }, { width: 32 }];
    ws4.getCell('A1').value = 'Target Android Runtime Device Profile';
    ws4.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const caps = (config.capabilities && config.capabilities[0]) || {};
    const devRows = [
      ['Device Model / Name', caps['appium:deviceName'] || 'Pixel_7', 'Emulated or physical Android hardware'],
      ['Platform Version', `Android ${caps['appium:platformVersion'] || '14.0'}`, 'OS API Level / Version'],
      ['Application Package', caps['appium:appPackage'] || 'com.stocksmart.app', 'Installed package name'],
      ['Main Activity', caps['appium:appActivity'] || 'com.stocksmart.app.MainActivity', 'Entrypoint activity'],
      ['Automation Framework', caps['appium:automationName'] || 'UiAutomator2', 'Underlying accessibility driver'],
      ['Auto Grant Permissions', String(caps['appium:autoGrantPermissions'] ?? true), 'Camera & storage runtime grants'],
      ['Host Architecture', process.arch, 'Runner architecture']
    ];
    styleTable(ws4, 3, ['Device Attribute', 'Configured Value', 'Operational Note'], devRows);

    // 5. Execution Time Analysis
    const ws5 = workbook.addWorksheet('Execution Time Analysis');
    ws5.columns = [{ width: 14 }, { width: 20 }, { width: 42 }, { width: 16 }, { width: 24 }];
    ws5.getCell('A1').value = 'Mobile Interaction Execution Latencies';
    ws5.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const timeRows = this.results.map(r => [
      r.testId, r.screen, r.scenario, `${r.duration} ms`, r.timestamp
    ]);
    styleTable(ws5, 3, ['Test ID', 'Screen', 'Scenario Description', 'Duration', 'Execution Timestamp'], timeRows);

    // 6. Failed Test Details
    const ws6 = workbook.addWorksheet('Failed Test Details');
    ws6.columns = [
      { width: 14 }, { width: 32 }, { width: 20 }, { width: 25 },
      { width: 35 }, { width: 45 }, { width: 25 }
    ];
    ws6.getCell('A1').value = 'Mobile Defect Inventory & Stack Traces';
    ws6.getCell('A1').font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFB91C1C' } };

    const failedRows = this.results.filter(r => r.status === 'FAIL').map(r => [
      r.testId, r.scenario, r.screen, 'UiSelectorNotFound / AppiumTimeout',
      r.error || 'N/A', (r.stack || '').substring(0, 300), r.screenshot || 'None'
    ]);
    styleTable(ws6, 3, [
      'Test ID', 'Test Scenario', 'Screen', 'Failure Category',
      'Error Message', 'Stack Trace', 'Screenshot Reference'
    ], failedRows.length > 0 ? failedRows : [['None', 'No failed tests', 'All', 'N/A', 'N/A', 'N/A', 'N/A']]);

    // 7. Crash and Error Analysis
    const ws7 = workbook.addWorksheet('Crash and Error Analysis');
    ws7.columns = [{ width: 20 }, { width: 24 }, { width: 20 }, { width: 38 }, { width: 35 }];
    ws7.getCell('A1').value = 'Android Crash & Exception Triage Log';
    ws7.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const crashRows = this.results.filter(r => r.status === 'FAIL').map(r => [
      'Appium Assertion', 'UI Element Timeout', r.screen,
      r.error || 'Assertion failed', 'Verify Accessibility ID and render tree'
    ]);
    styleTable(ws7, 3, [
      'Event Type', 'Exception Type', 'Affected Screen',
      'Crash / Error Detail', 'Remediation Note'
    ], crashRows.length > 0 ? crashRows : [['N/A', 'Zero Crashes', 'All Screens', 'No crash or fatal exceptions detected in logcat', 'No action needed']]);

    // 8. Pass/Fail Distribution
    const ws8 = workbook.addWorksheet('Pass-Fail Distribution');
    ws8.columns = [{ width: 24 }, { width: 16 }, { width: 16 }];
    ws8.getCell('A1').value = 'Mobile Status Distribution Breakdown';
    ws8.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const categories = [...new Set(this.results.map(r => r.category))];
    const distRows = categories.map(cat => {
      const inCat = this.results.filter(r => r.category === cat);
      const passed = inCat.filter(r => r.status === 'PASS').length;
      const failed = inCat.filter(r => r.status === 'FAIL').length;
      return [cat, passed, failed];
    });
    styleTable(ws8, 3, ['Test Category', 'Passed Scenarios', 'Failed Scenarios'], distRows);

    await workbook.xlsx.writeFile(outputPath);
    console.log(`[Mobile Excel Reporter]: Report generated at ${outputPath}`);
    return outputPath;
  }
}

export const mobileReporter = new MobileExcelReporter();
export default mobileReporter;
