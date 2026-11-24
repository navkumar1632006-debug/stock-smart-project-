export class BaseScreen {
  constructor() {
    this.timeout = 20000;
  }

  async waitForElement(selector, customTimeout = this.timeout) {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout: customTimeout });
    return el;
  }

  async tap(selector) {
    const el = await this.waitForElement(selector);
    await el.click();
  }

  async type(selector, text) {
    const el = await this.waitForElement(selector);
    await el.setValue(text);
  }

  async getText(selector) {
    const el = await this.waitForElement(selector);
    return await el.getText();
  }

  async isDisplayed(selector, timeout = 5000) {
    try {
      const el = await $(selector);
      return await el.isDisplayed();
    } catch (e) {
      return false;
    }
  }

  async getPackage() {
    return await browser.getCurrentPackage();
  }
}

export default BaseScreen;
