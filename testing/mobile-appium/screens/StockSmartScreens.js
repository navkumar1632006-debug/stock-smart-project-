import { BaseScreen } from './BaseScreen.js';

export class LoginScreen extends BaseScreen {
  constructor() {
    super();
    this.emailInput = '~email-input, android=new UiSelector().textContains("Email")';
    this.passwordInput = '~password-input, android=new UiSelector().textContains("Password")';
    this.loginBtn = '~login-button, android=new UiSelector().text("Sign In")';
    this.forgotPasswordBtn = '~forgot-password-button';
  }

  async isLoginScreenDisplayed() {
    return await this.isDisplayed(this.loginBtn, 10000);
  }
}

export class DashboardScreen extends BaseScreen {
  constructor() {
    super();
    this.headerTitle = 'android=new UiSelector().textContains("StockSmart")';
    this.posTab = '~tab-pos, android=new UiSelector().text("POS")';
    this.inventoryTab = '~tab-inventory, android=new UiSelector().text("Inventory")';
    this.demandTab = '~tab-demand, android=new UiSelector().text("AI Demand")';
    this.moreTab = '~tab-more, android=new UiSelector().text("More")';
  }

  async isDashboardDisplayed() {
    return await this.isDisplayed(this.headerTitle, 10000);
  }
}

export class BarcodeScannerScreen extends BaseScreen {
  constructor() {
    super();
    this.cameraView = 'android=new UiSelector().className("android.view.TextureView")';
    this.manualEntryBtn = '~manual-entry-button, android=new UiSelector().textContains("Manual")';
    this.flashBtn = '~flash-toggle-button';
    this.closeBtn = '~close-scanner-button';
  }

  async isScannerDisplayed() {
    return await this.isDisplayed(this.cameraView, 10000) || await this.isDisplayed(this.manualEntryBtn, 5000);
  }
}

export default { LoginScreen, DashboardScreen, BarcodeScannerScreen };
