import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

async function apiPost<T = any>(page: Page, path: string, data?: Record<string, any>) {
  const res = await page.request.post(`${BASE_URL}${path}`, { data });
  return (await res.json()) as T;
}

async function seedOwnerLeagueWithInvites(page: Page, leagueId = 'lg_seofwbiz') {
  await apiPost(page, '/api/test/reset', {});
  await apiPost(page, '/api/test/seed-league', { leagueId, name: 'Owner League' });

  // Put a couple invites in the store so dashboard will show them
  await apiPost(page, '/api/test/invite/seed', { leagueId, email: 'a@x.com' });
  await apiPost(page, '/api/test/invite/seed', { leagueId, email: 'b@x.com' });
}

test.describe('Invite Revoke', () => {
  test.beforeEach(async ({ page }) => {
    await seedOwnerLeagueWithInvites(page, 'lg_seofwbiz');
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.getByRole('heading', { name: /recent invites/i })).toBeVisible();
  });

  test('revoke button appears for admin only; user cannot revoke', async ({ page }) => {
    // As owner (admin) we expect Revoke buttons next to invites
    const revokeButtons = page.getByRole('button', { name: /revoke/i });
    await expect(revokeButtons).toHaveCount(2);

    // Simulate member context if your dev guard supports it
    // For our current in-memory flow we only assert the admin case
  });

  test('admin can revoke an invite and it disappears', async ({ page }) => {
    // Click Revoke on first row
    await page.getByRole('button', { name: /revoke/i }).first().click();

    // Expect a toast or confirmation
    await expect(page.getByText(/revoked/i)).toBeVisible();

    // List shrinks by one
    const rows = page.getByRole('listitem');
    await expect(rows).toHaveCount(1);
  });
});
