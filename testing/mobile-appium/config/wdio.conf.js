import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const apkRelativePath = process.env.APK_PATH || '../../mobile/android/app/build/outputs/apk/debug/app-debug.apk';
const apkFullPath = path.resolve(process.cwd(), apkRelativePath);

export const config = {
  runner: 'local',
  port: parseInt(process.env.APPIUM_PORT || '4723', 10),
  specs: [
    './tests/**/*.test.js'
  ],
  exclude: [],
  maxInstances: 1,
  capabilities: [{
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Pixel_7',
    'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION || '14.0',
    'appium:app': apkFullPath,
    'appium:appPackage': process.env.APP_PACKAGE || 'com.stocksmart.app',
    'appium:appActivity': process.env.APP_ACTIVITY || 'com.stocksmart.app.MainActivity',
    'appium:noReset': false,
    'appium:fullReset': false,
    'appium:newCommandTimeout': 240,
    'appium:autoGrantPermissions': true,
    'appium:avd': process.env.AVD_NAME || 'Pixel_7',
    'appium:avdLaunchTimeout': 180000,
    'appium:avdReadyTimeout': 120000
  }],
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 20000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  services: [
    ['appium', {
      args: {
        relaxedSecurity: true
      },
      command: 'appium'
    }]
  ],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 300000
  },
  afterTest: async function (test, context, { error, result, duration, passed }) {
    if (error) {
      const timestamp = Date.now();
      const sanitizedTitle = test.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      const screenshotPath = path.resolve(process.cwd(), `./reports/screenshots/${sanitizedTitle}_${timestamp}.png`);
      try {
        await browser.saveScreenshot(screenshotPath);
        console.log(`[Screenshot Saved]: ${screenshotPath}`);
      } catch (e) {
        console.warn('Failed to capture failure screenshot:', e.message);
      }
    }
  }
};

export default config;
