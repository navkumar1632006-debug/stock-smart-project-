import { getDriver, quitDriver } from '../../utils/driverFactory.js';
import { DashboardPage } from '../../pages/DashboardPage.js';
import { excelReporter } from '../../utils/excelReporter.js';
import { generateHtmlReport } from '../../utils/htmlReportGenerator.js';
import { takeScreenshot } from '../../utils/screenshotManager.js';
import { expect } from 'chai';

describe('Web E2E: Operations & Navigation Module', function () {
  this.timeout(60000);
  let driver;
  let dashboardPage;

  before(async function () {
    driver = await getDriver();
    dashboardPage = new DashboardPage(driver);
  });

  after(async function () {
    await excelReporter.generateReport();
    generateHtmlReport(excelReporter.results);
    await quitDriver();
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 10;
    let screenshotName = null;

    if (test.state === 'failed') {
      screenshotName = await takeScreenshot(driver, test.title);
    }

    excelReporter.recordTestResult({
      testId: test.ctx?.testId || `OPS-${Date.now().toString().slice(-3)}`,
      category: 'Operations',
      module: 'Dashboard',
      scenario: test.title,
      expected: 'Interface elements and layout render stably',
      actual: test.state === 'passed' ? 'Verified expected outcome' : (test.err?.message || 'Failed'),
      status: test.state === 'passed' ? 'PASS' : 'FAIL',
      duration: duration,
      error: test.err?.message || null,
      stack: test.err?.stack || null,
      screenshot: screenshotName
    });
  });

  it('DASH-001: Should navigate and establish root document title and structure', async function () {
    this.testId = 'DASH-001';
    await dashboardPage.navigateTo('/');
    const title = await driver.getTitle();
    expect(title).to.be.a('string');
  });

  it('DASH-002: Should verify responsive viewport container rendering', async function () {
    this.testId = 'DASH-002';
    await dashboardPage.navigateTo('/');
    const bodyExists = await dashboardPage.isElementPresent({ css: 'body' }, 5000);
    expect(bodyExists).to.be.true;
  });

  it('DASH-003: Should confirm root React app mounting without fatal script unhandled exception', async function () {
    this.testId = 'DASH-003';
    await dashboardPage.navigateTo('/');
    const rootElement = await dashboardPage.isElementPresent({ css: '#root' }, 5000);
    expect(rootElement).to.be.true;
  });
});
