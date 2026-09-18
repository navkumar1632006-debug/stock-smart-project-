import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/504e7635-c628-4a9e-ae0f-f8c4ac7203a8';

async function captureFullPageScreenshots() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1200 });

    const sessionData = {
      access_token: "header.payload.signature",
      refresh_token: "ref-token",
      expires_in: 360000,
      expires_at: Math.floor(Date.now() / 1000) + 360000,
      token_type: "bearer",
      user: {
        id: "11111111-1111-1111-1111-111111111111",
        aud: "authenticated",
        role: "authenticated",
        email: "retailer@stocksmart.ai",
        app_metadata: { provider: "email" },
        user_metadata: { full_name: "Nav Kumar" }
      }
    };

    await page.evaluateOnNewDocument((session) => {
      localStorage.setItem('sb-dsshzxopmfxzzihhiopi-auth-token', JSON.stringify(session));
      localStorage.setItem('hasSeenWalkthrough', 'true');
      localStorage.setItem('stocksmart_active_store_id', 'store-test-123');
    }, sessionData);

    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Capture Full Page POS
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'full_01_pos.png'), fullPage: true });
    console.log('Saved full_01_pos.png');

    const clickNavTab = async (text, filename) => {
      const success = await page.evaluate((tabName) => {
        const btns = Array.from(document.querySelectorAll('button'));
        const found = btns.find(b => b.innerText.includes(tabName));
        if (found) {
          found.scrollIntoView();
          found.click();
          return true;
        }
        return false;
      }, text);

      if (success) {
        await new Promise(r => setTimeout(r, 1200));
        await page.screenshot({ path: path.join(ARTIFACT_DIR, filename), fullPage: true });
        console.log(`Saved ${filename}`);
      } else {
        console.log(`Tab not found: ${text}`);
      }
    };

    await clickNavTab('INVENTORY', 'full_02_inventory.png');
    await clickNavTab('EXPIRY & DISCOUNTS', 'full_03_expiry.png');
    await clickNavTab('DIGITAL KHATA', 'full_04_khata.png');
    await clickNavTab('FAMILY ACCOUNT ROLES', 'full_05_rbac.png');
    await clickNavTab('INVOICES & TAX', 'full_06_invoices.png');
    await clickNavTab('BUSINESS REPORTS & TAX', 'full_07_reports.png');
    await clickNavTab('STORE SETTINGS', 'full_08_settings.png');
    await clickNavTab('SUPPLIERS & VENDORS', 'full_09_suppliers.png');

    // Test Retail Assistant
    const clickedAssistant = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const found = btns.find(b => b.innerText.includes('RETAIL ASSISTANT'));
      if (found) { found.click(); return true; }
      return false;
    });
    if (clickedAssistant) {
      await new Promise(r => setTimeout(r, 1200));
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'full_10_assistant.png'), fullPage: true });
      console.log('Saved full_10_assistant.png');
    }

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
}

captureFullPageScreenshots();
