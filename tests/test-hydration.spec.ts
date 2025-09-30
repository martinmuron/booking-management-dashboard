import { test, expect } from '@playwright/test';

test('check for hydration errors on check-in page', async ({ page, browser }) => {
  test.setTimeout(60000);

  // First, get the server-rendered HTML
  const context1 = await browser.newContext({ javaScriptEnabled: false });
  const page1 = await context1.newPage();
  await page1.goto('http://localhost:3000/checkin/AV4BQJ7AKS');
  const serverHTML = await page1.content();
  await context1.close();

  console.log('\n=== Server HTML Sample ===');
  // Extract key parts
  const checkInDateMatch = serverHTML.match(/Check-in: ([^<]+)</);
  const checkInTimeMatch = serverHTML.match(/at ([0-9:]+\s*[AP]M)/);
  console.log('Server check-in date:', checkInDateMatch ? checkInDateMatch[1] : 'NOT FOUND');
  console.log('Server check-in time:', checkInTimeMatch ? checkInTimeMatch[1] : 'NOT FOUND');

  // Now test with JavaScript enabled
  const errors: string[] = [];
  const consoleLogs: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  console.log('\nNavigating to LOCAL check-in page with JS...');
  await page.goto('http://localhost:3000/checkin/AV4BQJ7AKS', { waitUntil: 'domcontentloaded' });

  await page.waitForTimeout(3000);

  console.log('\n=== Errors Found ===');
  if (errors.length > 0) {
    errors.forEach(err => console.log(err));
  } else {
    console.log('No errors found!');
  }

  const hydrationErrors = errors.filter(e => e.includes('185') || e.includes('hydration') || e.includes('Minified React'));
  if (hydrationErrors.length > 0) {
    console.log('\n❌ HYDRATION ERRORS DETECTED');
  } else {
    console.log('\n✅ No hydration errors detected');
  }
});
