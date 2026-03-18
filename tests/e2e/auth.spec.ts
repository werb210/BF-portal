import { test, expect } from '@playwright/test';

test('login and reach dashboard', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /staff login/i })).toBeVisible();
  await expect(page.getByLabel('Phone number')).toBeVisible();
  await expect(page.getByRole('button', { name: /send code/i })).toBeVisible();
});
