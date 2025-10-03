/**
 * Responsive Design Tests
 * Tests application layout and functionality across different screen sizes
 */

import { test, expect, devices } from '@playwright/test';
import path from 'path';

const testCSVPath = path.join(__dirname, 'fixtures', 'sample-invoices.csv');

// Define viewport sizes for testing
const viewports = [
  { name: 'Mobile Portrait', width: 375, height: 667 },
  { name: 'Mobile Landscape', width: 667, height: 375 },
  { name: 'Tablet Portrait', width: 768, height: 1024 },
  { name: 'Tablet Landscape', width: 1024, height: 768 },
  { name: 'Desktop Small', width: 1280, height: 720 },
  { name: 'Desktop Large', width: 1920, height: 1080 },
  { name: 'Ultra Wide', width: 2560, height: 1440 },
];

test.describe('Responsive Design Tests', () => {
  viewports.forEach(viewport => {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
      });

      test('should display navigation correctly', async ({ page }) => {
        if (viewport.width < 768) {
          // Mobile: should show hamburger menu
          await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
          
          // Click to open mobile menu
          await page.click('[data-testid="mobile-menu-button"]');
          await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
          
          // Test navigation items
          await expect(page.locator('text=儀表板')).toBeVisible();
          await expect(page.locator('text=檔案管理')).toBeVisible();
          await expect(page.locator('text=詳細分析')).toBeVisible();
        } else {
          // Desktop/Tablet: should show full navigation
          await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
          await expect(page.locator('text=儀表板')).toBeVisible();
          await expect(page.locator('text=檔案管理')).toBeVisible();
          await expect(page.locator('text=詳細分析')).toBeVisible();
        }
      });

      test('should display dashboard layout correctly', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('儀表板');
        
        // Statistics cards should be responsive
        const statsCards = page.locator('[data-testid="statistics-cards"]');
        await expect(statsCards).toBeVisible();
        
        if (viewport.width < 768) {
          // Mobile: cards should stack vertically
          const cardsLayout = await statsCards.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return styles.gridTemplateColumns;
          });
          expect(cardsLayout).toContain('1fr'); // Single column
        } else if (viewport.width < 1024) {
          // Tablet: 2 columns
          const cardsLayout = await statsCards.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return styles.gridTemplateColumns;
          });
          // Should have 2 columns
          expect(cardsLayout.split(' ')).toHaveLength(2);
        } else {
          // Desktop: 4 columns
          const cardsLayout = await statsCards.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return styles.gridTemplateColumns;
          });
          // Should have 4 columns
          expect(cardsLayout.split(' ')).toHaveLength(4);
        }
      });

      test('should display charts responsively', async ({ page }) => {
        // First upload some data
        await page.click('text=檔案管理');
        await page.setInputFiles('input[type="file"]', testCSVPath);
        await expect(page.locator('text=處理完成')).toBeVisible({ timeout: 10000 });
        
        // Navigate back to dashboard
        await page.click('text=儀表板');
        
        // Charts should be visible and responsive
        const chartsContainer = page.locator('[data-testid="charts-container"]');
        await expect(chartsContainer).toBeVisible();
        
        if (viewport.width < 1024) {
          // Mobile/Tablet: charts should stack vertically
          const chartsLayout = await chartsContainer.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return styles.gridTemplateColumns;
          });
          expect(chartsLayout).toContain('1fr'); // Single column
        } else {
          // Desktop: charts should be side by side
          const chartsLayout = await chartsContainer.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return styles.gridTemplateColumns;
          });
          expect(chartsLayout.split(' ')).toHaveLength(2); // Two columns
        }
        
        // Charts should maintain aspect ratio
        const canvas = page.locator('canvas').first();
        const canvasSize = await canvas.boundingBox();
        expect(canvasSize).toBeTruthy();
        expect(canvasSize!.width).toBeGreaterThan(0);
        expect(canvasSize!.height).toBeGreaterThan(0);
      });

      test('should handle file upload area responsively', async ({ page }) => {
        await page.click('text=檔案管理');
        
        const uploadArea = page.locator('[data-testid="file-upload-area"]');
        await expect(uploadArea).toBeVisible();
        
        // Upload area should be appropriately sized
        const uploadSize = await uploadArea.boundingBox();
        expect(uploadSize).toBeTruthy();
        
        if (viewport.width < 768) {
          // Mobile: should take full width with appropriate padding
          expect(uploadSize!.width).toBeGreaterThan(viewport.width * 0.8);
        } else {
          // Desktop: should have reasonable max width
          expect(uploadSize!.width).toBeLessThan(viewport.width);
        }
      });

      test('should display data table responsively', async ({ page }) => {
        // Upload data first
        await page.click('text=檔案管理');
        await page.setInputFiles('input[type="file"]', testCSVPath);
        await expect(page.locator('text=處理完成')).toBeVisible({ timeout: 10000 });
        
        // Navigate to analytics
        await page.click('text=詳細分析');
        
        const dataTable = page.locator('[data-testid="data-table"]');
        await expect(dataTable).toBeVisible();
        
        if (viewport.width < 768) {
          // Mobile: should show horizontal scroll or card layout
          const tableContainer = page.locator('[data-testid="table-container"]');
          const hasScroll = await tableContainer.evaluate(el => {
            return el.scrollWidth > el.clientWidth;
          });
          
          // Either has horizontal scroll or uses card layout
          expect(hasScroll || await page.locator('[data-testid="card-layout"]').isVisible()).toBeTruthy();
        } else {
          // Desktop: should show full table
          await expect(page.locator('th')).toHaveCount(5); // All columns visible
        }
      });

      test('should handle filter panel responsively', async ({ page }) => {
        await page.click('text=詳細分析');
        
        const filterPanel = page.locator('[data-testid="filter-panel"]');
        await expect(filterPanel).toBeVisible();
        
        if (viewport.width < 768) {
          // Mobile: filters might be collapsible
          const isCollapsible = await page.locator('[data-testid="filter-toggle"]').isVisible();
          if (isCollapsible) {
            await page.click('[data-testid="filter-toggle"]');
            await expect(page.locator('[data-testid="filter-content"]')).toBeVisible();
          }
        }
        
        // Filter inputs should be appropriately sized
        const dateInput = page.locator('[data-testid="date-filter"]').first();
        if (await dateInput.isVisible()) {
          const inputSize = await dateInput.boundingBox();
          expect(inputSize).toBeTruthy();
          expect(inputSize!.width).toBeGreaterThan(100); // Minimum usable width
        }
      });

      test('should maintain touch targets on mobile', async ({ page }) => {
        if (viewport.width < 768) {
          // Test that buttons are large enough for touch
          const buttons = await page.locator('button').all();
          
          for (const button of buttons.slice(0, 5)) { // Test first 5 buttons
            if (await button.isVisible()) {
              const buttonSize = await button.boundingBox();
              if (buttonSize) {
                // Touch targets should be at least 44px (iOS) or 48px (Android)
                expect(Math.min(buttonSize.width, buttonSize.height)).toBeGreaterThanOrEqual(44);
              }
            }
          }
        }
      });

      test('should handle text scaling', async ({ page }) => {
        // Test with different text scaling
        await page.addStyleTag({
          content: `
            html { font-size: 18px; } /* Larger base font size */
          `
        });
        
        // Content should still be readable and accessible
        await expect(page.locator('h1')).toBeVisible();
        
        // Navigation should still work
        await page.click('text=檔案管理');
        await expect(page.locator('h1')).toContainText('檔案管理');
        
        // Reset font size
        await page.addStyleTag({
          content: `
            html { font-size: 16px; }
          `
        });
      });

      test('should handle orientation changes on mobile', async ({ page }) => {
        if (viewport.width < 768) {
          // Test portrait orientation
          await page.setViewportSize({ width: 375, height: 667 });
          await expect(page.locator('h1')).toBeVisible();
          
          // Test landscape orientation
          await page.setViewportSize({ width: 667, height: 375 });
          await expect(page.locator('h1')).toBeVisible();
          
          // Navigation should still work in landscape
          await page.click('text=檔案管理');
          await expect(page.locator('h1')).toContainText('檔案管理');
        }
      });

      test('should maintain performance across viewport sizes', async ({ page }) => {
        const startTime = Date.now();
        
        // Navigate through different pages
        await page.click('text=檔案管理');
        await page.click('text=詳細分析');
        await page.click('text=儀表板');
        
        const navigationTime = Date.now() - startTime;
        
        // Navigation should be fast regardless of viewport size
        expect(navigationTime).toBeLessThan(2000);
      });
    });
  });

  test.describe('Extreme Viewport Tests', () => {
    test('should handle very small screens', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 }); // iPhone 5
      await page.goto('/');
      
      // Content should still be accessible
      await expect(page.locator('h1')).toBeVisible();
      
      // Navigation should work
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    });

    test('should handle very large screens', async ({ page }) => {
      await page.setViewportSize({ width: 3840, height: 2160 }); // 4K
      await page.goto('/');
      
      // Content should not be stretched too wide
      const mainContent = page.locator('main');
      const contentWidth = await mainContent.evaluate(el => el.offsetWidth);
      
      // Should have reasonable max-width
      expect(contentWidth).toBeLessThan(2000);
    });

    test('should handle unusual aspect ratios', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 500 }); // Very wide
      await page.goto('/');
      
      // Content should still be readable
      await expect(page.locator('h1')).toBeVisible();
      
      // Test very tall
      await page.setViewportSize({ width: 500, height: 1920 });
      await expect(page.locator('h1')).toBeVisible();
    });
  });
});