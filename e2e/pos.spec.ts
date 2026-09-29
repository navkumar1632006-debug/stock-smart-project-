import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;
const TEST_PRODUCT_SKU = process.env.E2E_TEST_PRODUCT_SKU; // An existing product with stock to use for the test sale

test.describe('POS Sale Flow', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD || !TEST_PRODUCT_SKU, 'E2E_TEST_EMAIL, E2E_TEST_PASSWORD, and E2E_TEST_PRODUCT_SKU must be provided');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL as string);
    await page.fill('input[type="password"]', TEST_PASSWORD as string);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });
  });

  test('user can complete a POS sale', async ({ page }) => {
    // Navigate to Inventory/POS tab
    await page.click('button:has-text("Inventory")');
    
    // Select an existing test product and add to cart
    // Wait for product list to load
    await page.waitForSelector('text=Point of Sale (POS)');
    
    // Assume a searchable dropdown or similar for POS
    // (This selector depends heavily on actual UI implementation; using generic placeholders)
    await page.selectOption('select[aria-label="Select product"]', { label: TEST_PRODUCT_SKU });
    await page.fill('input[type="number"][aria-label="Quantity"]', '1');
    await page.click('button:has-text("Add product to cart")');

    // Verify cart reflects the item
    await expect(page.locator('.cart-item', { hasText: TEST_PRODUCT_SKU })).toBeVisible();

    // Complete sale
    await page.click('button:has-text("Complete Sale")');

    // Verify successful transaction notification or UI state
    await expect(page.locator('text=Sale completed successfully')).toBeVisible();

    // Verify resulting inventory/transaction state through the application (optional further verification)
    // For example, checking the Business Reports / ledger
  });
});
