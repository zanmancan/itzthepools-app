import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3001";

/** JSON helpers that surface raw bodies in failures */
async function apiGET<T>(page: Page, path: string): Promise<T> {
  const res = await page.request.get(`${BASE_URL}${path}`, { failOnStatusCode: false });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from GET ${path}\nStatus: ${res.status()} ${res.statusText()}\nBody:\n${text}`);
  }
  if (!res.ok() || json?.ok === false) {
    throw new Error(`GET ${path} failed\nStatus: ${res.status()} ${res.statusText()}\nBody:\n${text}`);
  }
  return json as T;
}

async function apiPOST<T>(page: Page, path: string, data?: Record<string, any>): Promise<T> {
  const res = await page.request.post(`${BASE_URL}${path}`, { data, failOnStatusCode: false });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from POST ${path}\nStatus: ${res.status()} ${res.statusText()}\nBody:\n${text}`);
  }
  if (!res.ok() || json?.ok === false) {
    throw new Error(`POST ${path} failed\nStatus: ${res.status()} ${res.statusText()}\nBody:\n${text}`);
  }
  return json as T;
}

test.beforeEach(async ({ page }) => {
  // Reset the in-memory test store every run
  await apiPOST(page, "/api/test/reset");
});

test.describe("Invite Flow", () => {
  test("happy path: accept unique team, see league header", async ({ page }) => {
    const leagueId = "lg_flow";
    const email = "user@example.com";

    // 1) Seed one invite
    const seed = await apiGET<{ ok: true; invite: { token: string } }>(
      page,
      `/api/test/seed?leagueId=${leagueId}&email=${encodeURIComponent(email)}`
    );

    // 2) Sanity: token resolves via query-param endpoint
    await apiGET(page, `/api/test/invites/by-token?token=${seed.invite.token}`);

    // 3) Accept via API (deterministic + fast)
    await apiGET(page, `/api/test/invites/accept?token=${seed.invite.token}`);

    // 4) UI: header should CONTAIN the league id (page adds "League " label)
    await page.goto(`${BASE_URL}/leagues/${leagueId}`);
    const header = page.getByTestId("league-header");
    await expect(header).toContainText(leagueId, { timeout: 10_000 });
    // Alternative stricter form if you prefer suffix match:
    // await expect(header).toHaveText(new RegExp(`${leagueId}$`));
  });

  test("used token is reported as used by the API", async ({ page }) => {
    const leagueId = "lg_flow_used";
    const email = "first@x.com";

    const { invite } = await apiGET<any>(
      page,
      `/api/test/seed?leagueId=${leagueId}&email=${encodeURIComponent(email)}`
    );

    // First accept succeeds
    await apiGET(page, `/api/test/invites/accept?token=${invite.token}`);

    // Fetch again: invite exists and is marked used
    const again = await apiGET<{ ok: true; invite: { used: boolean } }>(
      page,
      `/api/test/invites/by-token?token=${invite.token}`
    );
    expect(again.invite.used).toBe(true);
  });
});
