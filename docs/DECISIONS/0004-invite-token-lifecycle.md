# 0004 — Invite token lifecycle (one-time use)

**Problem**  
Tokens were reusable or unclear when expired/consumed, causing accidental multi-joins and security risk.

**Decision**  
Tokens are **one-time**: on successful accept, set `consumed_at`. Expired/reused returns **410 GONE** (or **409 USED** where appropriate). Never allow reuse.

**Consequences**

- DB: `consumed_at` column + indexes; queries filter on unconsumed & unexpired.
- RLS ensures only invited user and league admins can read appropriate invites; only admins revoke.
- API maps errors to `{ ok:false, code:"EXPIRED"|"USED"|... }`; tests cover 410/409 paths.
