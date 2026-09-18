import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/504e7635-c628-4a9e-ae0f-f8c4ac7203a8';

async function testDashboardNavigation() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 950 });

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

    // Set localStorage before navigation
    await page.evaluateOnNewDocument((session) => {
      localStorage.setItem('sb-dsshzxopmfxzzihhiopi-auth-token', JSON.stringify(session));
      localStorage.setItem('hasSeenWalkthrough', 'true');
      localStorage.setItem('stocksmart_active_store_id', 'store-test-123');
    }, sessionData);

    console.log('Navigating to authenticated dashboard...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));

    // Capture initial authenticated dashboard view
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '09_dashboard_pos.png') });
    console.log('Saved 09_dashboard_pos.png');

    const navButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.map(b => b.innerText.trim()).filter(t => t.length > 0);
    });
    console.log('Available button labels on dashboard:', navButtons.slice(0, 30));

    // Function to click a tab by text and capture screenshot
    const clickTabAndCapture = async (tabText, filename) => {
      const clicked = await page.evaluate((text) => {
        const btns = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
        const target = btns.find(b => b.innerText.toLowerCase().includes(text.toLowerCase()));
        if (target) {
          target.click();
          return true;
        }
        return false;
      }, tabText);

      if (clicked) {
        console.log(`Clicked tab: "${tabText}" -> saving ${filename}`);
        await new Promise(r => setTimeout(r, 1200));
        await page.screenshot({ path: path.join(ARTIFACT_DIR, filename) });
      } else {
        console.log(`Could not find tab button matching: "${tabText}"`);
      }
    };

    await clickTabAndCapture('inventory', '10_dashboard_inventory.png');
    await clickTabAndCapture('expiry', '11_dashboard_expiry.png');
    await clickTabAndCapture('invoices', '12_dashboard_invoices.png');
    await clickTabAndCapture('suppliers', '13_dashboard_suppliers.png');
    await clickTabAndCapture('analytics', '14_dashboard_analytics.png');
    await clickTabAndCapture('team', '15_dashboard_rbac.png');
    await clickTabAndCapture('khata', '16_dashboard_khata.png');

    console.log('Finished capturing dashboard tabs!');

  } catch (err) {
    console.error('Error during dashboard test:', err);
  } finally {
    await browser.close();
  }
}

testDashboardNavigation();
