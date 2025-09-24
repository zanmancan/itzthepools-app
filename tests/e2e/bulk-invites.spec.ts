// tests/e2e/bulk-invites.spec.ts
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

test.describe("Bulk Invites", () => {
  test.beforeEach(async ({ request }) => {
    await request.post(`${BASE_URL}/api/test/reset`);
    // Fast server-side login for API context / seeding
    await request.post(`${BASE_URL}/api/test/login-as`, {
      data: { email: "admin@example.com" },
    });
  });

  test("admin creates bulk invites, sees rows on dashboard", async ({ page, request, context }) => {
    // Create a league via API
    const mk = await request.post(`${BASE_URL}/api/leagues/create`, {
      data: { name: `Bulk League ${Date.now() % 100000}` },
    });
    const league = await mk.json();
    expect(league.ok).toBeTruthy();
    const leagueId = league.leagueId as string;

    // Go to bulk page and submit 3 emails
    await page.goto(`${BASE_URL}/leagues/${leagueId}/invites/bulk`);
    const emails = ["a1@example.com", "a2@example.com", "a3@example.com"].join("\n");
    await page.locator('[data-testid="bulk-emails"]').fill(emails);
    await page.locator('[data-testid="bulk-send"]').click();

    // Expect result list to show 3 invites
    await expect(page.locator('[data-testid="bulk-result"] li')).toHaveCount(3);

    // 🔒 Ensure the **browser** has the admin cookie for the dashboard page
    await context.addCookies([
      {
        name: "tp_test_user",
        value: encodeURIComponent("admin@example.com"),
        url: BASE_URL, // simplest way to set cookie for correct domain+port
      },
    ]);

    // Now assert on dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    const rows = page.locator('[data-testid="invite-row"]');
    await expect
      .poll(async () => await rows.count(), { timeout: 10000, intervals: [200, 300, 500] })
      .toBeGreaterThanOrEqual(3);

    // As admin we should see at least one revoke button
    const revokeButtons = page.locator('[data-testid="revoke-invite"]');
    await expect
      .poll(async () => await revokeButtons.count(), { timeout: 8000, intervals: [200, 300, 500] })
      .toBeGreaterThan(0);
  });

  test("bulk errors on invalid emails", async ({ page, request }) => {
    const mk = await request.post(`${BASE_URL}/api/leagues/create`, {
      data: { name: `Bad Bulk ${Date.now() % 100000}` },
    });
    const leagueId = (await mk.json()).leagueId as string;

    await page.goto(`${BASE_URL}/leagues/${leagueId}/invites/bulk`);
    await page.locator('[data-testid="bulk-emails"]').fill("ok@example.com, not-an-email");
    await page.locator('[data-testid="bulk-send"]').click();

    const toast = page.locator('[data-testid="toast"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/invalid emails/i);
  });
});
