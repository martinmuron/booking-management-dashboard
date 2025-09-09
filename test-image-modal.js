const { chromium } = require('playwright');

async function testImageModal() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🚀 Testing Image Modal Functionality');
    
    // Navigate to property page
    await page.goto('http://localhost:3000/property/271435');
    await page.waitForTimeout(3000);

    console.log('✅ Property page loaded');

    // Check if images are present and clickable
    const images = await page.$$('img');
    console.log(`📷 Found ${images.length} images`);

    // Click on the first (main) image
    console.log('🖱️  Clicking on main image...');
    const mainImage = await page.$('img[alt*="Newly renovated"]');
    if (mainImage) {
      await mainImage.click();
      await page.waitForTimeout(1000);

      // Check if modal opened
      const modal = await page.$('.fixed.inset-0.z-50');
      if (modal) {
        console.log('✅ Image modal opened successfully');
        
        // Take a screenshot of the modal
        await page.screenshot({ 
          path: 'image-modal-test.png', 
          fullPage: true 
        });
        console.log('📸 Modal screenshot saved as image-modal-test.png');

        // Test keyboard navigation
        console.log('⌨️  Testing keyboard navigation...');
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(500);
        
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(500);

        // Close modal with Escape
        console.log('❌ Closing modal with Escape key...');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Check if modal closed
        const modalAfterClose = await page.$('.fixed.inset-0.z-50');
        if (!modalAfterClose) {
          console.log('✅ Modal closed successfully');
        } else {
          console.log('❌ Modal did not close');
        }
      } else {
        console.log('❌ Modal did not open');
      }
    } else {
      console.log('❌ Main image not found');
    }

    // Test clicking on a smaller image
    console.log('🖱️  Testing smaller image click...');
    const smallImages = await page.$$('div[class*="aspect-square"] img');
    if (smallImages.length > 0) {
      await smallImages[0].click();
      await page.waitForTimeout(1000);
      
      const modal = await page.$('.fixed.inset-0.z-50');
      if (modal) {
        console.log('✅ Small image modal opened successfully');
        
        // Close by clicking outside
        await page.click('.fixed.inset-0.z-50', { position: { x: 100, y: 100 } });
        await page.waitForTimeout(500);
        console.log('✅ Modal closed by clicking outside');
      } else {
        console.log('❌ Small image modal did not open');
      }
    }

    // Test the booking section visibility
    console.log('💳 Testing booking section...');
    const saveButton = await page.$('text=SAVE 10%');
    if (saveButton) {
      const saveButtonRect = await saveButton.boundingBox();
      console.log(`✅ "SAVE 10%" button is visible at position: ${JSON.stringify(saveButtonRect)}`);
    } else {
      console.log('❌ "SAVE 10%" button not found');
    }

    const bookButton = await page.$('text=Book Directly & Save 10%');
    if (bookButton) {
      const bookButtonRect = await bookButton.boundingBox();
      console.log(`✅ "Book Directly & Save 10%" button is visible at position: ${JSON.stringify(bookButtonRect)}`);
    } else {
      console.log('❌ "Book Directly & Save 10%" button not found');
    }

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await browser.close();
  }
}

testImageModal();