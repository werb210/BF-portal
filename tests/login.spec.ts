import { expect, test } from "@playwright/test";

test("OTP login flow", async ({ page }) => {
  await page.goto("/login");

  await page.fill('input[type="tel"]', "1234567890");
  await page.click('button:has-text("Send OTP")');

  await page.fill('input[placeholder="Code"]', "123456");
  await page.click('button:has-text("Verify OTP")');

  await expect(page).not.toHaveURL(/\/login$/);
});
