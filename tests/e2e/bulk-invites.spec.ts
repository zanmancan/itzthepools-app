// tests/e2e/bulk-invites.spec.ts
import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3001";

/** ------- tiny JSON helpers so failures show bodies clearly ------- */
async function apiPOST<T>(page: Page, path: string, data?: any): Promise<T> {
  const res = await page.request.post(`${BASE_URL}${path}`, { data, failOnStatusCode: false });
  const body = await res.text();
  let json: any;
  try { json = JSON.parse(body); } catch {
    throw new Error(`Expected JSON from POST ${path}\nStatus: ${res.status()} ${res.statusText()}\nBody:\n${body}`);
  }
  if (!res.ok() || json?.ok === false) {
    throw new Error(`POST ${path} failed\nStatus: ${res.status()} ${res.statusText()}\nBody:\n${body}`);
  }
  return json as T;
}

async function resetStore(page: Page) {
  await apiPOST(page, "/api/test/reset");
}
async function seedOwnerLeague(page: Page, leagueId: string) {
  await apiPOST(page, "/api/test/seed-league", { leagueId, role: "owner" });
}

/** Helper: rows that look like real results (our UI renders <li data-testid="invite-row">) */
function resultsEmailItems(page: Page) {
  return page.getByTestId("invite-row");
}

test.describe("Bulk Invites", () => {
  test.beforeEach(async ({ page }) => {
    await resetStore(page);
  });

  test("admin creates bulk invites, sees rows on dashboard", async ({ page }) => {
    const leagueId = "lg_seofwbiz";

    await seedOwnerLeague(page, leagueId);
    await page.goto(`${BASE_URL}/leagues/${leagueId}/invites/bulk`);

    // Dev context block is visible and indicates owner
    await expect(page.getByTestId("dev-context")).toContainText(/"role"\s*:\s*"owner"/i);

    // Enter three emails and submit
    await page.getByTestId("bulk-textarea").fill("a@x.com b@x.com c@x.com");
    await page.getByRole("button", { name: /create invites/i }).click();

    // Wait for exactly 3 result rows
    const emailRows = resultsEmailItems(page);
    await expect(emailRows).toHaveCount(3, { timeout: 10_000 });

    // Scope email text assertions to the results container (avoid textarea match)
    const results = page.getByTestId("bulk-results");
    await expect(results.getByText("a@x.com")).toBeVisible();
    await expect(results.getByText("b@x.com")).toBeVisible();
    await expect(results.getByText("c@x.com")).toBeVisible();

    // (Optional) you can navigate to dashboard and assert summary there if desired
    // await page.goto(`${BASE_URL}/dashboard`);
    // ...
  });

  test("bulk errors on invalid emails", async ({ page }) => {
    const leagueId = "lg_seofwbiz";

    await seedOwnerLeague(page, leagueId);
    await page.goto(`${BASE_URL}/leagues/${leagueId}/invites/bulk`);

    // Start empty (fresh reset)
    await expect(resultsEmailItems(page)).toHaveCount(0);

    // Include an invalid address; client should block submit and show error
    await page.getByTestId("bulk-textarea").fill("ok@example.com, not-an-email");
    await page.getByRole("button", { name: /create invites/i }).click();

    await expect(page.getByText(/invalid email/i)).toBeVisible();
    await expect(resultsEmailItems(page)).toHaveCount(0);
  });
});
