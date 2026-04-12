import { test, expect } from '@playwright/test';

test('app shell renders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Quiz|Quvolt|Vite/i);
});
