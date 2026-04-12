import { expect, test } from "@playwright/test";

test("OTP login flow", async ({ page }) => {
  await page.route("**/api/auth/otp/start", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok" }),
    });
  });

  await page.route("**/api/auth/otp/verify", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: "e2e-token" }),
    });
  });

  await page.goto("/login");

  await expect(page.getByTestId("login-screen")).toBeVisible();
  await page.getByTestId("phone-input").fill("5878881837");

  await expect(page).toHaveURL(/\/verify$/);

  await page.getByTestId("code-input").fill("123456");

  await expect(page).toHaveURL(/\/portal$/);
});
