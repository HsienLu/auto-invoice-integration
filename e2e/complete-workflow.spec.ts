/**
 * End-to-End Tests for Complete User Workflow
 * Tests the entire user journey from file upload to data analysis
 */

import { test, expect } from '@playwright/test';
import path from 'path';

// Test data file path
const testCSVPath = path.join(__dirname, 'fixtures', 'sample-invoices.csv');

test.describe('Complete Invoice Dashboard Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to load
    await expect(page.locator('h1')).toContainText('儀表板');
  });

  test('should complete full workflow from upload to analysis', async ({ page }) => {
    // Step 1: Navigate to file manager
    await page.click('text=檔案管理');
    await expect(page.locator('h1')).toContainText('檔案管理');

    // Step 2: Upload CSV file
    await page.setInputFiles('input[type="file"]', testCSVPath);
    
    // Wait for file processing to complete
    await expect(page.locator('text=處理完成')).toBeVisible({ timeout: 10000 });
    
    // Verify file appears in the list
    await expect(page.locator('text=sample-invoices.csv')).toBeVisible();

    // Step 3: Navigate to dashboard to see statistics
    await page.click('text=儀表板');
    await expect(page.locator('h1')).toContainText('儀表板');
    
    // Verify statistics cards are populated
    await expect(page.locator('[data-testid="total-amount"]')).not.toContainText('$0');
    await expect(page.locator('[data-testid="invoice-count"]')).not.toContainText('0');
    
    // Verify charts are rendered
    await expect(page.locator('canvas')).toHaveCount(2); // Time series and category charts

    // Step 4: Navigate to analytics for detailed analysis
    await page.click('text=詳細分析');
    await expect(page.locator('h1')).toContainText('詳細分析');
    
    // Verify filtered results are shown
    await expect(page.locator('text=篩選結果')).toBeVisible();
    await expect(page.locator('text=總金額')).toBeVisible();

    // Step 5: Test filtering functionality
    // Filter by date range
    await page.click('[data-testid="date-filter"]');
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="apply-filter"]');
    
    // Verify filter results update
    await expect(page.locator('[data-testid="filter-results"]')).toBeVisible();

    // Step 6: Test export functionality
    await page.click('[data-testid="export-button"]');
    
    // Wait for download to start
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=匯出 CSV');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/發票資料_\d{4}-\d{2}-\d{2}\.csv/);
  });

  test('should handle file upload errors gracefully', async ({ page }) => {
    // Navigate to file manager
    await page.click('text=檔案管理');
    
    // Try to upload an invalid file
    const invalidFilePath = path.join(__dirname, 'fixtures', 'invalid-file.txt');
    await page.setInputFiles('input[type="file"]', invalidFilePath);
    
    // Verify error message is shown
    await expect(page.locator('text=請選擇CSV格式的檔案')).toBeVisible();
  });

  test('should maintain responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate through pages and verify mobile layout
    await expect(page.locator('h1')).toContainText('儀表板');
    
    // Check mobile navigation
    await page.click('[data-testid="mobile-menu"]');
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    // Navigate to file manager on mobile
    await page.click('text=檔案管理');
    await expect(page.locator('h1')).toContainText('檔案管理');
    
    // Verify mobile-friendly file upload
    await expect(page.locator('[data-testid="file-upload-area"]')).toBeVisible();
  });

  test('should handle offline state', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Verify offline indicator is shown
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Try to perform actions while offline
    await page.click('text=檔案管理');
    
    // Verify that cached data is still accessible
    await expect(page.locator('h1')).toContainText('檔案管理');
    
    // Go back online
    await context.setOffline(false);
    
    // Verify offline indicator disappears
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
  });

  test('should persist data across browser sessions', async ({ page, context }) => {
    // Upload a file and verify data
    await page.click('text=檔案管理');
    await page.setInputFiles('input[type="file"]', testCSVPath);
    await expect(page.locator('text=處理完成')).toBeVisible({ timeout: 10000 });
    
    // Navigate to dashboard and verify statistics
    await page.click('text=儀表板');
    const totalAmount = await page.locator('[data-testid="total-amount"]').textContent();
    
    // Create new page (simulate new session)
    const newPage = await context.newPage();
    await newPage.goto('/');
    
    // Verify data persists
    await expect(newPage.locator('[data-testid="total-amount"]')).toContainText(totalAmount || '');
  });

  test('should handle large file uploads', async ({ page }) => {
    // Navigate to file manager
    await page.click('text=檔案管理');
    
    // Upload large file
    const largeFilePath = path.join(__dirname, 'fixtures', 'large-invoices.csv');
    await page.setInputFiles('input[type="file"]', largeFilePath);
    
    // Verify progress indicator is shown
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    
    // Wait for processing to complete (with longer timeout for large files)
    await expect(page.locator('text=處理完成')).toBeVisible({ timeout: 30000 });
    
    // Verify performance is acceptable
    const startTime = Date.now();
    await page.click('text=儀表板');
    await expect(page.locator('[data-testid="total-amount"]')).not.toContainText('$0');
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 3 seconds even with large datasets
    expect(loadTime).toBeLessThan(3000);
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Test keyboard navigation through the interface
    await page.keyboard.press('Tab'); // Focus on first interactive element
    await page.keyboard.press('Enter'); // Activate focused element
    
    // Navigate using keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Verify navigation works
    await expect(page.locator('h1')).toContainText(/儀表板|檔案管理|詳細分析/);
  });

  test('should handle chart interactions', async ({ page }) => {
    // First upload data
    await page.click('text=檔案管理');
    await page.setInputFiles('input[type="file"]', testCSVPath);
    await expect(page.locator('text=處理完成')).toBeVisible({ timeout: 10000 });
    
    // Navigate to dashboard
    await page.click('text=儀表板');
    
    // Wait for charts to render
    await expect(page.locator('canvas')).toHaveCount(2);
    
    // Test chart type switching
    await page.click('[data-testid="chart-type-monthly"]');
    await expect(page.locator('[data-testid="monthly-chart"]')).toBeVisible();
    
    await page.click('[data-testid="chart-type-daily"]');
    await expect(page.locator('[data-testid="daily-chart"]')).toBeVisible();
    
    // Test chart interactions (hover, click)
    const chart = page.locator('canvas').first();
    await chart.hover();
    
    // Click on chart data point
    await chart.click({ position: { x: 100, y: 100 } });
    
    // Verify tooltip or detail view appears
    // (This would depend on your chart implementation)
  });

  test('should validate accessibility standards', async ({ page }) => {
    // Check for proper heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
    
    // Check for alt text on images
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
    
    // Check for proper form labels
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      }
    }
    
    // Check color contrast (basic check)
    const backgroundColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    expect(backgroundColor).toBeTruthy();
  });
});