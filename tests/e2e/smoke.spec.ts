import { test, expect } from "@playwright/test";

test("home renders HTML and not 404", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  // Assert the page has some visible non-whitespace text anywhere in <body>
  await expect(page.locator("body")).toContainText(/\S/);
});

test("unknown route hits 404", async ({ page }) => {
  const res = await page.goto("/__this-should-404");
  expect(res?.status()).toBe(404);
  await expect(page.locator("body")).toBeVisible();
});
