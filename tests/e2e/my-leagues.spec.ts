// tests/e2e/my-leagues.spec.ts
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

test.describe("My Leagues", () => {
  test.beforeEach(async ({ request }) => {
    await request.post(`${BASE_URL}/api/test/reset`);
    // Creator is admin for now
    await request.post(`${BASE_URL}/api/test/login-as`, {
      data: { email: "admin@example.com" },
    });
  });

  test("creating a league shows on My Leagues card", async ({ page, request, context }) => {
    // Create via API
    const mk = await request.post(`${BASE_URL}/api/leagues/create`, {
      data: { name: `Card League ${Date.now() % 100000}` },
    });
    const league = await mk.json();
    expect(league.ok).toBeTruthy();
    const leagueId = league.leagueId as string;

    // Ensure browser has cookie
    await context.addCookies([
      {
        name: "tp_test_user",
        value: encodeURIComponent("admin@example.com"),
        url: BASE_URL,
      },
    ]);

    // Visit dashboard and assert card sees our league
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('[data-testid="my-leagues-card"]')).toBeVisible();

    const list = page.locator('[data-testid="my-leagues-list"] [data-testid="my-leagues-item"]');
    await expect
      .poll(async () => {
        const items = await list.allTextContents();
        return items.some((t) => t.includes("Card League"));
      }, { timeout: 8000, intervals: [200, 300, 500] })
      .toBeTruthy();

    // Clicking the item lands on the league header
    await list.first().click();
    await expect(page).toHaveURL(/\/leagues\//);
    await expect(page.locator('[data-testid="league-header"]')).toBeVisible();
  });
});
