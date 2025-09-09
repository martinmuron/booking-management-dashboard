const { chromium } = require('playwright');

async function testAPIPerformance() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  // Capture network requests
  const apiCalls = [];
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      apiCalls.push({
        url: response.url(),
        status: response.status(),
        timing: Date.now()
      });
    }
  });

  try {
    console.log('🔍 Testing API Performance Issues');
    
    // Test direct API call
    console.log('\n📡 Testing direct API call...');
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3000/api/properties');
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️  API call took: ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success: ${data.success}`);
      console.log(`📦 Properties count: ${data.data?.length || 0}`);
    } else {
      console.log(`❌ Failed: ${response.statusText}`);
    }

    // Test homepage loading
    console.log('\n🏠 Testing Homepage Loading...');
    const pageStartTime = Date.now();
    
    await page.goto('http://localhost:3000');
    
    // Wait for properties to load or timeout after 10 seconds
    try {
      await page.waitForSelector('[data-testid="property-card"], .grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-8', { 
        timeout: 10000 
      });
      console.log('✅ Properties loaded successfully');
    } catch (error) {
      console.log('❌ Properties failed to load within 10 seconds');
      
      // Check if still loading
      const loadingElement = await page.$('text=Loading properties');
      if (loadingElement) {
        console.log('🔄 Still showing loading state');
      }
    }
    
    const pageEndTime = Date.now();
    console.log(`⏱️  Homepage loaded in: ${pageEndTime - pageStartTime}ms`);

    // Test property page loading  
    console.log('\n🏠 Testing Property Page Loading...');
    const propStartTime = Date.now();
    
    await page.goto('http://localhost:3000/property/271435');
    
    // Wait for property to load or timeout
    try {
      await page.waitForSelector('h1, .text-3xl.font-bold.text-black', { timeout: 15000 });
      console.log('✅ Property page loaded successfully');
    } catch (error) {
      console.log('❌ Property page failed to load within 15 seconds');
      
      // Check what's on the page
      const loadingElement = await page.$('text=Loading property details');
      if (loadingElement) {
        console.log('🔄 Still showing loading state');
      }
      
      const errorElement = await page.$('text=Property Not Found');
      if (errorElement) {
        console.log('❌ Property not found error');
      }
    }
    
    const propEndTime = Date.now();
    console.log(`⏱️  Property page loaded in: ${propEndTime - propStartTime}ms`);

    // Take a final screenshot of current state
    await page.screenshot({ 
      path: 'mobile-property-debug.png', 
      fullPage: true 
    });
    console.log('📸 Debug screenshot saved');

    // Print all API calls captured
    console.log('\n📡 API Calls Summary:');
    apiCalls.forEach((call, index) => {
      console.log(`  ${index + 1}. ${call.url} - ${call.status}`);
    });

    // Check for console errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(`CONSOLE ERROR: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', err => {
      logs.push(`PAGE ERROR: ${err.message}`);
    });
    
    if (logs.length > 0) {
      console.log('\n❌ Browser Errors:');
      logs.forEach(log => console.log('  ', log));
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

testAPIPerformance();