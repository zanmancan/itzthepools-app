# 0003 — Unique team names per league

**Problem**  
Duplicate team names created ambiguity in standings and invitations.

**Decision**  
Enforce unique team names per `league_id` (DB unique index). API rejects duplicates with **409** and a helpful message.

**Consequences**

- DB migration adds `(league_id, team_name)` unique index.
- UI validates and surfaces a clear 409 error with guidance.
- Tests cover duplicate submission path.
