import { test, expect } from '@playwright/test';

test.describe('Assets E2E', () => {
  test('user can add and edit assets and see distribution', async ({
    page,
  }) => {
    await page.goto('/');

    // Navigate to Assets
    await page.getByRole('link', { name: '資產管理' }).first().click();

    // Click 新增資產
    await page.getByRole('button', { name: '新增資產' }).click();

    // Fill form
    await page.getByLabel('名稱').fill('E2E Asset');
    await page.getByLabel('價值').fill('6000');
    await page.getByRole('button', { name: '新增資產' }).click();

    // Assert new asset appears in list
    await expect(page.getByText('E2E Asset')).toBeVisible();

    // Edit asset
    const row = page.locator('tr', { hasText: 'E2E Asset' });
    await row.getByRole('button', { name: '編輯' }).click();
    await page.getByLabel('價值').fill('7000');
    await page.getByRole('button', { name: '儲存變更' }).click();
    await expect(row.getByText('7,000')).toBeVisible();

    // Navigate to Dashboard and validate chart exists
    await page.getByRole('link', { name: '儀表板' }).click();
    await expect(page.locator('canvas')).toBeVisible();
  });
});
