import fs from 'fs';
import path from 'path';
import config from '../config/selenium.config.js';

export async function takeScreenshot(driver, testName) {
  try {
    if (!fs.existsSync(config.paths.screenshots)) {
      fs.mkdirSync(config.paths.screenshots, { recursive: true });
    }

    const sanitized = testName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
    const fileName = `${sanitized}_${Date.now()}.png`;
    const filePath = path.join(config.paths.screenshots, fileName);

    const image = await driver.takeScreenshot();
    fs.writeFileSync(filePath, image, 'base64');
    return fileName;
  } catch (err) {
    console.warn(`[Screenshot Error]: Failed to capture screenshot for "${testName}":`, err.message);
    return null;
  }
}

export default { takeScreenshot };
