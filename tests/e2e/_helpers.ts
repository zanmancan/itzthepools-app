import { expect, Page, APIResponse } from "@playwright/test";

export const BASE_URL =
  process.env.PW_BASE_URL?.replace(/\/$/, "") || "http://localhost:3001";

/* --------------------------------- HTTP ---------------------------------- */

export async function apiGet<T>(page: Page, path: string): Promise<T> {
  const res = await page.request.get(`${BASE_URL}${path}`);
  return (await res.json()) as T;
}

export async function apiPost<T>(
  page: Page,
  path: string,
  data?: Record<string, any>
): Promise<T> {
  const res = await page.request.post(`${BASE_URL}${path}`, { data });
  return (await res.json()) as T;
}

/* ------------------------------ Test store ops --------------------------- */

/** Reset the in-memory dev store. */
export async function resetStore(page: Page): Promise<void> {
  // Default to GET (works in your browser), but fall back to POST if needed.
  let res: APIResponse | undefined;
  try {
    res = await page.request.get(`${BASE_URL}/api/test/reset`);
    if (res.ok()) return;
  } catch {}
  // Fallback
  res = await page.request.post(`${BASE_URL}/api/test/reset`);
  expect(res.ok()).toBeTruthy();
}

/** Seed a league with an owner/admin user id for the cookies-based auth. */
export async function seedOwnerLeague(
  page: Page,
  leagueId: string
): Promise<void> {
  const r = await apiPost<{ ok: boolean; error?: string }>(
    page,
    `/api/test/seed-league?leagueId=${encodeURIComponent(leagueId)}`
  );
  expect(r.ok, r.error).toBeTruthy();
}

/** Seed a single invite into the test store. */
export async function seedInvite(
  page: Page,
  leagueId: string,
  email: string,
  expiresInMins = 60
): Promise<{ ok: boolean; invite?: { token: string }; error?: string }> {
  return apiPost(
    page,
    `/api/test/invites/seed?leagueId=${encodeURIComponent(
      leagueId
    )}&email=${encodeURIComponent(email)}&expiresInMins=${expiresInMins}`
  );
}

/* ------------------------------- Public API ------------------------------ */

/** Accept an invite through the real app API (with a team name). */
export async function acceptInviteViaApi(
  page: Page,
  token: string,
  teamName: string
): Promise<{ ok?: boolean; league_id?: string; error?: string }> {
  return apiPost(page, "/api/invites/accept-with-name", { token, teamName });
}

/** Read info for a token via the real API. */
export async function inviteInfoViaApi(
  page: Page,
  token: string
): Promise<{ ok: boolean; used?: boolean; error?: string }> {
  return apiGet(page, `/api/invites/info?token=${encodeURIComponent(token)}`);
}

/* --------------------------------- UI bits -------------------------------- */

/** Standard toast check used across specs. */
export async function expectToast(page: Page, re: RegExp) {
  const toast = page.getByRole("alert").filter({ hasText: re });
  await expect(toast).toBeVisible();
}

/**
 * Locator for the “Results” list items on the bulk invites page.
 * We filter to those that look like emails (contain `@`).
 */
export function resultsEmailItems(page: Page) {
  return page.getByRole("listitem").filter({ hasText: /@/ });
}
