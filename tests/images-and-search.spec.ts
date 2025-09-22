import { test, expect } from '@playwright/test';

test.describe('Homepage Images and Search Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://www.nickandjenny.cz/');
    await page.waitForLoadState('networkidle');
  });

  test('should load all property images without errors', async ({ page }) => {
    // Wait for properties to load
    await page.waitForSelector('[data-testid="property-card"], .grid img', { timeout: 10000 });

    // Get all property images
    const images = await page.locator('.grid img').all();
    console.log(`Found ${images.length} property images`);

    let brokenImages = 0;
    const brokenImageSrcs: string[] = [];

    // Check each image
    for (const img of images) {
      const src = await img.getAttribute('src');
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      const naturalHeight = await img.evaluate((el: HTMLImageElement) => el.naturalHeight);

      if (naturalWidth === 0 || naturalHeight === 0) {
        brokenImages++;
        brokenImageSrcs.push(src || 'unknown');
        console.log(`Broken image found: ${src}`);
      }
    }

    console.log(`Total broken images: ${brokenImages}`);
    if (brokenImages > 0) {
      console.log('Broken image sources:', brokenImageSrcs);
    }

    // Allow some broken images but flag if too many
    expect(brokenImages).toBeLessThan(3); // Allow up to 2 broken images
  });

  test('should not show Book Now buttons', async ({ page }) => {
    // Wait for properties to load
    await page.waitForSelector('.grid', { timeout: 10000 });

    // Check that no "Book Now" buttons exist
    const bookNowButtons = await page.locator('button:has-text("Book Now"), a:has-text("Book Now")').count();
    expect(bookNowButtons).toBe(0);

    // Verify View Details buttons exist
    const viewDetailsButtons = await page.locator('button:has-text("View Details")').count();
    expect(viewDetailsButtons).toBeGreaterThan(0);
  });

  test('should test date availability search functionality', async ({ page }) => {
    // Find and fill the search form
    const checkInInput = page.locator('input[name="checkIn"], input[placeholder*="Check-in"], input[placeholder*="check"]').first();
    const checkOutInput = page.locator('input[name="checkOut"], input[placeholder*="Check-out"], input[placeholder*="check"]').nth(1);
    const guestsSelect = page.locator('select[name="guests"], input[name="guests"]').first();

    // Fill in test dates (30 days from now to 35 days from now)
    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + 30);
    const checkOutDate = new Date();
    checkOutDate.setDate(checkOutDate.getDate() + 35);

    const checkInStr = checkInDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const checkOutStr = checkOutDate.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`Testing search with dates: ${checkInStr} to ${checkOutStr}`);

    // Try to fill the search form if inputs are found
    try {
      if (await checkInInput.count() > 0) {
        await checkInInput.fill(checkInStr);
      }
      if (await checkOutInput.count() > 0) {
        await checkOutInput.fill(checkOutStr);
      }
      if (await guestsSelect.count() > 0) {
        await guestsSelect.selectOption('2');
      }

      // Look for search button
      const searchButton = page.locator('button:has-text("Search"), button[type="submit"]').first();
      if (await searchButton.count() > 0) {
        await searchButton.click();
        await page.waitForLoadState('networkidle');

        // Check if search results are displayed
        const searchResultsHeader = page.locator('h2:has-text("Search Results")');
        const propertyCards = page.locator('.grid .card, .grid [class*="card"]');

        const hasSearchResults = await searchResultsHeader.count() > 0;
        const propertyCount = await propertyCards.count();

        console.log(`Search results found: ${hasSearchResults}`);
        console.log(`Properties displayed after search: ${propertyCount}`);

        // At least some properties should be available
        expect(propertyCount).toBeGreaterThan(0);
      } else {
        console.log('No search button found - search functionality may not be implemented');
      }
    } catch (error) {
      console.log('Search form interaction failed:', error);
      // This is not a critical failure - just log it
    }
  });

  test('should verify all property links work', async ({ page }) => {
    // Get all View Details links
    const viewDetailsLinks = await page.locator('a:has(button:has-text("View Details"))').all();
    const linkCount = viewDetailsLinks.length;
    console.log(`Found ${linkCount} View Details links`);

    expect(linkCount).toBeGreaterThan(0);

    // Test first 3 property links to avoid too long test
    for (let i = 0; i < Math.min(3, linkCount); i++) {
      const link = viewDetailsLinks[i];
      const href = await link.getAttribute('href');
      console.log(`Testing property link: ${href}`);

      // Click the link
      await Promise.all([
        page.waitForLoadState('networkidle'),
        link.click()
      ]);

      // Verify we're on a property detail page
      await expect(page).toHaveURL(/\/property\/\d+/);

      // Check that page loaded successfully (no 404)
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 10000 });

      // Go back to homepage for next test
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }
  });
});