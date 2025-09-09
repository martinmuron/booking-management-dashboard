const { chromium } = require('playwright');

async function debugPropertyImages() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log('🐞 Debugging Property Page Images');
    
    // Navigate to property page
    await page.goto('http://localhost:3000/property/271435');
    await page.waitForTimeout(3000);
    
    // Check if property data loaded
    const propertyTitle = await page.textContent('h1');
    console.log('🏠 Property title:', propertyTitle);
    
    // Check image containers
    const imageContainers = await page.$$('.aspect-video, .aspect-square');
    console.log(`📦 Found ${imageContainers.length} image containers`);
    
    // Check actual images
    const images = await page.$$('img');
    console.log(`🖼️ Found ${images.length} img elements`);
    
    // Check if images have src attributes
    for (let i = 0; i < Math.min(images.length, 3); i++) {
      const src = await images[i].getAttribute('src');
      const alt = await images[i].getAttribute('alt');
      console.log(`📷 Image ${i + 1}: src=${src?.substring(0, 50)}..., alt="${alt}"`);
    }
    
    // Check for any error messages
    const errorElements = await page.$$('[class*="error"], .text-red');
    console.log(`❌ Found ${errorElements.length} error elements`);
    
    // Take screenshot of just the images section
    const imagesSection = await page.$('.py-8:has(.aspect-video)');
    if (imagesSection) {
      await imagesSection.screenshot({ path: 'property-images-section.png' });
      console.log('📸 Images section screenshot saved');
    }
    
    // Check console logs for errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        logs.push(`${msg.type()}: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      logs.push(`PAGE ERROR: ${error.message}`);
    });
    
    // Reload to catch console errors
    await page.reload();
    await page.waitForTimeout(3000);
    
    if (logs.length > 0) {
      console.log('🐛 Console errors/warnings:');
      logs.forEach(log => console.log('  ', log));
    } else {
      console.log('✅ No console errors found');
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await browser.close();
  }
}

debugPropertyImages();