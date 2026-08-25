import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.error('BROWSER ERROR:', error.message));
  
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log('ROOT HTML:', await page.evaluate(() => document.getElementById('root').innerHTML.substring(0, 500)));
  
  await browser.close();
})();
