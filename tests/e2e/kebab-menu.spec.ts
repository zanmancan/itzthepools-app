// tests/e2e/kebab-menu.spec.ts
import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";

async function seedLeague(page: Page, name?: string) {
  const res = await page.request.post(`${BASE_URL}/api/test/seed/league`, {
    data: { name: name ?? `E2E League ${Date.now()}`, reset: true },
  });
  if (!res.ok()) {
    const body = await res.text();
    test.skip(true, `Seed endpoint unavailable. Enable NEXT_PUBLIC_E2E_DEV_SAFETY=1. Response: ${res.status()} ${body}`);
  }
  const json = await res.json();
  return json?.league?.id as string;
}

async function gotoDashboard(page: Page) {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function openFirstLeagueKebab(page: Page) {
  const k = page.locator('[data-testid="league-row-kebab"]').first();
  await expect(k, "Expected a league row kebab on Dashboard").toBeVisible();
  await k.click();
}

async function clickMenu(page: Page, label: RegExp) {
  const item = page.getByRole("menuitem", { name: label }).first();
  await expect(item, `Expected menu item ${label}`).toBeVisible();
  await item.click();
}

test.describe("Dashboard kebab menu (seeded, dev-only)", () => {
  test("Owner: sees Open / Invite / Settings and navigates correctly", async ({ page }) => {
    // 1) Seed a clean league (dev-only)
    const id = await seedLeague(page);

    // 2) Dashboard should now list it (be flexible: at least one row)
    await gotoDashboard(page);
    const rows = page.locator('[data-testid="league-row"]');
    await expect(rows.first()).toBeVisible();

    // 3) Open kebab and assert items
    await openFirstLeagueKebab(page);
    const items = page.getByRole("menuitem");
    await expect(items).toHaveCount(3);
    const allText = (await items.allInnerTexts()).map((t) => t.toLowerCase()).join(" | ");
    for (const needed of ["open", "invite", "settings"]) {
      expect(allText.includes(needed), `Menu should include "${needed}"`).toBeTruthy();
    }

    // 4) Open → /leagues/:id
    await clickMenu(page, /Open/i);
    await expect(page).toHaveURL(new RegExp(`/leagues/${id}$`));

    // 5) Invite → /leagues/:id/invites
    await gotoDashboard(page);
    await openFirstLeagueKebab(page);
    await clickMenu(page, /Invite/i);
    await expect(page).toHaveURL(new RegExp(`/leagues/${id}/invites$`));

    // 6) Settings → /leagues/:id/settings
    await gotoDashboard(page);
    await openFirstLeagueKebab(page);
    await clickMenu(page, /Settings/i);
    await expect(page).toHaveURL(new RegExp(`/leagues/${id}/settings$`));
  });
});
