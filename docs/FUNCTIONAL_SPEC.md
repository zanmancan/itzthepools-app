# The Pools — Functional Spec

## 1. Invite → Create Account → Join League

### 1.1 Summary (User Story)

As an invited player, when I click an invite link, I land on an invite-specific Create Account page, finish auth, enter a unique team name, and join the league. If the token is expired or reused, I get a clear error and next steps.

### 1.2 UX / Flows

- **Entry points**
  - Invite link → Invite Create Account page (with league context)
  - General /signup → General Create Account page (no league context)
- **States**
  - Pending invite banner on dashboard
  - Invite list with Revoke (owner/admin)
  - Errors: 401 unauth, 403 forbidden, 409 duplicate team, 410 expired/reused
- **Post-auth redirect**
  - Invite path → Team Name & Accept
  - General path → Dashboard

### 1.3 Acceptance Criteria (must be true)

- Invite URL renders the invite signup page with league name, sport/ruleset, season.
- Non-invite signup renders the general page.
- Accept with unique team name succeeds; membership created.
- Duplicate name returns 409 with guidance; no membership created.
- Expired/reused token returns 410/409; no membership created.
- Dashboard shows invites panel + banner + revoke (owner/admin).

### 1.4 API Contracts (arrays only)

- `GET /api/invites` → `{ data: Invite[], error: null }`
- `POST /api/invites/accept` →
  - **200** `{ ok:true, membership_id, league_id, team_name }`
  - **4xx** `{ ok:false, code: "UNAUTHORIZED"|"FORBIDDEN"|"NOT_FOUND"|"EXPIRED"|"ALREADY_MEMBER"|"DUPLICATE_TEAM"|"USED", message }`

### 1.5 Data & RLS

- `invites`: `id, league_id, invited_user_id/email, token_hash, expires_at, consumed_at, revoked_at`
- **Rules**
  - One-time tokens (`consumed_at` set on success)
  - Members see own invites; admins see league invites
  - Unique team names per league

### 1.6 Open Questions / Future

- Multi-sport copy variants on invite page (PGA, word/crossword)
- Optional SSO providers; magic link is baseline
