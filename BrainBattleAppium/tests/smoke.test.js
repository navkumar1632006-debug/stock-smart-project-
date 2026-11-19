import path from 'path';
import { mobileReporter } from '../utils/mobileExcelReporter.js';

describe('StockSmart AI: Mobile Android Smoke Test', () => {
  it('MOB-SMOKE-001: Should launch StockSmart Android App on emulator and capture launch screen', async () => {
    const startTime = Date.now();
    let status = 'PASS';
    let errorMessage = null;

    try {
      // 1. Wait for root decor view or application root to mount
      const rootApp = await $('android=new UiSelector().className("android.widget.FrameLayout")');
      await rootApp.waitForDisplayed({ timeout: 30000 });

      // 2. Capture screenshot of launched application
      const screenshotPath = path.resolve(process.cwd(), './reports/screenshots/smoke_launch_success.png');
      await browser.saveScreenshot(screenshotPath);
      console.log(`[Smoke Screenshot Saved]: ${screenshotPath}`);

      // 3. Confirm package matches StockSmart app
      const currentPackage = await browser.getCurrentPackage();
      console.log(`Current App Package: ${currentPackage}`);
      expect(currentPackage).toBe('com.anonymous.mobile');
    } catch (err) {
      status = 'FAIL';
      errorMessage = err.message;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      mobileReporter.recordTest({
        testId: 'MOB-SMOKE-001',
        category: 'Smoke',
        screen: 'SplashScreen / Root',
        scenario: 'Cold launch StockSmart app and verify package identity',
        expected: 'App launches to foreground and package matches com.anonymous.mobile',
        actual: status === 'PASS' ? 'App launched and screenshot captured' : errorMessage,
        status: status,
        duration: duration,
        error: errorMessage
      });
      await mobileReporter.generateReport('./reports/excel/Mobile_Appium_Test_Report.xlsx');
    }
  });
});
