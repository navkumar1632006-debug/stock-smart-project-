import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

export const mobileCoverageData = [
  { id: 'MOB-AUTH-001', module: 'Mobile Auth', screen: 'LoginScreen', scenario: 'Verify Login UI loads with email, password inputs and Sign In button', priority: 'Critical', status: 'Implemented' },
  { id: 'MOB-AUTH-002', module: 'Mobile Auth', screen: 'LoginScreen', scenario: 'Validate empty inputs alert submission', priority: 'High', status: 'Implemented' },
  { id: 'MOB-AUTH-003', module: 'Mobile Auth', screen: 'SignupScreen', scenario: 'Navigate to Signup screen from login prompt', priority: 'High', status: 'Implemented' },
  { id: 'MOB-AUTH-004', module: 'Mobile Auth', screen: 'ResetPasswordScreen', scenario: 'Navigate to Password Reset screen', priority: 'Medium', status: 'Implemented' },

  { id: 'MOB-DASH-001', module: 'Mobile Dashboard', screen: 'DashboardScreen', scenario: 'Verify KPI summary tiles (Total Sales, Low Stock, Waste Prevented)', priority: 'Critical', status: 'Implemented' },
  { id: 'MOB-DASH-002', module: 'Mobile Dashboard', screen: 'DashboardScreen', scenario: 'Verify bottom navigation bar accessibility across screens', priority: 'High', status: 'Implemented' },

  { id: 'MOB-INV-001', module: 'Mobile Inventory', screen: 'InventoryScreen', scenario: 'Inspect inventory item list with SKU and category badges', priority: 'Critical', status: 'Implemented' },
  { id: 'MOB-INV-002', module: 'Mobile Inventory', screen: 'InventoryScreen', scenario: 'Search products by SKU or name in mobile search bar', priority: 'High', status: 'Implemented' },

  { id: 'MOB-POS-001', module: 'Mobile POS', screen: 'POSScreen', scenario: 'Verify mobile POS cart layout, item increment, and bill subtotal', priority: 'Critical', status: 'Implemented' },
  { id: 'MOB-POS-002', module: 'Mobile POS', screen: 'POSScreen', scenario: 'Simulate barcode scan addition into active cart', priority: 'Critical', status: 'Implemented' },
  { id: 'MOB-POS-003', module: 'Mobile POS', screen: 'POSScreen', scenario: 'Complete checkout in Cash/UPI payment mode', priority: 'Critical', status: 'Implemented' },

  { id: 'MOB-FC-001', module: 'Mobile Forecast', screen: 'ForecastsScreen', scenario: 'View AI weekly demand projection cards', priority: 'Medium', status: 'Implemented' },
  { id: 'MOB-MKT-001', module: 'Mobile Marketplace', screen: 'MarketplaceScreen', scenario: 'Browse consumer near-expiry discounts and deals', priority: 'Medium', status: 'Implemented' },
  { id: 'MOB-RBAC-001', module: 'Mobile RBAC', screen: 'RBACScreen', scenario: 'Verify role-based permission toggles for store staff', priority: 'High', status: 'Implemented' },
  { id: 'MOB-NOTIF-001', module: 'Mobile Alerts', screen: 'NotificationsScreen', scenario: 'Verify push/local notification alert items', priority: 'Medium', status: 'Implemented' }
];

export async function generateMobileCoverageMatrix(outputPath = './coverage/mobile-test-coverage-matrix.xlsx') {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StockSmart Mobile QA Architecture';
  const ws = workbook.addWorksheet('Mobile E2E Coverage Matrix');

  ws.columns = [
    { width: 16 }, { width: 20 }, { width: 22 }, { width: 50 }, { width: 14 }, { width: 16 }
  ];

  ws.getCell('A1').value = 'StockSmart AI — Mobile Appium E2E Coverage Matrix';
  ws.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0F172A' } };
  ws.getCell('A2').value = `Total Mobile Test Cases: ${mobileCoverageData.length} | Generated: ${new Date().toISOString()}`;
  ws.getCell('A2').font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF64748B' } };

  const headers = ['Test ID', 'Module', 'Target Screen', 'Test Scenario Description', 'Priority', 'Automation Status'];
  ws.getRow(4).values = headers;
  const hRow = ws.getRow(4);
  hRow.height = 24;
  hRow.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  let rIdx = 5;
  for (const item of mobileCoverageData) {
    const row = ws.getRow(rIdx);
    row.values = [item.id, item.module, item.screen, item.scenario, item.priority, item.status];
    row.height = 20;
    row.eachCell((c, colNum) => {
      c.font = { name: 'Calibri', size: 10 };
      c.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      if (colNum === 1 || colNum === 5 || colNum === 6) {
        c.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        c.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });

    const pCell = row.getCell(5);
    if (item.priority === 'Critical') pCell.font = { bold: true, color: { argb: 'FFB91C1C' } };
    else if (item.priority === 'High') pCell.font = { bold: true, color: { argb: 'FFD97706' } };

    const sCell = row.getCell(6);
    sCell.font = { bold: true, color: { argb: 'FF15803D' } };
    rIdx++;
  }

  ws.views = [{ state: 'frozen', ySplit: 4 }];
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Mobile E2E Coverage Matrix successfully written to: ${outputPath}`);
  return outputPath;
}

if (process.argv[1] && process.argv[1].endsWith('generateMobileCoverageMatrix.js')) {
  generateMobileCoverageMatrix().catch(console.error);
}
