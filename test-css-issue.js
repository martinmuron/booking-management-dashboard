const { chromium } = require('playwright');

async function testCssIssue() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log('🎨 Testing CSS Issues');
    
    // Navigate to property page
    await page.goto('http://localhost:3000/property/271435');
    await page.waitForTimeout(3000);
    
    // Check computed styles of the main image
    const mainImageStyles = await page.evaluate(() => {
      const mainImage = document.querySelector('img');
      if (mainImage) {
        const computedStyle = window.getComputedStyle(mainImage);
        return {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          zIndex: computedStyle.zIndex,
          position: computedStyle.position,
          width: computedStyle.width,
          height: computedStyle.height,
          objectFit: computedStyle.objectFit,
          backgroundColor: computedStyle.backgroundColor,
          src: mainImage.src,
          naturalWidth: mainImage.naturalWidth,
          naturalHeight: mainImage.naturalHeight,
          clientWidth: mainImage.clientWidth,
          clientHeight: mainImage.clientHeight
        };
      }
      return null;
    });
    
    console.log('🖼️ Main image computed styles:', mainImageStyles);
    
    // Check parent container styles
    const containerStyles = await page.evaluate(() => {
      const container = document.querySelector('.aspect-video');
      if (container) {
        const computedStyle = window.getComputedStyle(container);
        return {
          display: computedStyle.display,
          width: computedStyle.width,
          height: computedStyle.height,
          backgroundColor: computedStyle.backgroundColor,
          overflow: computedStyle.overflow,
          position: computedStyle.position
        };
      }
      return null;
    });
    
    console.log('📦 Container computed styles:', containerStyles);
    
    // Check if any overlay elements are blocking the image
    const overlayInfo = await page.evaluate(() => {
      const container = document.querySelector('.aspect-video');
      if (container) {
        const overlays = container.querySelectorAll('[class*="absolute"], [class*="inset"]');
        return Array.from(overlays).map(overlay => ({
          className: overlay.className,
          styles: {
            position: window.getComputedStyle(overlay).position,
            zIndex: window.getComputedStyle(overlay).zIndex,
            backgroundColor: window.getComputedStyle(overlay).backgroundColor,
            opacity: window.getComputedStyle(overlay).opacity
          }
        }));
      }
      return [];
    });
    
    console.log('🔍 Overlay elements:', overlayInfo);
    
    // Try to temporarily remove any potential blocking elements
    await page.evaluate(() => {
      // Remove all overlay elements temporarily
      const overlays = document.querySelectorAll('[class*="absolute"], [class*="inset"], [class*="overlay"]');
      overlays.forEach(overlay => overlay.style.display = 'none');
    });
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'property-without-overlays.png' });
    console.log('📸 Screenshot without overlays saved');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

testCssIssue();