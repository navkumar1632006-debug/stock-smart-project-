# StockSmart AI — Mobile Appium E2E Automation Framework

Automated End-to-End mobile testing framework for the StockSmart AI Android application (`com.stocksmart.app`) using Appium 2, WebdriverIO, UiAutomator2, Mocha, and ExcelJS.

## Features
- **Android UiAutomator2 Driver:** Native Android view hierarchy introspection.
- **Dual Reporting:** Generates `Appium_Mobile_Test_Report.xlsx` (8 worksheets) and `Appium_HTML_Report.html`.
- **Failure Artifacts:** Automatic failure screenshot capturing and crash log extraction.
- **Coverage:** Launch smoke, package verification, bottom navigation, barcode scanner modal, and permissions.

## Local Execution
```bash
cd testing/mobile-appium

# Install dependencies
npm install

# Start Appium server (in separate terminal)
npx appium

# Execute test suite against running emulator or connected Android device
npm test
```

## Generated Reports
Reports are written to `reports/`:
- `reports/Appium_Mobile_Test_Report.xlsx`
- `reports/Appium_HTML_Report.html`
- `reports/screenshots/`
