import { createDriver } from '../utils/driverFactory.js';
import { LoginPage } from '../pages/LoginPage.js';

async function testSessionInjection() {
  const driver = await createDriver();
  try {
    const loginPage = new LoginPage(driver);
    await loginPage.open();

    const mockSession = {
      access_token: 'fake-jwt-token-for-e2e',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'fake-refresh-token',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'owner@stocksmart.test',
        email_confirmed_at: new Date().toISOString(),
        user_metadata: { store_name: 'StockSmart Test Kirana', role: 'Owner' }
      }
    };

    const sessionStr = JSON.stringify(mockSession);
    await driver.executeScript((tokenData) => {
      localStorage.setItem('sb-dsshzxopmfxzzihhiopi-auth-token', tokenData);
    }, sessionStr);

    await driver.navigate().refresh();
    await driver.sleep(2500);

    const pageText = await driver.executeScript('return document.body.innerText;');
    console.log('--- Page text after session injection ---');
    console.log(pageText.substring(0, 400));
  } finally {
    await driver.quit();
  }
}

testSessionInjection().catch(console.error);
