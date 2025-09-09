const { chromium } = require('playwright');

async function testNewLogo() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🔍 Testing New Logo Design');
    
    // Test Homepage
    console.log('📄 Testing Homepage...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'homepage-new-logo.png', 
      clip: { x: 0, y: 0, width: 800, height: 150 }
    });
    console.log('📸 Homepage header screenshot saved');

    // Test About Page
    console.log('📄 Testing About Page...');
    await page.goto('http://localhost:3000/about');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'about-new-logo.png', 
      clip: { x: 0, y: 0, width: 800, height: 150 }
    });
    console.log('📸 About page header screenshot saved');

    // Test Contact Page
    console.log('📄 Testing Contact Page...');
    await page.goto('http://localhost:3000/contact');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'contact-new-logo.png', 
      clip: { x: 0, y: 0, width: 800, height: 150 }
    });
    console.log('📸 Contact page header screenshot saved');

    // Test Property Page
    console.log('📄 Testing Property Page...');
    await page.goto('http://localhost:3000/property/271435');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'property-new-logo.png', 
      clip: { x: 0, y: 0, width: 800, height: 150 }
    });
    console.log('📸 Property page header screenshot saved');

    // Check logo text content
    const logoTexts = await page.$$eval('[class*="font-bold"]', elements => 
      elements
        .filter(el => el.textContent && el.textContent.includes('Nick & Jenny'))
        .map(el => el.textContent.trim())
    );
    
    console.log('📝 Logo texts found:', logoTexts);

    // Test footer logo
    console.log('🦶 Testing Footer...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'footer-new-logo.png', 
      clip: { x: 0, y: 700, width: 800, height: 200 }
    });
    console.log('📸 Footer screenshot saved');

    console.log('✅ All logo tests completed!');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await browser.close();
  }
}

testNewLogo();