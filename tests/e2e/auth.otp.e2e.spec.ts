import { expect, test } from "@playwright/test";

test("real otp login works end-to-end", async ({ page }) => {
  const phone = process.env.E2E_TEST_PHONE;
  const otp = process.env.E2E_TEST_OTP;

  if (!phone) {
    throw new Error("Missing E2E_TEST_PHONE environment variable.");
  }
  if (!otp) {
    throw new Error("Missing E2E_TEST_OTP environment variable.");
  }

  page.on("response", async (response) => {
    if (response.status() < 400) return;
    const request = response.request();
    let body = "";
    try {
      body = await response.text();
    } catch {
      body = "<unable to read response body>";
    }
    console.error(
      [
        "[network:error]",
        response.status(),
        request.method(),
        request.url(),
        body ? `body=${body}` : ""
      ]
        .filter(Boolean)
        .join(" ")
    );
  });

  await page.goto("/login");

  await page.getByLabel("Phone number").fill(phone);

  const startOtpResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/otp/start") &&
      response.request().method() === "POST",
    { timeout: 15_000 }
  );

  await page.getByRole("button", { name: /send code/i }).click();

  const startOtpResponse = await startOtpResponsePromise;
  expect([200, 204]).toContain(startOtpResponse.status());

  await page.getByLabel("OTP digit 1").fill(otp);

  const verifyOtpResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/otp/verify") &&
      response.request().method() === "POST",
    { timeout: 15_000 }
  );

  const verifyOtpResponse = await verifyOtpResponsePromise;
  expect(verifyOtpResponse.status()).toBe(200);

  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 15_000 });

  const storedToken = await page.evaluate(() => localStorage.getItem("auth_token"));
  expect(storedToken).toBeTruthy();

  const lendersResponse = storedToken
    ? await page.request.get("/api/lenders", {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
    : await page.request.get("/api/lenders");

  if (lendersResponse.status() !== 200) {
    console.error(
      "[network:error] /api/lenders",
      lendersResponse.status(),
      await lendersResponse.text()
    );
  }

  expect(lendersResponse.status()).toBe(200);
});
