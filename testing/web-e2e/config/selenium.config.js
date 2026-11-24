import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  browser: process.env.BROWSER || 'chrome',
  headless: process.env.HEADLESS === 'true' || process.env.CI === 'true',
  timeouts: {
    explicitWait: parseInt(process.env.EXPLICIT_WAIT || '15000', 10),
    pageLoad: parseInt(process.env.PAGE_LOAD_TIMEOUT || '30000', 10),
    script: parseInt(process.env.SCRIPT_TIMEOUT || '20000', 10)
  },
  chromeOptions: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1920,1080',
    '--disable-extensions',
    '--ignore-certificate-errors',
    '--disable-infobars',
    '--disable-notifications'
  ],
  paths: {
    reports: path.resolve(rootDir, 'reports'),
    excelReport: path.resolve(rootDir, 'reports/Selenium_Test_Report.xlsx'),
    htmlReport: path.resolve(rootDir, 'reports/Selenium_HTML_Report.html'),
    screenshots: path.resolve(rootDir, 'reports/screenshots')
  }
};

export default config;
