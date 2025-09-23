# The Pools — Product Brief

## Vision

A platform for creating and running custom pools (NFL, PGA, word/crossword, etc.) with invite-based leagues, simple onboarding, and dependable scoring.

## Target Users

- Commissioners: create leagues, manage invites, set rules.
- Players: join via invite, make picks, view standings.

## Core Value Propositions

- Frictionless invites → join in 1–2 steps.
- Flexible rulesets per sport.
- Trustworthy scoring and visibility.
- Scales beyond NFL; Sheets optional for reporting, not the system of record.

## Scope (next 90 days)

- ✅ Invite → Create Account → Join League (golden path)
- ⏳ League creation & admin basics
- ⏳ NFL weekly picks v1 (cutoff logic, autopick)
- ⏳ Data model & RLS foundation for multi-sport
- ⏳ Basic dashboard & notifications

## Out of Scope (for now)

- Real-money gaming
- Public league discovery
- Complex live odds integrations

## Success Metrics

- Time to join from invite < 90 seconds
- Error rate on accept < 0.5%
- 95th percentile page load < 2.5s on preview/prod
