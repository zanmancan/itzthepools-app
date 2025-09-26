import { test, expect, Page } from "@playwright/test";

const base = process.env.BASE_URL || "http://localhost:3001";

async function setTestUserCookie(page: Page, email: string) {
  const u = new URL(base);
  // Ensure we are on the right domain context
  await page.goto(`${base}/`);
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

test.describe("Auth Guards for Bulk Invites (deterministic)", () => {
  test.beforeEach(async ({ request }) => {
    // hard reset in-memory store before each test
    const r = await request.post(`${base}/api/test/reset`);
    expect(r.ok()).toBeTruthy();
  });

  test("Non-owner gets visible 403; owner path green", async ({ page, request }) => {
    // Impersonate user for this test session
    await setTestUserCookie(page, "owner@example.com");

    // Create a league owned by someone else (non-owner path)
    const nonOwner = await request.post(`${base}/api/test/leagues/create`, {
      data: { id: "lg_non_owner", name: "Non Owner League", ownerEmail: "someoneelse@example.com" },
    });
    expect(nonOwner.ok()).toBeTruthy();

    // Create a league owned by current user (owner path)
    const owner = await request.post(`${base}/api/test/leagues/create`, {
      data: { id: "lg_owner", name: "Owner League", ownerEmail: "owner@example.com" },
    });
    expect(owner.ok()).toBeTruthy();

    // Non-owner path should 403 (guard shown)
    await page.goto(`${base}/leagues/lg_non_owner/invites/bulk`);
    await expect(page.getByTestId("guard-403")).toBeVisible();
    if (process.env.NEXT_PUBLIC_E2E_DEV_SAFETY === "1") {
      await expect(page.getByTestId("guard-403-dev-banner")).toBeVisible();
    }

    // Owner path should render page content
    await page.goto(`${base}/leagues/lg_owner/invites/bulk`);
    await expect(page.getByTestId("bulk-invites-page")).toBeVisible();
  });
});
