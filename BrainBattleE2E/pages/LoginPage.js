import { By } from 'selenium-webdriver';
import { BasePage } from './BasePage.js';

export class LoginPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.emailInput = By.css('input#email');
    this.passwordInput = By.css('input#password');
    this.submitBtn = By.css('button[type="submit"]');
    this.forgotPasswordBtn = By.xpath("//button[contains(text(), 'Forgot your password?')]");
    this.signupLink = By.xpath("//p[contains(text(), \"Don't have an account?\")]//button[contains(text(), 'Sign up')]");
    this.backToLoginBtn = By.xpath("//button[contains(text(), 'Back to Sign In')]");
    this.signupSignInLink = By.xpath("//p[contains(text(), 'Already have an account?')]//button[contains(text(), 'Sign in')]");
    this.errorBanner = By.css('.bg-rose-50 p');
    this.formHeader = By.css('h2');
  }

  async open() {
    await this.navigateTo('/');
  }

  async login(email, password) {
    const emailElem = await this.waitForElementVisible(this.emailInput);
    await emailElem.clear();
    if (email) {
      await emailElem.sendKeys(email);
    }

    const passElem = await this.waitForElementVisible(this.passwordInput);
    await passElem.clear();
    if (password) {
      await passElem.sendKeys(password);
    }

    // Disable browser-native form validation (novalidate) on the parent form
    await this.executeScript("document.querySelector('form')?.setAttribute('novalidate', 'true');");
    
    const submitBtnElem = await this.waitForElementVisible(this.submitBtn);
    await submitBtnElem.click();
  }

  async toggleForgotPassword() {
    await this.click(this.forgotPasswordBtn);
  }

  async navigateToSignup() {
    await this.click(this.signupLink);
  }

  async getErrorMessage() {
    return await this.getText(this.errorBanner);
  }

  async getHeaderTitle() {
    return await this.getText(this.formHeader);
  }

  async isLoginFormVisible() {
    return await this.isElementPresent(this.emailInput, 5000);
  }

  async isSignupFormVisible() {
    return await this.isElementPresent(this.signupSignInLink, 5000);
  }
}
