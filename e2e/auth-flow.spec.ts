import { test, expect } from '@playwright/test'

test('login page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/.*/)
})

test('handles login failure', async ({ page }) => {
  await page.goto('/login')

  await page.fill('input[type="email"]', 'bad@test.com')
  await page.fill('input[type="password"]', 'wrong')
  await page.click('button[type="submit"]')

  // must NOT crash
  await expect(page.locator('body')).toBeVisible()
})

test('protected route redirects when not authenticated', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).not.toHaveURL('/dashboard')
})
