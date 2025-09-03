const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to property page...');
    await page.goto('http://localhost:3007/property/271429', { waitUntil: 'networkidle', timeout: 20000 });
    
    // Wait for the content to load
    console.log('Waiting for content to load...');
    await page.waitForSelector('h1', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    console.log('Taking full page screenshot...');
    await page.screenshot({ 
      path: 'property-page-full.png', 
      fullPage: true 
    });
    
    console.log('Taking viewport screenshot...');
    await page.screenshot({ 
      path: 'property-page-viewport.png'
    });
    
    console.log('Taking Book Directly section screenshot...');
    const bookDirectlySection = await page.$('[class*="space-y-4"]');
    if (bookDirectlySection) {
      await bookDirectlySection.screenshot({ path: 'book-directly-section.png' });
    }
    
    // Get page title and basic info
    const title = await page.title();
    console.log('Page title:', title);
    
    // Get main content structure
    const mainContent = await page.$eval('body', (body) => {
      const getElementInfo = (element) => {
        if (!element) return null;
        
        return {
          tagName: element.tagName.toLowerCase(),
          classes: Array.from(element.classList),
          text: element.textContent?.slice(0, 100) + (element.textContent?.length > 100 ? '...' : ''),
          children: Array.from(element.children).map(child => ({
            tagName: child.tagName.toLowerCase(),
            classes: Array.from(child.classList),
            id: child.id
          }))
        };
      };
      
      return {
        structure: getElementInfo(body),
        forms: Array.from(document.querySelectorAll('form')).map(form => ({
          action: form.action,
          method: form.method,
          inputs: Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
            type: input.type,
            name: input.name,
            placeholder: input.placeholder,
            value: input.value
          }))
        })),
        buttons: Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          classes: Array.from(btn.classList)
        })),
        links: Array.from(document.querySelectorAll('a')).map(link => ({
          href: link.href,
          text: link.textContent?.trim()
        }))
      };
    });
    
    console.log('\n=== PAGE ANALYSIS ===');
    console.log('Title:', title);
    console.log('\nForm Information:');
    mainContent.forms.forEach((form, i) => {
      console.log(`Form ${i + 1}:`, form);
    });
    
    console.log('\nButtons:');
    mainContent.buttons.forEach((btn, i) => {
      console.log(`Button ${i + 1}:`, btn.text, btn.classes);
    });
    
    console.log('\nLinks:');
    mainContent.links.slice(0, 10).forEach((link, i) => {
      console.log(`Link ${i + 1}:`, link.text, '→', link.href);
    });
    
    console.log('\nScreenshots saved as property-page-full.png, property-page-viewport.png, and book-directly-section.png');
    
    // Keep browser open for manual inspection
    console.log('\nBrowser will stay open for manual inspection. Press Ctrl+C to close.');
    await page.waitForTimeout(30000); // Keep open for 30 seconds
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();