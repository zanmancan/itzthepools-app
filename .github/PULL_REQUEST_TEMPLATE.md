# Summary

<!-- What changed and why (1–3 sentences). Link an issue if you have one. -->

Fixes: #

---

## Checklist — Invite / Account / League flows

**UI & UX**

- [ ] Dashboard shows **InvitesPanel** (list) and **PendingInviteBanner** (count + CTA).
- [ ] **Revoke** button is visible to owner/admin and disabled/hidden otherwise.
- [ ] Invite **Create Account** page renders when arriving via a valid invite link (shows league context).
- [ ] General **Create Account** page renders for non-invite signups (no league context).
- [ ] After invite auth, user lands on **Team Name & Accept**, not generic dashboard.

**API Contracts (arrays only & error codes)**

- [ ] All list endpoints return arrays (empty is `[]`), not singletons.
- [ ] `/api/invites/accept` uses `{ ok:true|false, ... }` and maps errors to:
  - 401 unauthenticated
  - 403 forbidden (not allowed)
  - 404 not found
  - 409 conflict (duplicate team name / already member)
  - 410 gone/expired (expired or reused token)

**Data & RLS (security)**

- [ ] One-time tokens enforced (`consumed_at` set on success; no reuse).
- [ ] RLS allows: invited user reads own invites; league owner/admin reads league invites; only admins may revoke.
- [ ] Any schema/policy change has a **versioned SQL migration** in `supabase/migrations/`.

**Tests & Tooling**

- [ ] Playwright **golden-path** passes on preview: invite → create account → accept → member visible.
- [ ] Negative tests covered: duplicate team → 409; expired/reused token → 410/409; unauth → 401.
- [ ] Lint & typecheck pass locally and in CI.

**Docs & Decisions**

- [ ] Updated relevant ADR(s) in `DECISIONS/` if behavior or rules changed.
- [ ] Acceptance criteria referenced/updated in `docs/TEST_PLAN.md` if scope changed.
- [ ] If scope was narrowed, follow-ups listed in PR description.

---

## Manual Test Plan (quick clicks)

<!-- Bullet steps the reviewer can follow locally or on the preview URL. -->

1.
2.
3.

---

## Screenshots / Clips (if UI changed)

<!-- Drop images or a short Loom/gif. -->

---

## Risk & Rollback

- [ ] Minimal blast radius (files limited to scope).
- [ ] Rollback plan identified (revert commit or migration down notes).
