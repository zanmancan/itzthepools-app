// tests/e2e/dashboard.spec.ts
import { test, expect } from "@playwright/test";

test("dashboard route returns HTML", async ({ page }) => {
  const res = await page.goto("/dashboard");
  // It might redirect to /login if not authenticated; both are OK as a smoke.
  expect([200, 302]).toContain(res?.status());
  await expect(page.locator("body")).toBeVisible();
});
