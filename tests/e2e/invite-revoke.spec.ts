import { test, expect, type Page, type Locator } from "@playwright/test";
import { BASE_URL, apiPost, resetStore } from "./_helpers";

/* ------------------------------- seed utils ------------------------------- */

async function seedInvite(page: Page, leagueId: string, email: string): Promise<void> {
  const res = await apiPost<{ ok: boolean; error?: string }>(page, "/api/test/invites", { leagueId, email });
  expect(res.ok, res.error).toBeTruthy();
}

async function seedForDashboard(page: Page, leagueId: string, emails: string[]): Promise<void> {
  await resetStore(page);
  for (const e of emails) await seedInvite(page, leagueId, e);
}

/* ----------------------------- locator helpers ---------------------------- */

const panel = (page: Page): Locator => page.getByTestId("invites-panel");
const rows = (page: Page): Locator => panel(page).locator("tbody tr");
const revokeBtn = (page: Page): Locator => panel(page).getByTestId("revoke-invite");
const refresh = (page: Page): Locator => panel(page).getByRole("button", { name: /refresh/i });

/* ---------------------------------- tests --------------------------------- */

test.describe("Invite Revoke", () => {
  test("admin can revoke an invite and it disappears", async ({ page }) => {
    const LG = "lg_owner_revoke";
    await seedForDashboard(page, LG, ["member1@example.com", "member2@example.com"]);

    await page.goto(`${BASE_URL}/dashboard`);

    await expect(panel(page).getByRole("heading", { name: /recent invites/i })).toBeVisible();

    // Should start with 2 rows
    await expect(rows(page), "Should start with 2 invites").toHaveCount(2);

    // Click Revoke on the first row, then verify we drop to 1
    await revokeBtn(page).first().click();

    // panel refetches immediately; if a race occurs, do a single manual refresh
    try {
      await expect(rows(page)).toHaveCount(1, { timeout: 4000 });
    } catch {
      await refresh(page).click();
      await expect(rows(page)).toHaveCount(1, { timeout: 4000 });
    }
  });

  test.skip("non-owners can’t manage invites page (guard 403 visible)", async () => {
    // Skipped until we add a cookie-based guard override.
  });
});
