import { test, expect } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

interface ApiResponse<T> {
  ok: boolean;
  error?: string;
  invite?: any;
  league?: any;
  accepted?: { token: string; leagueId?: string; league_id?: string; status?: 'pending' | 'used' };
  status?: 'pending' | 'used';
}

type LeagueResponse = ApiResponse<{ id: string; name: string; sport?: string; season?: string }>;
type InviteResponse = ApiResponse<{ token: string; status: 'pending' | 'used'; leagueId?: string; league_id?: string }>;

async function apiPOST<T extends ApiResponse<any>>(request: APIRequestContext, path: string, body: object): Promise<T> {
  const res = await request.post(path, { data: body });
  const text = await res.text();
  console.log(`API POST ${path} response:`, text);
  if (!res.ok()) throw new Error(`POST ${path} failed\n${res.status()} ${res.statusText()}\n${text}`);
  return JSON.parse(text) as T;
}

async function apiGET<T extends ApiResponse<any>>(request: APIRequestContext, path: string): Promise<T> {
  const res = await request.get(path);
  const text = await res.text();
  console.log(`API GET ${path} response:`, text);
  if (!res.ok()) throw new Error(`GET ${path} failed\n${res.status()} ${res.statusText()}\n${text}`);
  return JSON.parse(text) as T; // allow ok:false with HTTP 200
}

function pipeConsole(page: Page) {
  page.on('console', (msg) => {
    console.log(`[page:${msg.type()}]`, msg.text());
  });
}

test.describe('Invite Flow', () => {
  test('happy path: accept unique team, see league header', async ({ page, request }) => {
    pipeConsole(page);

    // Create league
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

    // Include leagueId in URL so the Accept page is deterministic
    await page.goto(`/invites/${token}?leagueId=${encodeURIComponent(leagueId)}`);
    await expect(page.getByRole('heading', { name: 'Join Test Invite League' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept Invite' })).toBeVisible();

    // Click accept → expect redirect to /leagues/:leagueId and see league header
    await page.getByRole('button', { name: 'Accept Invite' }).click();
    await expect(page).toHaveURL(/\/leagues\/[^/]+/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Test Invite League' })).toBeVisible();
  });

  test('used token is reported as used by the API', async ({ request }) => {
    const leagueResponse: LeagueResponse = await apiPOST(request, '/api/test/leagues', {
      name: 'Used Token League',
      sport: 'nfl',
      season: '2025',
    });
    const leagueId = leagueResponse.league!.id;

    const inviteResponse: InviteResponse = await apiPOST(request, '/api/test/invites', {
      leagueId,
      email: 'member@example.com',
    });
    const token = inviteResponse.invite!.token;

    const accept1 = await apiGET<ApiResponse<unknown>>(request, `/api/test/invites?action=accept&token=${token}`);
    expect(accept1.ok).toBe(true);

    const accept2 = await apiGET<ApiResponse<unknown>>(request, `/api/test/invites?action=accept&token=${token}`);
    if (!accept2.ok) {
      expect(accept2.error ?? '').toContain('already accepted');
    } else {
      const status = await apiGET<ApiResponse<unknown>>(request, `/api/test/invites?action=status&token=${token}`);
      expect(status.ok).toBe(true);
      expect(status.status).toBe('used');
    }
  });
});
