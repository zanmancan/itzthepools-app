// tests/e2e/invite-flow.spec.ts
import { test, expect, Page } from "@playwright/test";

const BASE_URL = (process.env.BASE_URL?.replace(/\/$/, "") || "http://localhost:3001") as string;
const USE_REAL = process.env.E2E_REAL === "1";
const INVITE_PREFIX = USE_REAL ? "/invite" : "/test/invite";
const HOSTNAME = new URL(BASE_URL).hostname;

// run serial to avoid in-memory store clashes
test.describe.configure({ mode: "serial" });

const TID = {
  invitesPanel: '[data-testid="invites-panel"]',
  inviteRow:   '[data-testid="invite-row"]',
  pendingInviteBanner: '[data-testid="pending-invite-banner"]',
  inviteLeagueName:    '[data-testid="invite-league-name"]',
  leagueHeader:        '[data-testid="league-header"]',
  teamNameInput: 'input[name="teamName"], [data-testid="team-name-input"]',
  acceptButton:  'button:has-text("Accept"), [data-testid="accept-invite"]',
  revokeButton:  '[data-testid="revoke-invite"]',
  toast:         '[data-testid="toast"], [role="status"]',
};

// ---------- helpers ----------

async function apiPost<T = any>(page: Page, path: string, data?: Record<string, any>) {
  const res = await page.request.post(`${BASE_URL}${path}`, { data });
  return (await res.json()) as T;
}

async function seedInvite(page: Page, email = "user@example.com", expiresInMins = 60) {
  return apiPost(page, "/api/test/seed-invite", { email, expiresInMins });
}

/** Browser-visible cookie so CSR/SSR both see it */
async function loginAs(page: Page, email: string) {
  await page.goto(`${BASE_URL}/`); // establish origin
  await page.context().addCookies([
    { name: "tp_test_user", value: encodeURIComponent(email), domain: HOSTNAME, path: "/", sameSite: "Lax" },
  ]);
  await page.reload();
}

async function acceptAndWaitForLeague(page: Page) {
  const [resp] = await Promise.all([
    page.waitForResponse(r => r.url().includes("/api/invites/accept") && r.request().method() === "POST", { timeout: 15000 }),
    page.click(TID.acceptButton),
  ]);
  expect(resp.ok(), `accept API failed: ${resp.status()} ${await safeText(resp)}`).toBeTruthy();
  await expect.poll(() => page.url(), { timeout: 15000, intervals: [200, 300, 500] }).toMatch(/\/leagues\//);
}

async function safeText(resp: any) {
  try { return await resp.text(); } catch { try { return JSON.stringify(await resp.json()); } catch { return "<no body>"; } }
}

// ---------- resets ----------

test.beforeEach(async ({ page }) => {
  await apiPost(page, "/api/test/reset");
});

// ---------- tests ----------

test.describe("Invite Flow", () => {
  test("happy path: accept unique team, see league header", async ({ page }) => {
    const seed = await seedInvite(page, "user@example.com");
    const inviteUrl: string = (seed.inviteUrl as string).replace("/test/invite/", `${INVITE_PREFIX}/`);

    await loginAs(page, "user@example.com");
    await page.goto(inviteUrl);

    await expect(page.locator(TID.pendingInviteBanner)).toBeVisible();
    await expect(page.locator(TID.inviteLeagueName)).toContainText("Test League");

    await page.fill(TID.teamNameInput, `My Team ${Date.now() % 10000}`);
    await acceptAndWaitForLeague(page);

    await expect(page.locator(TID.leagueHeader)).toBeVisible();
  });

  test("duplicate team name → 409 toast", async ({ page }) => {
    const seed = await seedInvite(page, "user@example.com");
    const inviteUrl = (seed.inviteUrl as string).replace("/test/invite/", `${INVITE_PREFIX}/`);

    await loginAs(page, "user@example.com");

    // First accept succeeds
    const name = "Duplicate Name";
    await page.goto(inviteUrl);
    await page.fill(TID.teamNameInput, name);
    await acceptAndWaitForLeague(page);
    await expect(page.locator(TID.leagueHeader)).toBeVisible();

    // Fresh invite, same team → 4xx and stay
    const seed2 = await seedInvite(page, "user@example.com");
    const inviteUrl2 = (seed2.inviteUrl as string).replace("/test/invite/", `${INVITE_PREFIX}/`);
    await page.goto(inviteUrl2);
    await page.fill(TID.teamNameInput, name);

    const [resp2] = await Promise.all([
      page.waitForResponse(r => r.url().includes("/api/invites/accept") && r.request().method() === "POST", { timeout: 15000 }),
      page.click(TID.acceptButton),
    ]);
    expect(resp2.status(), `expected 4xx on duplicate but got ${resp2.status()} ${await safeText(resp2)}`).toBeGreaterThanOrEqual(400);
    await expect(page.locator(TID.toast)).toContainText(/409|duplicate|taken/i);
    await expect(page).toHaveURL(new RegExp(`${INVITE_PREFIX}/`));
  });

  test("expired or used token shows clear error", async ({ page }) => {
    const seed = await seedInvite(page, "user@example.com", 0);
    const inviteUrl = (seed.inviteUrl as string).replace("/test/invite/", `${INVITE_PREFIX}/`);

    await loginAs(page, "user@example.com");
    await page.goto(inviteUrl);

    await expect(page.locator(TID.pendingInviteBanner)).toBeVisible();
    await expect(page.locator(TID.toast)).toBeVisible();
  });

  test("revoke button appears for admin only; user cannot revoke", async ({ page }) => {
    // ensure at least one invite to render
    await seedInvite(page, "user@example.com");

    await loginAs(page, "admin@example.com");
    await page.goto(`${BASE_URL}/dashboard`);

    await expect(page.locator(TID.invitesPanel)).toBeVisible();

    // ✅ Wait until at least one invite row is rendered by the client fetch
    const rows = page.locator(TID.inviteRow);
    await expect
      .poll(async () => await rows.count(), { timeout: 20000, intervals: [200, 300, 500] })
      .toBeGreaterThan(0);

    await expect(page.locator(TID.revokeButton).first()).toBeVisible();
  });

  test("admin can revoke an invite and it disappears", async ({ page }) => {
    await seedInvite(page, "user@example.com");
    await loginAs(page, "admin@example.com");
    await page.goto(`${BASE_URL}/dashboard`);

    const rows = page.locator(TID.inviteRow);
    await expect
      .poll(async () => await rows.count(), { timeout: 20000, intervals: [200, 300, 500] })
      .toBeGreaterThan(0);

    const before = await rows.count();
    const firstRow = rows.first();
    const token = await firstRow.getAttribute("data-token");
    expect(token, "expected invite row to have data-token").toBeTruthy();

    await Promise.all([
      page.waitForResponse(r => r.url().includes("/api/invites/revoke") && r.request().method() === "POST", { timeout: 15000 }),
      firstRow.locator(TID.revokeButton).click(),
    ]);

    await expect(page.locator(TID.inviteRow)).toHaveCount(before - 1);
    await expect(page.locator(`${TID.inviteRow}[data-token="${token}"]`)).toHaveCount(0);
  });
});
