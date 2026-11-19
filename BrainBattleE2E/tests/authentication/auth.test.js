import { getDriver, quitDriver } from '../../utils/driverFactory.js';
import { LoginPage } from '../../pages/LoginPage.js';
import { excelReporter } from '../../utils/excelReporter.js';
import { generateHtmlReport } from '../../utils/htmlReportGenerator.js';
import { takeScreenshot } from '../../utils/screenshotManager.js';
import { expect } from 'chai';

describe('Web E2E: Authentication Module', function () {
  this.timeout(60000);
  let driver;
  let loginPage;

  before(async function () {
    driver = await getDriver();
    loginPage = new LoginPage(driver);
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
      testId: test.ctx?.testId || `AUTH-${Date.now().toString().slice(-3)}`,
      category: 'Authentication',
      module: 'Auth',
      scenario: test.title,
      expected: 'Form behaves according to validation / navigation rules',
      actual: test.state === 'passed' ? 'Verified expected outcome' : (test.err?.message || 'Failed'),
      status: test.state === 'passed' ? 'PASS' : 'FAIL',
      duration: duration,
      error: test.err?.message || null,
      stack: test.err?.stack || null,
      screenshot: screenshotName
    });
  });

  it('AUTH-001: Should display login page with email and password inputs', async function () {
    this.testId = 'AUTH-001';
    await loginPage.open();
    const isVisible = await loginPage.isLoginFormVisible();
    expect(isVisible).to.be.true;
    const title = await loginPage.getHeaderTitle();
    expect(title).to.include('StockSmart');
  });

  it('AUTH-002: Should validate empty email submission and show required message', async function () {
    this.testId = 'AUTH-002';
    await loginPage.open();
    await loginPage.login('', '');
    const err = await loginPage.getErrorMessage();
    expect(err).to.include('Email is required');
  });

  it('AUTH-003: Should validate incorrect email format', async function () {
    this.testId = 'AUTH-003';
    await loginPage.open();
    await loginPage.login('invalid-email-string', '123456');
    const err = await loginPage.getErrorMessage();
    expect(err).to.include('valid email');
  });

  it('AUTH-004: Should show invalid credentials error on unregistered user attempt', async function () {
    this.testId = 'AUTH-004';
    await loginPage.open();
    await loginPage.login('unregistered.retailer@example.com', 'RandomPassword999!');
    await loginPage.sleep(1500); // Wait for auth API response
    const err = await loginPage.getErrorMessage();
    expect(err).to.match(/invalid email or password|error/i);
  });

  it('AUTH-005: Should toggle into Forgot Password mode', async function () {
    this.testId = 'AUTH-005';
    await loginPage.open();
    await loginPage.toggleForgotPassword();
    const header = await loginPage.getHeaderTitle();
    expect(header).to.include('Reset Password');
  });

  it('AUTH-006: Should navigate to Signup screen when clicking Sign up now', async function () {
    this.testId = 'AUTH-006';
    await loginPage.open();
    await loginPage.navigateToSignup();
    await loginPage.sleep(500);
    const isSignupVisible = await loginPage.isSignupFormVisible();
    expect(isSignupVisible).to.be.true;
  });
});
