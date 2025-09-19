// tests/e2e/smoke.spec.ts
import { test, expect } from "@playwright/test";

test("home renders HTML and not 404", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  // Be resilient across App Router vs Pages fallback
  await expect(page.locator("body")).toBeVisible();
});

test("unknown route hits 404", async ({ page }) => {
  const res = await page.goto("/__this-should-404");
  expect(res?.status()).toBe(404);
  await expect(page.locator("body")).toBeVisible();
});
