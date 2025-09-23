# Test Plan — Golden Paths & Negatives

## Assumptions (time & contracts)

- All **list** endpoints return **arrays**. Empty is `[]`, never `null` or a singleton.
- Timestamps are stored in **UTC**; business logic (deadlines/locks) evaluates in **ET (America/New_York)**.
- **User-visible times display in the user’s local timezone (local-only)**.
- Errors surface as `{ ok:false, code, message }`. Success is `{ ok:true, ... }`.

## Test data / setup

- Tests run against **Netlify Preview** in CI (`BASE_URL` set by workflow); locally use `http://localhost:3000`.
- A safe **test seed** path or RPC exists to create a league, an invite, and a test user.
- Components include stable `data-testid` hooks:
  - `invites-panel`, `invite-row`, `pending-invite-banner`, `league-header`, etc.

## Golden path — Invite → Create Account → Accept → Member visible

1. **Seed**: create league + invite for `test+invited@example.com`.  
   _Expect_: seed returns an invite URL and league name.
2. **Navigate** to the **invite URL**.  
   _Expect_: **Invite Create Account** page renders with league context (name/ruleset/season).
3. **Auth** (mock/test login or injected session).  
   _Expect_: still on the invite flow (not dumped to a generic dashboard).
4. **Enter unique team name** and click **Accept**.  
   _Expect_: 200 `{ ok:true, ... }`; redirect to league page; **league header** shows league name.
5. **Dashboard** (user’s home).  
   _Expect_: **InvitesPanel** visible (`data-testid="invites-panel"`), **PendingInviteBanner** hidden if no pending invites; previously accepted invite no longer appears.

## Negative paths (must be covered)

1. **Duplicate team name**
   - Submit an existing team name in that league.  
     _Expect_: **409**; toast with guidance; remains on accept page; no membership created.
2. **Expired token**
   - Use an invite with `expires_at` in the past.  
     _Expect_: **410 GONE**; clear error state; no membership created.
3. **Reused token**
   - Accept once (consumes token), then try again.  
     _Expect_: **410/409 (USED)**; clear error; no side effects.
4. **Unauthenticated accept**
   - Call accept without a valid session.  
     _Expect_: **401**; friendly prompt to sign in; no side effects.
5. **Authorization for revoke**
   - Non-admin tries to revoke.  
     _Expect_: **403**; error toast; invite remains.
6. **Arrays-only contract**
   - `GET /api/invites` with none pending.  
     _Expect_: `{ data: [], error: null }` (empty array, not null/singleton).

## Stability hooks (avoid flaky tests)

- Prefer `getByTestId` selectors:
  - `pending-invite-banner`, `invites-panel`, `invite-row`, `league-header`.
- Use explicit `expect(...).toBeVisible()`/`toHaveText()` over time-based waits.
- Keep formatting assertions resilient to locale (don’t hard-assert full date strings; assert presence of key text and element visibility).

## CI integration (required checks)

- Playwright runs against **Netlify Preview** URL via `BASE_URL`.
- Jobs: **lint**, **typecheck**, **Playwright** must pass before merge.
- Seed step is gated to CI/dev only (no prod exposure).

## Manual smoke (Reviewer quick clicks)

1. Click an invite link → see **Invite Create Account** with league context.
2. Sign in (test route or temporary magic link) → remain in invite flow.
3. Accept with a new team name → redirected to league; see **league header**.
4. Go to dashboard → **InvitesPanel** present; accepted invite gone; **Revoke** visible for admin.
