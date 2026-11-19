import { By } from 'selenium-webdriver';
import { BasePage } from './BasePage.js';

export class InventoryPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.searchInput = By.css('input[placeholder*="Search"]');
    this.addProductBtn = By.xpath("//button[contains(., 'Add Product')]");
    this.productTable = By.css('table');
    this.tableHeaders = By.css('table th');
    this.productRows = By.css('table tbody tr');
    this.productNameInput = By.css('input[name="productName"], input#productName');
    this.skuInput = By.css('input[name="sku"], input#sku');
    this.priceInput = By.css('input[name="price"], input#price');
  }

  async searchProduct(query) {
    if (await this.isElementPresent(this.searchInput, 3000)) {
      await this.type(this.searchInput, query);
    }
  }

  async isCatalogLoaded() {
    return await this.isElementPresent(this.productTable, 5000);
  }
}

export class POSPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.posContainer = By.xpath("//*[contains(text(), 'POS') or contains(text(), 'Cart') or contains(text(), 'Bill Summary')]");
    this.checkoutBtn = By.xpath("//button[contains(., 'Checkout') or contains(., 'Complete Bill')]");
    this.cartItems = By.css('.cart-item, [data-testid="cart-item"]');
    this.subtotalAmount = By.xpath("//*[contains(text(), 'Subtotal')]/following-sibling::*");
  }

  async isPOSLoaded() {
    return await this.isElementPresent(this.posContainer, 5000);
  }
}
