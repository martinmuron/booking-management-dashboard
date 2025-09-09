const { chromium } = require('playwright');

async function testPropertyImages() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log('🖼️ Testing Property Page Images');
    
    // Navigate to property page
    await page.goto('http://localhost:3000/property/271435');
    await page.waitForTimeout(3000);
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: 'property-images-current.png', 
      fullPage: true 
    });
    console.log('📸 Current property page screenshot saved');
    
    // Check if images are present
    const images = await page.$$('img[alt*="renovated"], img[alt*="apartment"], img[alt*="bed"], img[src*="hostaway"]');
    console.log(`📷 Found ${images.length} property images`);
    
    if (images.length > 0) {
      // Try clicking the first image
      console.log('🖱️ Testing image click...');
      await images[0].click();
      await page.waitForTimeout(2000);
      
      // Check if modal opened
      const modal = await page.$('.fixed.inset-0, [role="dialog"], .modal');
      if (modal) {
        console.log('✅ Image modal opened successfully');
        await page.screenshot({ 
          path: 'property-image-modal.png', 
          fullPage: true 
        });
        console.log('📸 Modal screenshot saved');
      } else {
        console.log('❌ No modal detected after image click');
        
        // Check what images are actually clickable
        const clickableImages = await page.$$('img[style*="cursor: pointer"], img.cursor-pointer');
        console.log(`🖱️ Found ${clickableImages.length} clickable images`);
      }
    } else {
      console.log('❌ No property images found');
    }

    // Check if ImageModal component exists
    const imageModal = await page.$('[data-testid="image-modal"]');
    console.log(`📦 ImageModal component: ${imageModal ? 'Found' : 'Not found'}`);

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

testPropertyImages();