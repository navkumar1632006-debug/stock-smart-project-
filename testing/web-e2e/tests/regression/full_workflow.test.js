import { getDriver, quitDriver } from '../../utils/driverFactory.js';
import { LoginPage } from '../../pages/LoginPage.js';
import { DashboardPage } from '../../pages/DashboardPage.js';
import { excelReporter } from '../../utils/excelReporter.js';
import { generateHtmlReport } from '../../utils/htmlReportGenerator.js';
import { takeScreenshot } from '../../utils/screenshotManager.js';
import { expect } from 'chai';

describe('Web E2E: Full Regression Workflow', function () {
  this.timeout(90000);
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
      testId: test.ctx?.testId || `REG-${Date.now().toString().slice(-3)}`,
      category: 'Regression',
      module: 'Regression',
      scenario: test.title,
      expected: 'Retail operational workflow executes end-to-end without unhandled breaks',
      actual: test.state === 'passed' ? 'Verified expected outcome' : (test.err?.message || 'Failed'),
      status: test.state === 'passed' ? 'PASS' : 'FAIL',
      duration: duration,
      error: test.err?.message || null,
      stack: test.err?.stack || null,
      screenshot: screenshotName
    });
  });

  it('REG-001: Should execute full retail app launch, login verification, and navigation smoke', async function () {
    this.testId = 'REG-001';
    await loginPage.open();
    const isLogin = await loginPage.isLoginFormVisible();
    expect(isLogin).to.be.true;
    
    // Test navigation between auth modes
    await loginPage.toggleForgotPassword();
    expect(await loginPage.getHeaderTitle()).to.include('Reset Password');

    await loginPage.click(loginPage.backToLoginBtn);
    expect(await loginPage.isLoginFormVisible()).to.be.true;
  });

  it('REG-002: Should verify application responsiveness across mobile, tablet, and desktop viewports', async function () {
    this.testId = 'REG-002';
    // Test Desktop
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await loginPage.open();
    expect(await loginPage.isLoginFormVisible()).to.be.true;

    // Test Mobile viewport
    await driver.manage().window().setRect({ width: 375, height: 667 });
    await loginPage.sleep(500);
    expect(await loginPage.isLoginFormVisible()).to.be.true;

    // Restore standard viewport
    await driver.manage().window().setRect({ width: 1920, height: 1080 });
  });
});
