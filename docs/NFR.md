# Non-Functional Requirements

## Performance

- P95 TTFB < 500ms (API), P95 page load < 2.5s (preview/prod)

## Reliability

- Accept flow idempotent: double-clicks don’t create duplicate membership
- Retries safe on network errors

## Security

- Supabase RLS enforces least privilege
- Invite tokens are hashed at rest; one-time use

## Observability

- Structured logs for accept/revoke (league_id, token_last4, user_id)
- Error surfaces show code/message to user; logs capture stack/context

## Data

- Postgres/Supabase as OLTP source of truth
- Event log for picks/outcomes to enable future warehouse sync
- Sheets used for reports only (optional)
