import { test, expect } from '@playwright/test';

test('portal loads', async ({ page }) => {
  await page.goto('https://portal.boreal.financial');
  await expect(page).toHaveURL(/portal/);
});
