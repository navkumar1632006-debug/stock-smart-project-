import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import config from '../config/selenium.config.js';

let driverInstance = null;

export async function createDriver() {
  const options = new chrome.Options();

  options.addArguments(
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1440,900',
    '--disable-extensions'
  );

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  await driver.manage().setTimeouts({
    implicit: 0,
    pageLoad: config.timeouts.pageLoad,
    script: config.timeouts.script
  });

  return driver;
}

export async function getDriver() {
  if (!driverInstance) {
    driverInstance = await createDriver();
  }
  return driverInstance;
}

export async function quitDriver() {
  if (driverInstance) {
    try {
      await driverInstance.quit();
    } catch (e) {
      // Driver might already be closed
    } finally {
      driverInstance = null;
    }
  }
}
