import { test, expect } from '@playwright/test';

test('portal loads and server health responds', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Boreal/i);

  const res = await page.request.get('/api/health');
  expect(res.ok).toBeTruthy();
});
