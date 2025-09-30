import { test, expect } from '@playwright/test';
import type { Page, APIRequestContext } from '@playwright/test';

interface ApiResponse<T> {
  ok: boolean;
  invite?: T;
  league?: T;
  error?: string;
}

interface Invite {
  token: string;
  status: string;
  league_id: string;
}

interface League {
  id: string;
  name: string;
}

type InviteResponse = ApiResponse<Invite>;
type LeagueResponse = ApiResponse<League>;

async function apiGET<T>(request: APIRequestContext, path: string): Promise<T> {
  const res = await request.get(path);
  const text = await res.text();
  const json = await res.json();
  if (!res.ok() || (json as any)?.ok === false) {
    throw new Error(`GET ${path} failed\nStatus: ${res.status()} ${res.statusText()}\nBody:\n${text}`);
  }
  return json as T;
}

async function apiPOST<T>(request: APIRequestContext, path: string, body: object): Promise<T> {
  const res = await request.post(path, { data: body });
  const text = await res.text();
  console.log(`API POST ${path} response:`, text); // Debug log
  const json = await res.json();
  if (!res.ok() || (json as any)?.ok === false) {
    throw new Error(`POST ${path} failed\nStatus: ${res.status()} ${res.statusText()}\nBody:\n${text}`);
  }
  return json as T;
}

test.describe('Invite Flow', () => {
  test('happy path: accept unique team, see league header', async ({ page, request }) => {
    // Create test league
    const leagueResponse: LeagueResponse = await apiPOST(request, '/api/test/leagues', {
      name: 'Test Invite League',
      sport: 'nfl',
      season: '2025',
    });
    const leagueId = leagueResponse.league!.id;

    // Create invite
    const inviteResponse: InviteResponse = await apiPOST(request, '/api/test/invites', {
      leagueId,
      email: 'acceptor@example.com',
    });
    const token = inviteResponse.invite!.token;

    // Verify by-token lookup
    const inviteByToken: InviteResponse = await apiGET(request, `/api/test/invites/by-token?token=${token}`);
    expect(inviteByToken.invite!.league_id).toBe(leagueId);
    expect(inviteByToken.ok).toBe(true);

    // Navigate to accept page and assert
    await page.goto(`/invites/${token}`);
    await expect(page.getByRole('heading', { name: /Join.*Test Invite League/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Accept Invite/i })).toBeVisible();

    // Simulate accept (click button, assert redirect to league)
    await page.getByRole('button', { name: /Accept Invite/i }).click();
    await expect(page).toHaveURL(/\/leagues\/[^/]+/);
    await expect(page.getByRole('heading', { name: /Test Invite League/i })).toBeVisible();
  });

  test('used token is reported as used by the API', async ({ request }) => {
    // Create test league
    const leagueResponse: LeagueResponse = await apiPOST(request, '/api/test/leagues', {
      name: 'Used Token League',
      sport: 'nfl',
      season: '2025',
    });
    const leagueId = leagueResponse.league!.id;

    // Create and "accept" invite (simulate usage)
    const inviteResponse: InviteResponse = await apiPOST(request, '/api/test/invites', {
      leagueId,
      email: 'used@example.com',
    });
    const token = inviteResponse.invite!.token;

    // Mark as accepted via test helper
    const acceptResponse: InviteResponse = await apiPOST(request, `/api/test/invites/accept?token=${token}`, {});
    expect(acceptResponse.ok).toBe(true);

    // Attempt accept again: expect used error
    const acceptAgain: ApiResponse<unknown> = await apiGET(request, `/api/test/invites/accept?token=${token}`);
    expect(acceptAgain.ok).toBe(false);
    expect(acceptAgain.error).toContain('already accepted');
  });
});