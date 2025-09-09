const { chromium } = require('playwright');

async function testImageUrls() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log('🔗 Testing HostAway Image URLs');
    
    // Navigate to property page
    await page.goto('http://localhost:3000/property/271435');
    await page.waitForTimeout(3000);
    
    // Get all image URLs
    const imageUrls = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.map(img => ({
        src: img.src,
        alt: img.alt,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete
      }));
    });
    
    console.log('🖼️ Image loading status:');
    imageUrls.forEach((img, index) => {
      console.log(`${index + 1}. ${img.alt}`);
      console.log(`   URL: ${img.src}`);
      console.log(`   Complete: ${img.complete}, Size: ${img.naturalWidth}x${img.naturalHeight}`);
      console.log('');
    });
    
    // Check network failures
    const failedRequests = [];
    page.on('response', response => {
      if (response.url().includes('hostaway') && !response.ok()) {
        failedRequests.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // Reload to catch network events
    await page.reload();
    await page.waitForTimeout(5000);
    
    if (failedRequests.length > 0) {
      console.log('❌ Failed image requests:');
      failedRequests.forEach(req => {
        console.log(`   ${req.status} ${req.statusText}: ${req.url}`);
      });
    } else {
      console.log('✅ All image requests succeeded');
    }
    
    // Test direct image access
    console.log('🔍 Testing direct image access...');
    const firstImageUrl = imageUrls[0]?.src;
    if (firstImageUrl) {
      try {
        await page.goto(firstImageUrl);
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'direct-image-test.png' });
        console.log('✅ Direct image access successful');
      } catch (error) {
        console.log('❌ Direct image access failed:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

testImageUrls();