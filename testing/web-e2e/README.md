# StockSmart AI — Web E2E Testing Framework (Selenium WebDriver)

Enterprise-grade End-to-End automation framework for StockSmart AI web application using Node.js, Selenium WebDriver, Mocha, Chai, and ExcelJS.

## Features
- **Page Object Model (POM):** Decoupled locators and UI actions for high maintainability.
- **Dual Reporting:** Generates comprehensive `Selenium_Test_Report.xlsx` (8 worksheets) and interactive `Selenium_HTML_Report.html`.
- **Automatic Failure Artifacts:** Captures high-resolution failure screenshots and browser console logs.
- **Multi-Module Coverage:** Authentication, Dashboard, Inventory, POS, Analytics, AI Features, and Regression.

## Running Tests Locally
```bash
cd testing/web-e2e

# Install dependencies
npm install

# Run all tests in headless Chrome
npm run test:headless

# Run specific modules
npm run test:auth
npm run test:dashboard
npm run test:inventory
npm run test:pos
```

## Generated Reports
Reports are written to `reports/`:
- `reports/Selenium_Test_Report.xlsx` (8 worksheets: Executive Summary, Test Case Details, Module-wise Analysis, Pass/Fail Distribution, Execution Time Analysis, Defect Analysis, Failed Test Details, Browser and Environment Details)
- `reports/Selenium_HTML_Report.html`
- `reports/screenshots/`
