import { By } from 'selenium-webdriver';
import { BasePage } from './BasePage.js';

export class DashboardPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.brandHeader = By.xpath("//h1[contains(text(), 'StockSmart')] | //span[contains(text(), 'StockSmart')]");
    this.overviewTab = By.xpath("//button[contains(., 'Overview')]");
    this.inventoryTab = By.xpath("//button[contains(., 'Inventory')]");
    this.posTab = By.xpath("//button[contains(., 'POS')] | //button[contains(., 'Point of Sale')]");
    this.khataTab = By.xpath("//button[contains(., 'Khata')] | //button[contains(., 'Customers / Khata')]");
    this.rbacTab = By.xpath("//button[contains(., 'Staff & Family')] | //button[contains(., 'RBAC')]");
    this.suppliersTab = By.xpath("//button[contains(., 'Suppliers')]");
    this.marketplaceTab = By.xpath("//button[contains(., 'Hyperlocal App')] | //button[contains(., 'Marketplace')]");
    this.assistantTab = By.xpath("//button[contains(., 'AI Assistant')]");
    this.reportsTab = By.xpath("//button[contains(., 'Business Reports')] | //button[contains(., 'Reports')]");
    this.auditTab = By.xpath("//button[contains(., 'Ledger Audit')]");
    
    // KPI Metrics
    this.kpiTotalSales = By.xpath("//*[contains(text(), 'Total Sales') or contains(text(), 'Sales')]");
    this.kpiExpiryAlerts = By.xpath("//*[contains(text(), 'Expiry') or contains(text(), 'Near Expiry')]");
    this.kpiActiveSkus = By.xpath("//*[contains(text(), 'Active SKUs') or contains(text(), 'Total Products') or contains(text(), 'Products')]");
    this.kpiReorderAlerts = By.xpath("//*[contains(text(), 'Reorder') or contains(text(), 'Low Stock')]");

    // Controls
    this.roleSelector = By.css('select');
  }

  async selectSection(sectionName) {
    const sectionBtn = By.xpath(`//button[contains(., '${sectionName}')]`);
    await this.click(sectionBtn);
  }

  async isKpiCardsVisible() {
    return (
      await this.isElementPresent(this.kpiTotalSales, 5000) ||
      await this.isElementPresent(this.kpiActiveSkus, 5000) ||
      await this.isElementPresent(this.overviewTab, 5000)
    );
  }
}

export default DashboardPage;
