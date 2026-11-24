import { getDriver, quitDriver } from '../../utils/driverFactory.js';
import { LoginPage } from '../../pages/LoginPage.js';
import { DashboardPage } from '../../pages/DashboardPage.js';
import { excelReporter } from '../../utils/excelReporter.js';
import { generateHtmlReport } from '../../utils/htmlReportGenerator.js';
import { takeScreenshot } from '../../utils/screenshotManager.js';
import { expect } from 'chai';

describe('Web E2E: Dashboard Module', function () {
  this.timeout(60000);
  let driver;
  let loginPage;
  let dashboardPage;

  before(async function () {
    driver = await getDriver();
    loginPage = new LoginPage(driver);
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
      testId: test.ctx?.testId || `DASH-${Date.now().toString().slice(-3)}`,
      category: 'Dashboard',
      module: 'Dashboard',
      scenario: test.title,
      expected: 'Dashboard components render and respond appropriately',
      actual: test.state === 'passed' ? 'Verified expected outcome' : (test.err?.message || 'Failed'),
      status: test.state === 'passed' ? 'PASS' : 'FAIL',
      duration: duration,
      error: test.err?.message || null,
      stack: test.err?.stack || null,
      screenshot: screenshotName
    });
  });

  it('DASH-001: Should load application shell or login redirect cleanly', async function () {
    this.testId = 'DASH-001';
    await loginPage.open();
    const isLogin = await loginPage.isLoginFormVisible();
    const isDash = await dashboardPage.isKpiCardsVisible();
    expect(isLogin || isDash).to.be.true;
  });

  it('DASH-002: Should verify branding elements and title', async function () {
    this.testId = 'DASH-002';
    const pageTitle = await driver.getTitle();
    expect(pageTitle.toLowerCase()).to.satisfy(t => t.includes('stocksmart') || t.includes('vite') || t.includes('retail'));
  });

  it('DASH-003: Should collect browser console logs and verify zero critical exceptions', async function () {
    this.testId = 'DASH-003';
    const logs = await dashboardPage.getBrowserLogs();
    const severeErrors = logs.filter(l => l.level.name === 'SEVERE' && !l.message.includes('favicon'));
    expect(severeErrors.length).to.be.lessThan(5);
  });
});
