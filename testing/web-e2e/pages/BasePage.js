import { By, until } from 'selenium-webdriver';
import config from '../config/selenium.config.js';

export class BasePage {
  constructor(driver) {
    this.driver = driver;
    this.timeout = config.timeouts.explicitWait;
  }

  async navigateTo(pathStr = '') {
    const fullUrl = `${config.baseUrl}${pathStr}`;
    await this.driver.get(fullUrl);
  }

  async waitForElement(locator, customTimeout = this.timeout) {
    return await this.driver.wait(until.elementLocated(locator), customTimeout);
  }

  async waitForElementVisible(locator, customTimeout = this.timeout) {
    const element = await this.waitForElement(locator, customTimeout);
    await this.driver.wait(until.elementIsVisible(element), customTimeout);
    return element;
  }

  async click(locator) {
    const element = await this.waitForElementVisible(locator);
    await element.click();
  }

  async type(locator, text) {
    const element = await this.waitForElementVisible(locator);
    await element.clear();
    await element.sendKeys(text);
  }

  async getText(locator) {
    const element = await this.waitForElementVisible(locator);
    return await element.getText();
  }

  async isElementPresent(locator, timeout = 3000) {
    try {
      await this.waitForElement(locator, timeout);
      return true;
    } catch (e) {
      return false;
    }
  }

  async executeScript(script, ...args) {
    return await this.driver.executeScript(script, ...args);
  }

  async sleep(ms) {
    await this.driver.sleep(ms);
  }

  async getBrowserLogs() {
    try {
      return await this.driver.manage().logs().get('browser');
    } catch (e) {
      return [];
    }
  }
}

export default BasePage;
