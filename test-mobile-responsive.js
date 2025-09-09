const { chromium } = require('playwright');

async function testMobileResponsive() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    // iPhone 12 Pro viewport
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();

  try {
    console.log('📱 Testing Mobile Responsiveness');
    console.log('📏 Viewport: 390x844 (iPhone 12 Pro)');
    
    // Test Homepage Mobile
    console.log('\n🏠 Testing Mobile Homepage...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'mobile-homepage-full.png', 
      fullPage: true 
    });
    console.log('📸 Full mobile homepage screenshot saved');

    // Check header on mobile
    await page.screenshot({ 
      path: 'mobile-homepage-header.png', 
      clip: { x: 0, y: 0, width: 390, height: 200 }
    });
    console.log('📸 Mobile header screenshot saved');

    // Check hero section on mobile
    await page.screenshot({ 
      path: 'mobile-homepage-hero.png', 
      clip: { x: 0, y: 100, width: 390, height: 400 }
    });
    console.log('📸 Mobile hero section screenshot saved');

    // Test scrolling and property grid on mobile
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'mobile-homepage-properties.png', 
      clip: { x: 0, y: 0, width: 390, height: 844 }
    });
    console.log('📸 Mobile properties section screenshot saved');

    // Test Property Page Mobile
    console.log('\n🏠 Testing Mobile Property Page...');
    
    // Try multiple property IDs to find one that works
    const propertyIds = ['271435', '271443', '271456', '271460'];
    let workingPropertyId = null;
    
    for (const id of propertyIds) {
      try {
        console.log(`🔍 Trying property ${id}...`);
        await page.goto(`http://localhost:3000/property/${id}`);
        await page.waitForTimeout(4000);
        
        // Check if we get a proper page (not error page)
        const errorElement = await page.$('text=Property Not Found');
        const internalError = await page.$('text=Internal Server Error');
        
        if (!errorElement && !internalError) {
          workingPropertyId = id;
          console.log(`✅ Property ${id} loaded successfully`);
          break;
        } else {
          console.log(`❌ Property ${id} failed to load`);
        }
      } catch (error) {
        console.log(`❌ Error loading property ${id}:`, error.message);
      }
    }

    if (workingPropertyId) {
      // Take full page screenshot
      await page.screenshot({ 
        path: 'mobile-property-full.png', 
        fullPage: true 
      });
      console.log('📸 Full mobile property page screenshot saved');

      // Test header
      await page.screenshot({ 
        path: 'mobile-property-header.png', 
        clip: { x: 0, y: 0, width: 390, height: 200 }
      });
      console.log('📸 Mobile property header screenshot saved');

      // Test image section
      await page.screenshot({ 
        path: 'mobile-property-images.png', 
        clip: { x: 0, y: 150, width: 390, height: 400 }
      });
      console.log('📸 Mobile property images section screenshot saved');

      // Test booking section - scroll to it
      await page.evaluate(() => window.scrollTo(0, 1000));
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'mobile-property-booking.png', 
        clip: { x: 0, y: 200, width: 390, height: 600 }
      });
      console.log('📸 Mobile property booking section screenshot saved');

      // Test image modal on mobile
      console.log('🖼️ Testing image modal on mobile...');
      await page.evaluate(() => window.scrollTo(0, 300));
      await page.waitForTimeout(1000);
      
      const mainImage = await page.$('img[alt*="renovated"], img[alt*="apartment"], img[alt*="bed"]');
      if (mainImage) {
        await mainImage.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: 'mobile-image-modal.png', 
          fullPage: true 
        });
        console.log('📸 Mobile image modal screenshot saved');
        
        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      } else {
        console.log('❌ Could not find main image to test modal');
      }

    } else {
      console.log('❌ No working property pages found');
      
      // Try to get more info about the property page issue
      await page.goto('http://localhost:3000/property/271435');
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: 'mobile-property-error.png', 
        fullPage: true 
      });
      console.log('📸 Mobile property error screenshot saved');
      
      // Check console errors
      const logs = [];
      page.on('console', msg => logs.push(msg.text()));
      page.on('pageerror', err => logs.push(`PAGE ERROR: ${err.message}`));
      
      await page.reload();
      await page.waitForTimeout(3000);
      
      console.log('📋 Browser console logs:');
      logs.forEach(log => console.log('  ', log));
    }

    // Test other pages on mobile
    console.log('\n📄 Testing About Page Mobile...');
    await page.goto('http://localhost:3000/about');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'mobile-about.png', 
      clip: { x: 0, y: 0, width: 390, height: 844 }
    });
    console.log('📸 Mobile about page screenshot saved');

    console.log('\n📄 Testing Contact Page Mobile...');
    await page.goto('http://localhost:3000/contact');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'mobile-contact.png', 
      clip: { x: 0, y: 0, width: 390, height: 844 }
    });
    console.log('📸 Mobile contact page screenshot saved');

    // Check if form is usable on mobile
    await page.screenshot({ 
      path: 'mobile-contact-form.png', 
      clip: { x: 0, y: 400, width: 390, height: 600 }
    });
    console.log('📸 Mobile contact form screenshot saved');

    console.log('\n✅ Mobile testing completed!');
    console.log('\n📋 Summary:');
    console.log(`  📱 Tested viewport: 390x844`);
    console.log(`  🏠 Homepage: Tested`);
    console.log(`  🏘️ Property page: ${workingPropertyId ? 'Working' : 'Issues found'}`);
    console.log(`  📄 About page: Tested`);
    console.log(`  📞 Contact page: Tested`);

  } catch (error) {
    console.error('❌ Error during mobile testing:', error);
  } finally {
    await browser.close();
  }
}

testMobileResponsive();