import { test, expect } from "@playwright/test";

test("Kebab Invite routes to bulk invites page", async ({ page }) => {
  const base = process.env.BASE_URL || "http://localhost:3001";
  await page.goto(`${base}/dashboard`);

  await expect(page.getByTestId("my-leagues-card")).toBeVisible();

  const firstKebab = page.locator('[data-testid^="kebab-"]').first();
  await firstKebab.getByTestId(/kebab-.*-button/).click();
  await page.getByTestId(/kebab-.*-item-invite/).click();

  await expect(page).toHaveURL(/\/leagues\/[a-zA-Z0-9._-]+\/invites\/bulk$/);
  await expect(page.getByTestId("bulk-invites-page")).toBeVisible();
});
