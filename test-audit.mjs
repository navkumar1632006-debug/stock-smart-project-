import puppeteer from 'puppeteer';
import path from 'path';

const SCREENSHOT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/504e7635-c628-4a9e-ae0f-f8c4ac7203a8';

async function auditBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const consoleLogs = [];
    const pageErrors = [];

    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    console.log('--- NAVIGATING TO http://localhost:3000 ---');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Save screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screen_root.png') });

    const title = await page.title();
    const rootText = await page.evaluate(() => document.body.innerText);
    console.log('Page Title:', title);
    console.log('Page Content Preview:\n', rootText.substring(0, 600));

    console.log('\n--- NAVIGATING TO http://localhost:3000/marketplace ---');
    await page.goto('http://localhost:3000/marketplace', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screen_marketplace.png') });
    const marketText = await page.evaluate(() => document.body.innerText);
    console.log('Marketplace Content Preview:\n', marketText.substring(0, 600));

    console.log('\n--- CONSOLE LOGS ---');
    consoleLogs.slice(0, 25).forEach(l => console.log(l));

    console.log('\n--- PAGE ERRORS ---');
    pageErrors.forEach(e => console.error(e));

  } catch (err) {
    console.error('Audit script failure:', err);
  } finally {
    await browser.close();
  }
}

auditBrowser();
