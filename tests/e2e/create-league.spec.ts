import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

test.describe("Create League", () => {
  test.beforeEach(async ({ request }) => {
    await request.post(`${BASE_URL}/api/test/reset`);
    await request.post(`${BASE_URL}/api/test/login-as`, {
      data: { email: "admin@example.com" },
    });
  });

  test("create a league and land on league page", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.goto(`${BASE_URL}/leagues/new`);

    const name = `My League ${Date.now() % 100000}`;
    await page.locator('[data-testid="league-name-input"]').fill(name);
    await page.locator('[data-testid="create-league"]').click();

    // Wait for the redirect and DOM to settle
    await expect(page).toHaveURL(/\/leagues\/.+/);

    // Be generous: accept either data-testid or the visible H1 text
    const headerByTestId = page.locator('[data-testid="league-header"]');
    const headerByRole = page.getByRole("heading", { name: "League" });

    await expect
      .poll(async () => {
        const a = await headerByTestId.count();
        if (a > 0 && (await headerByTestId.first().isVisible())) return true;
        const b = await headerByRole.count();
        if (b > 0 && (await headerByRole.first().isVisible())) return true;
        return false;
      }, { timeout: 10000, intervals: [200, 300, 500] })
      .toBeTruthy();
  });

  test("validation shows toast on bad name", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.goto(`${BASE_URL}/leagues/new`);
    await page.locator('[data-testid="league-name-input"]').fill("x"); // too short
    await page.locator('[data-testid="create-league"]').click();
    const toast = page.locator('[data-testid="toast"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/at least 3 characters/i);
  });
});
