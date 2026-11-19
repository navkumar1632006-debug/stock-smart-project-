import fs from 'fs';
import path from 'path';
import config from '../config/selenium.config.js';

export async function takeScreenshot(driver, testName = 'test-failure') {
  try {
    const dir = config.paths.screenshotsDir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const sanitizedName = testName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const filename = `${sanitizedName}_${timestamp}.png`;
    const filePath = path.join(dir, filename);

    const image = await driver.takeScreenshot();
    fs.writeFileSync(filePath, image, 'base64');
    console.log(`[Screenshot Captured]: ${filePath}`);
    return filename;
  } catch (err) {
    console.error('[Screenshot Failed]:', err.message);
    return null;
  }
}
