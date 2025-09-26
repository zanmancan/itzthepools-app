# ROADMAP

- Invite → Create Account → Join League (DONE when E2E green)
- League creation & admin basics
- NFL weekly picks v1 (cutoff, autopick)
- Event logging → future warehouse
- Multi-sport onboarding copy (PGA, word/crossword)

## NEXT (two-week sprint)

- [ ] Two signup pages (invite/general)
- [ ] Accept API (arrays; one-time; 401/403/409/410)
- [ ] Dashboard: invites panel + banner + revoke (partially done; wire to real backend later)
- [ ] Playwright golden path + negatives (baseline in place)
- [ ] ADRs: arrays, ET, unique names, one-time tokens

## Day 7 Additions

- Kebab menu on “My Leagues” with Open / Invite / Settings (Invite wired; others stubbed)
- Auth guard for `/leagues/:id/invites/bulk` (403 visible to non-admin)
- DevSafetyBadge renders when NEXT_PUBLIC_E2E_DEV_SAFETY=1
- Dual-backend flag scaffold: `USE_SUPABASE` (no logic change)

## Day 8 Targets (proposal)

- Wire **Open** and **Settings** from Kebab (routes + placeholder pages)
- Replace in-memory invite store with Supabase tables (behind `USE_SUPABASE`)
- Minimal “league header” page skeleton (`/leagues/:id`) with owner/non-owner states
- CI polish: cache Playwright, upload trace on failure
