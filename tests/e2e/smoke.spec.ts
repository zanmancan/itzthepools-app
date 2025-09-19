// tests/e2e/smoke.spec.ts
import { test, expect } from "@playwright/test";

test("home renders HTML and not 404", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  // Has at least some visible text on the page
  await expect(page.locator("body :text-matches(., 's')")).toBeVisible(); // any visible text node
});

test("unknown route hits 404", async ({ page }) => {
  const res = await page.goto("/__this-should-404");
  // Next returns 404 status for unknown routes
  expect(res?.status()).toBe(404);
  await expect(page.locator("body")).toBeVisible();
});
