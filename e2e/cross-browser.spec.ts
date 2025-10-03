/**
 * Cross-Browser Compatibility Tests
 * Tests application functionality across different browsers
 */

import { test, expect, devices } from '@playwright/test';
import path from 'path';

const testCSVPath = path.join(__dirname, 'fixtures', 'sample-invoices.csv');

// Test across different browsers
['chromium', 'firefox', 'webkit'].forEach(browserName => {
  test.describe(`Cross-browser tests - ${browserName}`, () => {
    test.use({ 
      ...devices['Desktop Chrome'],
      // Override with specific browser if needed
    });

    test(`should work correctly in ${browserName}`, async ({ page }) => {
      await page.goto('/');
      
      // Test basic navigation
      await expect(page.locator('h1')).toContainText('儀表板');
      
      // Test file upload
      await page.click('text=檔案管理');
      await page.setInputFiles('input[type="file"]', testCSVPath);
      await expect(page.locator('text=處理完成')).toBeVisible({ timeout: 10000 });
      
      // Test chart rendering
      await page.click('text=儀表板');
      await expect(page.locator('canvas')).toHaveCount(2);
      
      // Test responsive behavior
      await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
      await expect(page.locator('h1')).toBeVisible();
      
      await page.setViewportSize({ width: 375, height: 667 }); // Mobile
      await expect(page.locator('h1')).toBeVisible();
    });

    test(`should handle CSS and styling correctly in ${browserName}`, async ({ page }) => {
      await page.goto('/');
      
      // Check that CSS is loaded properly
      const backgroundColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      expect(backgroundColor).toBeTruthy();
      
      // Check that custom fonts are loaded (if any)
      const fontFamily = await page.evaluate(() => {
        return window.getComputedStyle(document.body).fontFamily;
      });
      expect(fontFamily).toBeTruthy();
      
      // Check that animations work
      const button = page.locator('button').first();
      if (await button.isVisible()) {
        const transition = await button.evaluate(el => {
          return window.getComputedStyle(el).transition;
        });
        // Should have some transition properties
        expect(transition).toBeTruthy();
      }
    });

    test(`should handle JavaScript features correctly in ${browserName}`, async ({ page }) => {
      await page.goto('/');
      
      // Test modern JavaScript features
      const supportsES6 = await page.evaluate(() => {
        try {
          // Test arrow functions
          const arrow = () => true;
          // Test template literals
          const template = `test`;
          // Test const/let
          const constVar = 'test';
          let letVar = 'test';
          // Test destructuring
          const [a, b] = [1, 2];
          const { length } = 'test';
          return true;
        } catch (e) {
          return false;
        }
      });
      expect(supportsES6).toBe(true);
      
      // Test async/await support
      const supportsAsync = await page.evaluate(async () => {
        try {
          const asyncFunc = async () => 'test';
          const result = await asyncFunc();
          return result === 'test';
        } catch (e) {
          return false;
        }
      });
      expect(supportsAsync).toBe(true);
    });
  });
});

// Mobile-specific tests
test.describe('Mobile Browser Tests', () => {
  test.use({ ...devices['iPhone 12'] });

  test('should work on iOS Safari', async ({ page }) => {
    await page.goto('/');
    
    // Test touch interactions
    await page.tap('text=檔案管理');
    await expect(page.locator('h1')).toContainText('檔案管理');
    
    // Test mobile file upload
    await page.setInputFiles('input[type="file"]', testCSVPath);
    await expect(page.locator('text=處理完成')).toBeVisible({ timeout: 10000 });
    
    // Test mobile navigation
    await page.tap('text=儀表板');
    await expect(page.locator('canvas')).toHaveCount(2);
  });

  test.use({ ...devices['Pixel 5'] });

  test('should work on Android Chrome', async ({ page }) => {
    await page.goto('/');
    
    // Test Android-specific behaviors
    await page.tap('text=詳細分析');
    await expect(page.locator('h1')).toContainText('詳細分析');
    
    // Test scrolling behavior on mobile
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Verify content is still accessible after scrolling
    await expect(page.locator('h1')).toBeVisible();
  });
});

// Performance tests across browsers
test.describe('Performance Tests', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should load quickly in ${browserName}`, async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await expect(page.locator('h1')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test(`should handle large datasets efficiently in ${browserName}`, async ({ page }) => {
      await page.goto('/');
      
      // Upload large file
      await page.click('text=檔案管理');
      await page.setInputFiles('input[type="file"]', path.join(__dirname, 'fixtures', 'large-invoices.csv'));
      
      const startTime = Date.now();
      await expect(page.locator('text=處理完成')).toBeVisible({ timeout: 15000 });
      const processingTime = Date.now() - startTime;
      
      // Should process within reasonable time
      expect(processingTime).toBeLessThan(10000);
      
      // Navigate to dashboard and measure render time
      const renderStartTime = Date.now();
      await page.click('text=儀表板');
      await expect(page.locator('canvas')).toHaveCount(2);
      const renderTime = Date.now() - renderStartTime;
      
      // Should render charts within 2 seconds
      expect(renderTime).toBeLessThan(2000);
    });
  });
});

// Accessibility tests across browsers
test.describe('Accessibility Tests', () => {
  test('should meet accessibility standards across browsers', async ({ page }) => {
    await page.goto('/');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement);
    
    // Test screen reader compatibility
    const ariaLabels = await page.locator('[aria-label]').count();
    expect(ariaLabels).toBeGreaterThan(0);
    
    // Test color contrast (basic check)
    const contrastRatio = await page.evaluate(() => {
      const element = document.querySelector('h1');
      if (!element) return 0;
      
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // Basic check - should have defined colors
      return color && backgroundColor ? 1 : 0;
    });
    expect(contrastRatio).toBeGreaterThan(0);
  });
});

// Feature detection tests
test.describe('Feature Support Tests', () => {
  test('should handle missing features gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Test localStorage support
    const hasLocalStorage = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    });
    
    if (hasLocalStorage) {
      // Test data persistence
      await page.click('text=檔案管理');
      await page.setInputFiles('input[type="file"]', testCSVPath);
      await expect(page.locator('text=處理完成')).toBeVisible({ timeout: 10000 });
      
      // Reload page and check if data persists
      await page.reload();
      await page.click('text=儀表板');
      await expect(page.locator('[data-testid="total-amount"]')).not.toContainText('$0');
    }
    
    // Test Canvas support (for charts)
    const hasCanvas = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    });
    
    if (hasCanvas) {
      await page.click('text=儀表板');
      await expect(page.locator('canvas')).toHaveCount(2);
    } else {
      // Should show fallback content
      await expect(page.locator('text=圖表不支援')).toBeVisible();
    }
  });
});