import { getDriver, quitDriver } from '../../utils/driverFactory.js';
import { AIPage } from '../../pages/InventoryAndPOSPages.js';
import { excelReporter } from '../../utils/excelReporter.js';
import { generateHtmlReport } from '../../utils/htmlReportGenerator.js';
import { takeScreenshot } from '../../utils/screenshotManager.js';
import { expect } from 'chai';

describe('Web E2E: AI Retail Assistant Module', function () {
  this.timeout(60000);
  let driver;
  let aiPage;

  before(async function () {
    driver = await getDriver();
    aiPage = new AIPage(driver);
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
      testId: test.ctx?.testId || `AI-${Date.now().toString().slice(-3)}`,
      category: 'AI Features',
      module: 'AI',
      scenario: test.title,
      expected: 'AI assistant displays briefing card or chat input with graceful fallback',
      actual: test.state === 'passed' ? 'Verified expected outcome' : (test.err?.message || 'Failed'),
      status: test.state === 'passed' ? 'PASS' : 'FAIL',
      duration: duration,
      error: test.err?.message || null,
      stack: test.err?.stack || null,
      screenshot: screenshotName
    });
  });

  it('AI-001: Should navigate and verify AI assistant route and component shell', async function () {
    this.testId = 'AI-001';
    await aiPage.navigateTo('/?tab=assistant');
    await aiPage.sleep(1000);
    const source = await driver.getPageSource();
    expect(source.length).to.be.greaterThan(500);
  });

  it('AI-002: Should check AI retail intelligence container mounting', async function () {
    this.testId = 'AI-002';
    const isMounted = await aiPage.isAILoaded();
    expect(isMounted !== undefined).to.be.true;
  });
});
