import { By } from 'selenium-webdriver';
import { BasePage } from './BasePage.js';

export class DashboardPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.brandHeader = By.xpath("//h1[contains(text(), 'StockSmart')] | //span[contains(text(), 'StockSmart')]");
    this.overviewTab = By.xpath("//button[contains(text(), 'Overview')]");
    this.inventoryTab = By.xpath("//button[contains(text(), 'Inventory')]");
    this.posTab = By.xpath("//button[contains(text(), 'POS')] | //button[contains(text(), 'Point of Sale')]");
    this.khataTab = By.xpath("//button[contains(text(), 'Digital Khata')] | //button[contains(text(), 'Khata')]");
    this.rbacTab = By.xpath("//button[contains(text(), 'RBAC')] | //button[contains(text(), 'Access Control')]");
    this.suppliersTab = By.xpath("//button[contains(text(), 'Suppliers')]");
    this.marketplaceTab = By.xpath("//button[contains(text(), 'Marketplace')]");
    this.assistantTab = By.xpath("//button[contains(text(), 'AI Assistant')] | //button[contains(text(), 'Assistant')]");
    
    // KPI Cards
    this.kpiTotalSales = By.xpath("//*[contains(text(), 'Total Sales') or contains(text(), 'Sales')]");
    this.kpiExpiryAlerts = By.xpath("//*[contains(text(), 'Expiry') or contains(text(), 'Near Expiry')]");
    this.kpiActiveSkus = By.xpath("//*[contains(text(), 'Active SKUs') or contains(text(), 'Total Products')]");
    this.kpiReorderAlerts = By.xpath("//*[contains(text(), 'Reorder') or contains(text(), 'Low Stock')]");

    // Role selector
    this.roleSelector = By.css('select');
  }

  async selectSection(sectionName) {
    const sectionBtn = By.xpath(`//button[contains(., '${sectionName}')]`);
    await this.click(sectionBtn);
  }

  async selectRole(roleValue) {
    const selectElem = await this.waitForElementVisible(this.roleSelector);
    await selectElem.sendKeys(roleValue);
  }

  async isKpiCardsVisible() {
    return (
      await this.isElementPresent(this.kpiTotalSales, 5000) &&
      await this.isElementPresent(this.kpiActiveSkus, 5000)
    );
  }
}
