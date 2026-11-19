import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import config from '../config/selenium.config.js';

export const coverageMatrixData = [
  // Authentication
  { id: 'AUTH-001', module: 'Auth', feature: 'Sign In Screen', scenario: 'Verify Login UI loads with email & password fields', pre: 'App is running', steps: 'Navigate to base URL -> Wait for form', expected: 'Email input, password input, and Sign In button are visible', priority: 'Critical', status: 'Implemented' },
  { id: 'AUTH-002', module: 'Auth', feature: 'Client-side Validation', scenario: 'Submit empty credentials and check required validation', pre: 'Login page displayed', steps: 'Click Sign In with empty fields', expected: 'Error banner displays "Email is required."', priority: 'High', status: 'Implemented' },
  { id: 'AUTH-003', module: 'Auth', feature: 'Email Format Validation', scenario: 'Submit invalid email format', pre: 'Login page displayed', steps: 'Enter "not-an-email" -> Click Sign In', expected: 'Error banner displays "Please enter a valid email address."', priority: 'High', status: 'Implemented' },
  { id: 'AUTH-004', module: 'Auth', feature: 'Invalid Credentials', scenario: 'Submit non-existent account credentials', pre: 'Login page displayed', steps: 'Enter invalid email & password -> Submit', expected: 'Shows "Invalid email or password." without application crash', priority: 'Critical', status: 'Implemented' },
  { id: 'AUTH-005', module: 'Auth', feature: 'Forgot Password Toggle', scenario: 'Switch to password reset form mode', pre: 'Login page displayed', steps: 'Click "Forgot password?" button', expected: 'Header changes to "Reset Password" and recovery instructions display', priority: 'Medium', status: 'Implemented' },
  { id: 'AUTH-006', module: 'Auth', feature: 'Signup Navigation', scenario: 'Navigate from Login to Signup view', pre: 'Login page displayed', steps: 'Click "Sign up now" link', expected: 'Signup form loads with Store Name and Owner fields', priority: 'High', status: 'Implemented' },

  // Dashboard & Navigation
  { id: 'DASH-001', module: 'Dashboard', feature: 'App Header & Brand', scenario: 'Verify brand title and operational header elements', pre: 'User logged in or mock authenticated', steps: 'Observe top navbar', expected: 'Brand name "StockSmart" and user role selector are rendered', priority: 'Critical', status: 'Implemented' },
  { id: 'DASH-002', module: 'Dashboard', feature: 'Executive KPI Cards', scenario: 'Verify display of 4 primary retail KPI metric cards', pre: 'On Dashboard Overview', steps: 'Scan metric grid', expected: 'Total Sales, Expiry Warnings, Active SKUs, and Reorder Alerts are present', priority: 'Critical', status: 'Implemented' },
  { id: 'DASH-003', module: 'Dashboard', feature: 'Section Tab Navigation', scenario: 'Navigate across dashboard operational sections', pre: 'On Dashboard Overview', steps: 'Click Inventory, Khata, and RBAC sub-tabs', expected: 'Corresponding section view renders cleanly without console errors', priority: 'High', status: 'Implemented' },
  { id: 'DASH-004', module: 'Dashboard', feature: 'Role-Based Selector', scenario: 'Switch user role between Owner, Manager, Cashier', pre: 'Dashboard header visible', steps: 'Change role dropdown value', expected: 'Current role state updates immediately and UI reflects permissions', priority: 'Medium', status: 'Implemented' },

  // Inventory Management
  { id: 'INV-001', module: 'Inventory', feature: 'Catalog Table Display', scenario: 'Verify inventory catalog renders product columns', pre: 'On Inventory Section', steps: 'Inspect table headers', expected: 'Product Name, SKU, Category, Stock, Batch, Price columns visible', priority: 'Critical', status: 'Implemented' },
  { id: 'INV-002', module: 'Inventory', feature: 'Product Search & Filter', scenario: 'Search for specific product SKU or name', pre: 'Inventory table populated', steps: 'Type query into inventory search input', expected: 'Table filters matching rows in real time', priority: 'High', status: 'Implemented' },
  { id: 'INV-003', module: 'Inventory', feature: 'Add Product Modal / Form', scenario: 'Validate required fields for adding new inventory item', pre: 'On Inventory Section', steps: 'Click "Add Product" button', expected: 'Form opens requiring Name, SKU, Category, Price, and Initial Stock', priority: 'High', status: 'Implemented' },
  { id: 'INV-004', module: 'Inventory', feature: 'Stock Adjustment', scenario: 'Trigger quick stock increment or decrement', pre: 'Product row visible', steps: 'Click stock adjust trigger', expected: 'Modal opens allowing stock adjustment with reason', priority: 'Medium', status: 'Implemented' },

  // Point of Sale (POS)
  { id: 'POS-001', module: 'POS', feature: 'POS Terminal Layout', scenario: 'Verify POS cart layout and product search grid', pre: 'On POS Section', steps: 'Inspect POS interface', expected: 'Catalog grid and Bill Summary cart sidebar are rendered', priority: 'Critical', status: 'Implemented' },
  { id: 'POS-002', module: 'POS', feature: 'Add to Cart', scenario: 'Add item to current POS checkout cart', pre: 'POS catalog items displayed', steps: 'Click on product card or barcode add button', expected: 'Item appears in cart with quantity 1 and price updated', priority: 'Critical', status: 'Implemented' },
  { id: 'POS-003', module: 'POS', feature: 'Tax & Subtotal Calculation', scenario: 'Verify GST and subtotal arithmetic on cart', pre: 'Items present in POS cart', steps: 'Inspect Bill Summary numbers', expected: 'GST calculated according to category rules and added to Subtotal', priority: 'High', status: 'Implemented' },
  { id: 'POS-004', module: 'POS', feature: 'Checkout Bill Simulation', scenario: 'Complete checkout transaction in Cash/UPI mode', pre: 'Cart has items', steps: 'Select payment method -> Click Complete Bill', expected: 'Cart resets, invoice generated, and stock deducted', priority: 'Critical', status: 'Implemented' },

  // Smart Expiry Management
  { id: 'EXP-001', module: 'Expiry', feature: 'Near-Expiry Tracking', scenario: 'Verify items expiring within 7 days display warning badges', pre: 'Batches present', steps: 'Inspect expiry dashboard section', expected: 'Items flagged with Amber/Red warning indicators based on days remaining', priority: 'High', status: 'Implemented' },
  { id: 'EXP-002', module: 'Expiry', feature: 'Dynamic Markdown Trigger', scenario: 'Apply automated markdown discount to near-expiry item', pre: 'Near-expiry batch listed', steps: 'Click Apply Discount slider/button', expected: 'Discounted price calculated to accelerate clearance', priority: 'Medium', status: 'Implemented' },

  // Digital Khata Ledger
  { id: 'KHT-001', module: 'Khata', feature: 'Customer Ledger Directory', scenario: 'View customer balance records and search customer', pre: 'On Khata Section', steps: 'Inspect customer list and search by name', expected: 'Customer names, phone numbers, and balances render accurately', priority: 'High', status: 'Implemented' },
  { id: 'KHT-002', module: 'Khata', feature: 'Credit Transaction Entry', scenario: 'Add new credit debit entry for customer ledger', pre: 'Customer selected', steps: 'Enter amount and transaction description -> Submit', expected: 'Balance adjusts and transaction recorded in ledger history', priority: 'High', status: 'Implemented' },

  // AI Forecasting & Hyperlocal Marketplace
  { id: 'AI-001', module: 'AI', feature: 'Demand Forecast Chart', scenario: 'Verify 7-day predictive demand curves render in chart', pre: 'On Forecast section', steps: 'Inspect Recharts forecast visualizer', expected: 'Forecast chart renders historical vs predicted demand volume', priority: 'Medium', status: 'Implemented' },
  { id: 'MKT-001', module: 'Marketplace', feature: 'Hyperlocal Deals Listing', scenario: 'Browse discounted items available for local consumers', pre: 'Switch to Marketplace tab', steps: 'Inspect item grid', expected: 'Store address, discounted price, and pickup tags are visible', priority: 'Medium', status: 'Implemented' },

  // RBAC & Access Control
  { id: 'RBAC-001', module: 'RBAC', feature: 'Cashier Restrictions', scenario: 'Verify Cashier role cannot delete products or modify store settings', pre: 'Set role to Cashier', steps: 'Attempt to locate administrative triggers', expected: 'Delete buttons and sensitive store settings are hidden/disabled', priority: 'Critical', status: 'Implemented' },
  { id: 'RBAC-002', module: 'RBAC', feature: 'Manager Operational Permissions', scenario: 'Verify Store Manager can manage inventory and view forecasts', pre: 'Set role to Manager', steps: 'Access inventory and forecasting features', expected: 'Inventory adjustment and PO creation accessible', priority: 'High', status: 'Implemented' },

  // Regression & E2E Workflows
  { id: 'REG-001', module: 'Regression', feature: 'End-to-End Retail Journey', scenario: 'Catalog inspection -> Stock verification -> POS Cart addition -> Checkout calculation', pre: 'Application active', steps: 'Follow comprehensive end-to-end purchasing workflow', expected: 'All modules interact seamlessly without console errors or state corruption', priority: 'Critical', status: 'Implemented' }
];

export async function generateCoverageMatrixWorkbook(outputPath = config.paths.coverageMatrix) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StockSmart QA Architecture';
  const ws = workbook.addWorksheet('Web E2E Coverage Matrix');

  ws.columns = [
    { width: 14 }, // Test ID
    { width: 16 }, // Module
    { width: 26 }, // Feature
    { width: 40 }, // Scenario
    { width: 25 }, // Preconditions
    { width: 45 }, // Test Steps
    { width: 45 }, // Expected Result
    { width: 14 }, // Priority
    { width: 16 }  // Automation Status
  ];

  // Title
  ws.getCell('A1').value = 'StockSmart AI — Web E2E Test Coverage Matrix';
  ws.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0F172A' } };
  ws.getCell('A2').value = `Total Mapped Real Application Test Cases: ${coverageMatrixData.length} | Generated: ${new Date().toISOString()}`;
  ws.getCell('A2').font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF64748B' } };

  // Headers
  const headers = ['Test ID', 'Module', 'Feature', 'Scenario', 'Preconditions', 'Test Steps', 'Expected Result', 'Priority', 'Status'];
  ws.getRow(4).values = headers;
  const headerRow = ws.getRow(4);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  let rowIdx = 5;
  for (const item of coverageMatrixData) {
    const row = ws.getRow(rowIdx);
    row.values = [item.id, item.module, item.feature, item.scenario, item.pre, item.steps, item.expected, item.priority, item.status];
    row.height = 22;
    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      if (colNum === 1 || colNum === 8 || colNum === 9) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });

    // Priority color
    const prioCell = row.getCell(8);
    if (item.priority === 'Critical') prioCell.font = { bold: true, color: { argb: 'FFB91C1C' } };
    else if (item.priority === 'High') prioCell.font = { bold: true, color: { argb: 'FFD97706' } };

    // Status color
    const statusCell = row.getCell(9);
    statusCell.font = { bold: true, color: { argb: 'FF15803D' } };

    rowIdx++;
  }

  ws.views = [{ state: 'frozen', ySplit: 4 }];
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Web E2E Coverage Matrix successfully written to: ${outputPath}`);
  return outputPath;
}

if (process.argv[1] && process.argv[1].endsWith('generateCoverageMatrix.js')) {
  generateCoverageMatrixWorkbook().catch(err => {
    console.error('Failed to generate coverage matrix:', err);
    process.exit(1);
  });
}
