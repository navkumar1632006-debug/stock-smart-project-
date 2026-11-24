import { By } from 'selenium-webdriver';
import { BasePage } from './BasePage.js';

export class InventoryPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.searchInput = By.css('input[placeholder*="Search"], input[placeholder*="search"]');
    this.addProductBtn = By.xpath("//button[contains(., 'Add Product') or contains(., 'New Product')]");
    this.productTable = By.css('table');
    this.tableHeaders = By.css('table th');
    this.productRows = By.css('table tbody tr');
    this.productNameInput = By.css('input[name="name"], input#name, input[name="productName"]');
    this.skuInput = By.css('input[name="sku"], input#sku');
    this.priceInput = By.css('input[name="price"], input#price');
    this.stockInput = By.css('input[name="stock"], input#stock, input[name="quantity"]');
    this.categorySelect = By.css('select[name="category"], select#category');
  }

  async searchProduct(query) {
    if (await this.isElementPresent(this.searchInput, 3000)) {
      await this.type(this.searchInput, query);
    }
  }

  async isCatalogLoaded() {
    return (
      await this.isElementPresent(this.productTable, 5000) ||
      await this.isElementPresent(this.searchInput, 5000)
    );
  }
}

export class POSPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.posContainer = By.xpath("//*[contains(text(), 'POS') or contains(text(), 'Cart') or contains(text(), 'Bill Summary')]");
    this.checkoutBtn = By.xpath("//button[contains(., 'Checkout') or contains(., 'Complete Bill') or contains(., 'Charge')]");
    this.cartItems = By.css('.cart-item, [data-testid="cart-item"]');
    this.subtotalAmount = By.xpath("//*[contains(text(), 'Subtotal') or contains(text(), 'Total')]/following-sibling::*");
    this.clearCartBtn = By.xpath("//button[contains(., 'Clear') or contains(., 'Reset')]");
  }

  async isPOSLoaded() {
    return await this.isElementPresent(this.posContainer, 5000);
  }
}

export class AnalyticsPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.forecastContainer = By.xpath("//*[contains(text(), 'Forecast') or contains(text(), 'Demand')]");
    this.salesChart = By.css('.recharts-responsive-container, svg.recharts-surface');
    this.dateFilter = By.css('select, input[type="date"]');
  }

  async isAnalyticsLoaded() {
    return (
      await this.isElementPresent(this.forecastContainer, 5000) ||
      await this.isElementPresent(this.salesChart, 5000)
    );
  }
}

export class AIPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.aiContainer = By.xpath("//*[contains(text(), 'AI Retail Assistant') or contains(text(), 'AI Assistant') or contains(text(), 'Morning Briefing')]");
    this.aiPromptInput = By.css('input[placeholder*="Ask"], textarea[placeholder*="Ask"]');
    this.sendBtn = By.xpath("//button[contains(., 'Send') or contains(., 'Ask')]");
    this.briefingCard = By.xpath("//*[contains(text(), 'Briefing') or contains(text(), 'Daily Insight')]");
  }

  async isAILoaded() {
    return await this.isElementPresent(this.aiContainer, 5000);
  }
}

export default { InventoryPage, POSPage, AnalyticsPage, AIPage };
