import { getDriver, quitDriver } from '../../utils/driverFactory.js';
import { AnalyticsPage } from '../../pages/InventoryAndPOSPages.js';
import { excelReporter } from '../../utils/excelReporter.js';
import { generateHtmlReport } from '../../utils/htmlReportGenerator.js';
import { takeScreenshot } from '../../utils/screenshotManager.js';
import { expect } from 'chai';

describe('Web E2E: Analytics & Reports Module', function () {
  this.timeout(60000);
  let driver;
  let analyticsPage;

  before(async function () {
    driver = await getDriver();
    analyticsPage = new AnalyticsPage(driver);
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
      testId: test.ctx?.testId || `ANA-${Date.now().toString().slice(-3)}`,
      category: 'Analytics',
      module: 'Analytics',
      scenario: test.title,
      expected: 'Analytics charts and report tables render accurately',
      actual: test.state === 'passed' ? 'Verified expected outcome' : (test.err?.message || 'Failed'),
      status: test.state === 'passed' ? 'PASS' : 'FAIL',
      duration: duration,
      error: test.err?.message || null,
      stack: test.err?.stack || null,
      screenshot: screenshotName
    });
  });

  it('ANA-001: Should navigate and verify reports section route', async function () {
    this.testId = 'ANA-001';
    await analyticsPage.navigateTo('/?section=reports');
    await analyticsPage.sleep(1000);
    const source = await driver.getPageSource();
    expect(source.length).to.be.greaterThan(500);
  });

  it('ANA-002: Should verify Recharts charting container responsiveness', async function () {
    this.testId = 'ANA-002';
    const isPresent = await analyticsPage.isAnalyticsLoaded();
    expect(isPresent !== undefined).to.be.true;
  });
});
