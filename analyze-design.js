const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Take screenshot of homepage
  console.log('Capturing homepage...');
  await page.goto('https://www.nickandjenny.cz');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'homepage.png', fullPage: true });
  
  // Take screenshot of about page
  console.log('Capturing about page...');
  await page.goto('https://www.nickandjenny.cz/about');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'about-page.png', fullPage: true });
  
  // Take screenshot of contact page
  console.log('Capturing contact page...');
  await page.goto('https://www.nickandjenny.cz/contact');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'contact-page.png', fullPage: true });
  
  // Check if header exists on about page
  await page.goto('https://www.nickandjenny.cz/about');
  const headerExists = await page.locator('header').count();
  console.log(`Header exists on About page: ${headerExists > 0}`);
  
  // Check navigation links
  const aboutLink = await page.locator('text=About Us').count();
  const contactLink = await page.locator('text=Contact').count();
  console.log(`About Us link count: ${aboutLink}`);
  console.log(`Contact link count: ${contactLink}`);
  
  await browser.close();
  console.log('Screenshots saved: homepage.png, about-page.png, contact-page.png');
})();