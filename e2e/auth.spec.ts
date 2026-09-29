import { test, expect } from '@playwright/test';

// These E2E tests require real test credentials to execute against the Supabase backend.
// Do NOT hardcode credentials. Inject them via environment variables:
// E2E_TEST_EMAIL
// E2E_TEST_PASSWORD
const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

test.describe('Authentication Flow', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be provided');

  test('user can log in and log out', async ({ page }) => {
    // 1. Login page loads
    await page.goto('/');
    
    // 2. Authentication UI works
    await page.fill('input[type="email"]', TEST_EMAIL as string);
    await page.fill('input[type="password"]', TEST_PASSWORD as string);
    await page.click('button[type="submit"]');

    // 3. Successful authentication reaches the authenticated application
    await expect(page.locator('text=RetailDashboard')).toBeVisible({ timeout: 10000 }); // adjust to actual dashboard indicator
    await expect(page.url()).not.toContain('/login');

    // 4. Logout returns to unauthenticated state
    await page.click('button:has-text("Logout")'); // adjust based on actual logout button
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
