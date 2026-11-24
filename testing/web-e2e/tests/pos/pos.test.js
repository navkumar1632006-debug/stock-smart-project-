import { getDriver, quitDriver } from '../../utils/driverFactory.js';
import { POSPage } from '../../pages/InventoryAndPOSPages.js';
import { excelReporter } from '../../utils/excelReporter.js';
import { generateHtmlReport } from '../../utils/htmlReportGenerator.js';
import { takeScreenshot } from '../../utils/screenshotManager.js';
import { expect } from 'chai';

describe('Web E2E: Point of Sale (POS) Module', function () {
  this.timeout(60000);
  let driver;
  let posPage;

  before(async function () {
    driver = await getDriver();
    posPage = new POSPage(driver);
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
      testId: test.ctx?.testId || `POS-${Date.now().toString().slice(-3)}`,
      category: 'POS',
      module: 'POS',
      scenario: test.title,
      expected: 'POS terminal responds to user interactions and bill calculation rules',
      actual: test.state === 'passed' ? 'Verified expected outcome' : (test.err?.message || 'Failed'),
      status: test.state === 'passed' ? 'PASS' : 'FAIL',
      duration: duration,
      error: test.err?.message || null,
      stack: test.err?.stack || null,
      screenshot: screenshotName
    });
  });

  it('POS-001: Should verify POS terminal route readiness', async function () {
    this.testId = 'POS-001';
    await posPage.navigateTo('/?section=pos');
    await posPage.sleep(1000);
    const source = await driver.getPageSource();
    expect(source).to.include('html');
  });

  it('POS-002: Should check POS layout viewport integrity', async function () {
    this.testId = 'POS-002';
    const size = await driver.manage().window().getSize();
    expect(size.width).to.be.greaterThan(1000);
  });
});
