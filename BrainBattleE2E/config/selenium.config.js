import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  baseUrl: (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  browser: process.env.BROWSER || 'chrome',
  headless: process.env.HEADLESS !== 'false', // Defaults to true for CI & safety
  timeouts: {
    explicitWait: parseInt(process.env.EXPLICIT_WAIT_MS || '10000', 10),
    pageLoad: 30000,
    script: 15000,
  },
  paths: {
    reportsDir: path.resolve(process.cwd(), process.env.REPORTS_DIR || './reports'),
    excelReport: path.resolve(process.cwd(), './reports/excel/Web_Test_Report.xlsx'),
    htmlReport: path.resolve(process.cwd(), './reports/html/execution-report.html'),
    screenshotsDir: path.resolve(process.cwd(), process.env.SCREENSHOTS_DIR || './reports/screenshots'),
    coverageMatrix: path.resolve(process.cwd(), './coverage/web-test-coverage-matrix.xlsx')
  }
};

export default config;
