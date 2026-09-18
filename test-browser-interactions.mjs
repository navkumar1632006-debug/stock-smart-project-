import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/504e7635-c628-4a9e-ae0f-f8c4ac7203a8';

async function runLiveBrowserInteractions() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    console.log('\n--- 1. TESTING LOGIN SCREEN & VALIDATIONS ---');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));

    // Screenshot initial Login page
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_login_page.png') });
    console.log('Saved screenshot: 01_login_page.png');

    // Click Sign In with empty inputs to test validation
    const signInBtn = await page.$('button[type="submit"]');
    if (signInBtn) {
      await signInBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const errorMsg = await page.evaluate(() => {
        const el = document.querySelector('.bg-rose-50, .text-rose-600, .text-rose-700');
        return el ? el.innerText : 'No error element found';
      });
      console.log('Validation with empty inputs:', errorMsg);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_login_empty_error.png') });
    }

    // Type invalid email
    await page.type('input[type="email"]', 'invalid-email');
    await page.type('input[type="password"]', 'pass123');
    if (signInBtn) {
      await signInBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const emailError = await page.evaluate(() => {
        const el = document.querySelector('.bg-rose-50, .text-rose-600, .text-rose-700');
        return el ? el.innerText : 'No error element found';
      });
      console.log('Validation with invalid email format:', emailError);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_login_invalid_email.png') });
    }

    // Click "Forgot your password?"
    console.log('\n--- 2. TESTING FORGOT PASSWORD MODE ---');
    const forgotBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const found = btns.find(b => b.innerText.includes('Forgot your password?'));
      if (found) { found.click(); return true; }
      return false;
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_forgot_password_mode.png') });
    console.log('Forgot password mode active:', forgotBtn);

    // Click "Back to sign in"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const back = btns.find(b => b.innerText.includes('Back to sign in'));
      if (back) back.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Click "Sign up" toggle
    console.log('\n--- 3. TESTING SIGNUP PAGE ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const signupToggle = btns.find(b => b.innerText.includes('Sign up'));
      if (signupToggle) signupToggle.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_signup_page.png') });
    const signupTitle = await page.evaluate(() => document.querySelector('h2')?.innerText);
    console.log('Signup Page heading:', signupTitle);

    // Test signup validation with mismatched passwords
    await page.type('input[type="email"]', 'newowner@store.com');
    const passwordInputs = await page.$$('input[type="password"]');
    if (passwordInputs.length >= 2) {
      await passwordInputs[0].type('Secret1234');
      await passwordInputs[1].type('DifferentPassword');
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) await submitBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const mismatchError = await page.evaluate(() => {
        const el = document.querySelector('.bg-rose-50, .text-rose-600, .text-rose-700');
        return el ? el.innerText : 'No error';
      });
      console.log('Validation with mismatched passwords:', mismatchError);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_signup_mismatch_error.png') });
    }

    // Navigate to Customer Marketplace
    console.log('\n--- 4. TESTING HYPERLOCAL MARKETPLACE ---');
    await page.goto('http://localhost:3000/marketplace', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '07_marketplace_page.png') });
    
    // Check search input on Marketplace
    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type('Milk');
      await new Promise(r => setTimeout(r, 500));
      console.log('Typed "Milk" in marketplace search bar');
      await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_marketplace_searched.png') });
    }

    console.log('\nBrowser interaction sequence completed successfully!');

  } catch (err) {
    console.error('Interaction error:', err);
  } finally {
    await browser.close();
  }
}

runLiveBrowserInteractions();
