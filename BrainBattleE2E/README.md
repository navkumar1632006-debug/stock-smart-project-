# BrainBattleE2E — StockSmart AI Web Automation Framework

Independent, production-oriented Selenium WebDriver test suite for StockSmart AI.

## Tech Stack
- **Engine**: Selenium WebDriver v4
- **Test Runner**: Mocha & Chai
- **Reporting**: ExcelJS (`Web_Test_Report.xlsx`) & Dark-themed HTML (`execution-report.html`)
- **Pattern**: Page Object Model (POM)
- **Browser**: Google Chrome / ChromeDriver (Headless & Windowed)

## Getting Started

### 1. Install Dependencies
```bash
cd BrainBattleE2E
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure target environment URLs:
```bash
cp .env.example .env
```

### 3. Execution Commands
```bash
# Run all E2E test suites with live report generation
npm test

# Run headless in CI/CD environments
npm run test:headless

# Run category-specific suites
npm run test:auth
npm run test:inventory
npm run test:pos
npm run test:regression

# Generate or update Excel Test Coverage Matrix
npm run generate-matrix
```

## Generated Artifacts
- **Excel Report**: `reports/excel/Web_Test_Report.xlsx` (7 Worksheets)
- **HTML Report**: `reports/html/execution-report.html`
- **Coverage Matrix**: `coverage/web-test-coverage-matrix.xlsx`
- **Screenshots**: `reports/screenshots/*.png` (Captured automatically on test failure)
