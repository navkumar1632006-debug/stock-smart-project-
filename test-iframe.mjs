import puppeteer from 'puppeteer';
import http from 'http';

const html = `
<!DOCTYPE html>
<html>
<body>
  <h1>Outer Frame</h1>
  <iframe src="http://localhost:3000" width="800" height="600" id="preview"></iframe>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(4000, async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.error('BROWSER ERROR:', error.message));
  
  await page.goto('http://localhost:4000', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const frame = page.frames().find(f => f.url().includes('localhost:3000'));
  if (frame) {
    const frameHtml = await frame.evaluate(() => document.body.innerHTML);
    console.log('FRAME HTML:', frameHtml.substring(0, 500));
  } else {
    console.log('No iframe found!');
  }
  
  await browser.close();
  server.close();
});
