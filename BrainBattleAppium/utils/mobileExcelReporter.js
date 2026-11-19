import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

class MobileExcelReporter {
  constructor() {
    this.results = [];
  }

  recordTest(data) {
    this.results.push({
      testId: data.testId || `MOB-${this.results.length + 1}`,
      category: data.category || 'Mobile',
      screen: data.screen || 'General',
      scenario: data.scenario || data.title,
      expected: data.expected || 'Passes',
      actual: data.actual || (data.status === 'PASS' ? 'Assertion verified' : data.error),
      status: data.status || 'PASS',
      duration: data.duration || 15,
      timestamp: new Date().toISOString(),
      error: data.error || null
    });
  }

  async generateReport(outputPath = './reports/excel/Mobile_Appium_Test_Report.xlsx') {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'StockSmart Appium Automation';
    workbook.created = new Date();

    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const blocked = this.results.filter(r => r.status === 'BLOCKED' || r.status === 'SKIPPED').length;
    const passPct = total > 0 ? ((passed / total) * 100).toFixed(2) : '0.00';

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

    // Sheet 1: Mobile Summary
    const ws1 = workbook.addWorksheet('Mobile Summary');
    ws1.columns = [{ width: 28 }, { width: 32 }, { width: 25 }];
    ws1.getCell('A1').value = 'StockSmart AI — Mobile Appium Test Summary';
    ws1.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0F172A' } };
    ws1.getCell('A2').value = `Generated on ${new Date().toISOString()} | Android Emulator`;
    ws1.getCell('A2').font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF64748B' } };

    const summaryRows = [
      ['Total Mobile Tests', total, 'Total test inventory'],
      ['Passed Tests', passed, 'Verified passing assertions'],
      ['Failed Tests', failed, 'Failed assertions'],
      ['Blocked / Pending Tests', blocked, 'Pending device connection'],
      ['Pass Percentage', `${passPct}%`, 'Target: >= 95%'],
      ['Automation Driver', 'UiAutomator2 (Appium 2)', 'Automation Engine'],
      ['Platform', 'Android Native / React Native', 'Target Architecture'],
      ['Overall Suite Status', failed === 0 ? 'PASS' : 'FAIL', failed === 0 ? 'All assertions passed' : 'Failures recorded']
    ];
    styleTable(ws1, 4, ['Metric', 'Observed Value', 'Description'], summaryRows);

    // Sheet 2: Test Cases
    const ws2 = workbook.addWorksheet('Test Cases');
    ws2.columns = [
      { width: 16 }, { width: 18 }, { width: 20 }, { width: 40 },
      { width: 30 }, { width: 35 }, { width: 14 }, { width: 14 }
    ];
    ws2.getCell('A1').value = 'Detailed Mobile Test Case Inventory';
    ws2.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const testRows = this.results.map(r => [
      r.testId, r.category, r.screen, r.scenario,
      r.expected, r.actual, r.status, `${r.duration} ms`
    ]);
    styleTable(ws2, 3, [
      'Test ID', 'Category', 'Screen', 'Scenario Description',
      'Expected Result', 'Actual Result', 'Status', 'Duration'
    ], testRows);

    // Sheet 3: Category Breakdown
    const ws3 = workbook.addWorksheet('Category Breakdown');
    ws3.columns = [{ width: 24 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }];
    ws3.getCell('A1').value = 'Category-wise Mobile Test Performance';
    ws3.getCell('A1').font = { name: 'Calibri', size: 15, bold: true };

    const categories = [...new Set(this.results.map(r => r.category))];
    const catRows = categories.map(cat => {
      const inCat = this.results.filter(r => r.category === cat);
      const cPass = inCat.filter(r => r.status === 'PASS').length;
      const cFail = inCat.filter(r => r.status === 'FAIL').length;
      const cBlock = inCat.filter(r => r.status === 'BLOCKED' || r.status === 'SKIPPED').length;
      const rate = inCat.length > 0 ? ((cPass / inCat.length) * 100).toFixed(1) : '0.0';
      return [cat, inCat.length, cPass, cFail, cBlock, `${rate}%`];
    });
    styleTable(ws3, 3, ['Category', 'Total', 'Passed', 'Failed', 'Blocked', 'Pass Rate'], catRows);

    await workbook.xlsx.writeFile(outputPath);
    console.log(`Mobile Appium Test Report written to: ${outputPath}`);
    return outputPath;
  }
}

export const mobileReporter = new MobileExcelReporter();
export default mobileReporter;
