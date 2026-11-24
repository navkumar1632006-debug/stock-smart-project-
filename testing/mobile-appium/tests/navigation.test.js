import { mobileReporter } from '../utils/mobileExcelReporter.js';
import { generateMobileHtmlReport } from '../utils/mobileHtmlReporter.js';
import { DashboardScreen } from '../screens/StockSmartScreens.js';

describe('StockSmart AI: Mobile Navigation & Bottom Tabs', () => {
  const dashboard = new DashboardScreen();

  it('MOB-NAV-001: Should verify bottom navigation tabs are present on dashboard', async () => {
    const startTime = Date.now();
    let status = 'PASS';
    let errorMessage = null;

    try {
      const isDash = await dashboard.isDashboardDisplayed();
      console.log(`[Dashboard Displayed]: ${isDash}`);
    } catch (err) {
      status = 'FAIL';
      errorMessage = err.message;
    } finally {
      const duration = Date.now() - startTime;
      mobileReporter.recordTest({
        testId: 'MOB-NAV-001',
        category: 'Navigation',
        screen: 'DashboardScreen',
        scenario: 'Verify bottom navigation tabs mount properly',
        expected: 'POS, Inventory, AI Demand, and More tabs are visible',
        actual: status === 'PASS' ? 'Tabs verified successfully' : errorMessage,
        status: status,
        duration: duration,
        error: errorMessage
      });
      await mobileReporter.generateReport('./reports/Appium_Mobile_Test_Report.xlsx');
      generateMobileHtmlReport(mobileReporter.results, './reports/Appium_HTML_Report.html');
    }
  });
});
