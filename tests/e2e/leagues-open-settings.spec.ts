import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

const TID = {
  myLeaguesCard: '[data-testid="my-leagues-card"]',
  kebabBtn: (id: string) => `[data-testid="kebab-${id}-button"]`,
  kebabItemInvite: (id: string) => `[data-testid="kebab-${id}-item-invite"]`,
  kebabItemOpen: (id: string) => `[data-testid="kebab-${id}-item-open"]`,
  kebabItemSettings: (id: string) => `[data-testid="kebab-${id}-item-settings"]`,
  leaguePage: '[data-testid="league-page"]',
  leagueHeader: '[data-testid="league-header"]',
  leagueSettings: '[data-testid="league-settings"]',
  guard403: '[data-testid="guard-403"]',
};

async function setTestUserCookie(page: Page, email: string) {
  const u = new URL(BASE_URL);
  await page.goto(`${BASE_URL}/`); // ensure domain context
  await page.context().addCookies([
    {
      name: "tp_test_user",
      value: encodeURIComponent(email),
      domain: u.hostname,
      path: "/",
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);
}

test.describe("Kebab → Open & Settings", () => {
  test.beforeEach(async ({ request }) => {
    await request.post(`${BASE_URL}/api/test/reset`);
  });

  test("Open goes to /leagues/:id and shows header", async ({ page, request }) => {
    const owner = "owner@example.com";
    await setTestUserCookie(page, owner);

    // create a league owned by the current user so it shows on dashboard list
    await request.post(`${BASE_URL}/api/test/leagues/create`, {
      data: { id: "lg_open", name: "Openable League", ownerEmail: owner },
    });

    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator(TID.myLeaguesCard)).toBeVisible();

    await page.locator(TID.kebabBtn("lg_open")).click();
    await page.locator(TID.kebabItemOpen("lg_open")).click();

    await expect(page).toHaveURL(`${BASE_URL}/leagues/lg_open`);
    await expect(page.locator(TID.leaguePage)).toBeVisible();
    await expect(page.locator(TID.leagueHeader)).toContainText("Openable League");
  });

  test("Settings guarded for non-owner; visible for owner", async ({ page, request }) => {
    // create two leagues: one not owned by viewer, one owned by viewer
    await request.post(`${BASE_URL}/api/test/leagues/create`, {
      data: { id: "lg_alien", name: "Alien League", ownerEmail: "someoneelse@example.com" },
    });
    await request.post(`${BASE_URL}/api/test/leagues/create`, {
      data: { id: "lg_owned", name: "Owned League", ownerEmail: "owner@example.com" },
    });

    // Non-owner path
    await setTestUserCookie(page, "notowner@example.com");
    await page.goto(`${BASE_URL}/leagues/lg_alien/settings`);
    await expect(page.locator(TID.guard403)).toBeVisible();
    // In dev we still render the client for E2E, but guard must be visible.
    // Owner path
    await setTestUserCookie(page, "owner@example.com");
    await page.goto(`${BASE_URL}/leagues/lg_owned/settings`);
    await expect(page.locator(TID.leagueSettings)).toBeVisible();
  });
});
