const { chromium } = require('playwright');

async function analyzePropertyPage() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Go directly to a known property page
    const propertyUrl = '/property/271435'; // Using a known property ID
    console.log(`Going to property URL: ${propertyUrl}`);

    // Navigate to the property page
    await page.goto(`http://localhost:3000${propertyUrl}`);
    await page.waitForTimeout(3000);

    console.log('=== ANALYZING PROPERTY PAGE ===');

    // Take a screenshot
    await page.screenshot({ 
      path: 'property-page-analysis.png', 
      fullPage: true 
    });
    console.log('📸 Full page screenshot saved as property-page-analysis.png');

    // Check for images in the property page
    const images = await page.$$('img');
    console.log(`\n🖼️  Found ${images.length} images on the page`);

    // Check if images are clickable
    for (let i = 0; i < Math.min(images.length, 5); i++) {
      const img = images[i];
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');
      const isClickable = await img.evaluate(el => {
        const parent = el.parentElement;
        return parent.tagName === 'A' || parent.tagName === 'BUTTON' || 
               el.style.cursor === 'pointer' || 
               parent.style.cursor === 'pointer' ||
               el.onclick !== null ||
               parent.onclick !== null;
      });
      
      console.log(`  Image ${i + 1}: ${alt || 'No alt'} - Clickable: ${isClickable}`);
      console.log(`    Src: ${src?.substring(0, 80)}...`);
    }

    // Look for the booking section
    console.log('\n📝 ANALYZING BOOKING SECTION:');
    
    // Look for "Book your stay" text
    const bookingSection = await page.$('text=Book your stay');
    if (bookingSection) {
      console.log('✅ Found "Book your stay" section');
      
      // Take a screenshot of just the booking section
      const bookingBox = await bookingSection.boundingBox();
      if (bookingBox) {
        await page.screenshot({ 
          path: 'booking-section.png',
          clip: {
            x: bookingBox.x - 50,
            y: bookingBox.y - 50, 
            width: Math.min(bookingBox.width + 100, 800),
            height: Math.min(bookingBox.height + 200, 600)
          }
        });
        console.log('📸 Booking section screenshot saved as booking-section.png');
      }
    } else {
      console.log('❌ "Book your stay" section not found');
    }

    // Look for "Book directly and save 10%" text
    const directBookText = await page.$('text=Book directly and save 10%');
    if (directBookText) {
      console.log('✅ Found "Book directly and save 10%" text');
    } else {
      console.log('❌ "Book directly and save 10%" text not found');
    }

    // Look for buttons in the booking area
    const buttons = await page.$$('button');
    console.log(`\n🔘 Found ${buttons.length} buttons on the page`);
    
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const button = buttons[i];
      const text = await button.textContent();
      const classes = await button.getAttribute('class');
      const styles = await button.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          zIndex: computed.zIndex,
          position: computed.position
        };
      });
      
      console.log(`  Button ${i + 1}: "${text?.trim()}" - Classes: ${classes}`);
      console.log(`    Styles: bg=${styles.backgroundColor}, color=${styles.color}, z-index=${styles.zIndex}`);
    }

    // Check for overlapping elements
    console.log('\n🔍 CHECKING FOR ELEMENT OVERLAPS:');
    const elementsWithRed = await page.$$('[class*="red"], [class*="danger"], [class*="error"], [class*="warning"]');
    console.log(`Found ${elementsWithRed.length} elements with red/danger/warning classes`);

    const elementsWithGreen = await page.$$('[class*="green"], [class*="success"]');
    console.log(`Found ${elementsWithGreen.length} elements with green/success classes`);

    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('Error analyzing property page:', error);
  } finally {
    await browser.close();
  }
}

analyzePropertyPage();