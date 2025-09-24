import { test, expect } from "@playwright/test";
const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

test("Invite button on My Leagues opens bulk invites", async ({ page, request, context }) => {
  // reset + login admin (server)
  await request.post(`${BASE_URL}/api/test/reset`);
  await request.post(`${BASE_URL}/api/test/login-as`, {
    data: { email: "admin@example.com" },
  });

  // ensure browser has cookie
  await context.addCookies([
    { name: "tp_test_user", value: encodeURIComponent("admin@example.com"), url: BASE_URL },
  ]);

  // create a league
  const mk = await request.post(`${BASE_URL}/api/leagues/create`, {
    data: { name: `InviteBtn ${Date.now() % 100000}` },
  });
  const leagueId = (await mk.json()).leagueId as string;

  // dash → click Invite
  await page.goto(`${BASE_URL}/dashboard`);
  const inviteBtn = page.locator(`[data-testid="invite-from-league"]`).first();
  await expect(inviteBtn).toBeVisible();
  await inviteBtn.click();

  // landed on bulk page for this league
  await expect(page).toHaveURL(new RegExp(`/leagues/${leagueId}/invites/bulk`));
  await expect(page.getByRole("heading", { name: "Bulk Invites" })).toBeVisible();
});
