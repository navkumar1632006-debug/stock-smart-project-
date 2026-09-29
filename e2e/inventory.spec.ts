import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

test.describe('Inventory CRUD Flow', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be provided');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL as string);
    await page.fill('input[type="password"]', TEST_PASSWORD as string);
    await page.click('button[type="submit"]');
    // Wait for navigation
    await page.waitForURL('**/', { timeout: 10000 });
  });

  test('user can add, edit, and delete a product', async ({ page }) => {
    // Navigate to Inventory
    await page.click('button:has-text("Inventory")');
    
    // Add Product
    await page.click('button:has-text("Add Product")');
    const uniqueSku = 'E2E-TEST-SKU-' + Date.now();
    await page.fill('input[name="name"]', 'E2E Test Product');
    await page.fill('input[name="sku"]', uniqueSku);
    await page.fill('input[name="price"]', '99.99');
    await page.fill('input[name="cost"]', '50.00');
    await page.fill('select[name="category"]', 'General');
    await page.click('button[type="submit"]:has-text("Save")');

    // Verify product appears
    await expect(page.locator('text=' + uniqueSku)).toBeVisible();

    // Edit product
    // Assuming there's an edit button in the row containing the sku
    const row = page.locator('tr', { hasText: uniqueSku });
    await row.locator('button[title="Edit"]').click();
    await page.fill('input[name="price"]', '109.99');
    await page.click('button[type="submit"]:has-text("Save")');

    // Verify updated data
    await expect(row.locator('text=109.99')).toBeVisible();

    // Delete product (assuming user role permits it, otherwise this will be blocked by RLS/UI)
    await row.locator('button[title="Delete"]').click();
    // Assuming a confirmation dialog
    await page.click('button:has-text("Confirm")');

    await expect(page.locator('text=' + uniqueSku)).not.toBeVisible();
  });
});
