# Data Model & Access

## Entities

- User, League, LeagueMember, Invite, Team, Pick, Game, Ruleset

## Key Constraints

- Unique team name per (league_id)
- Invite token one-time use (consumed_at not null after success)
- All list endpoints return arrays

## RLS Principles

- Users read/write only their data; league admins manage league scope
- Invites: invited_user or league admin may read; only admins revoke

## Migrations

- All schema/policy changes via versioned SQL in /supabase/migrations
