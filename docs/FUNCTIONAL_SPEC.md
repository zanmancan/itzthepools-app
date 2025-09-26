# Functional Spec — itzThePools (Day 7 Snapshot)

This spec lists acceptance criteria in Given/When/Then form and tags each with an ID (TID-###). We also mark which criteria are covered by E2E today.

## Leagues: Kebab actions

- **TID-001** (COVERED)

  - **Given** I am on Dashboard with at least one league row
  - **When** I click the kebab and choose **Invite**
  - **Then** I am routed to `/leagues/:id/invites/bulk`

- **TID-002** (Future)

  - **Given** I open the kebab
  - **When** I click **Open**
  - **Then** I am routed to `/leagues/:id`

- **TID-003** (Future)
  - **Given** I open the kebab
  - **When** I click **Settings**
  - **Then** I am routed to `/leagues/:id/settings`

## Bulk Invites: Auth Guard

- **TID-010** (COVERED)

  - **Given** I am not an admin/owner of the league
  - **When** I visit `/leagues/:id/invites/bulk`
  - **Then** I see a visible 403 indication (guard banner)

- **TID-011** (COVERED)
  - **Given** I am the league owner
  - **When** I visit `/leagues/:id/invites/bulk`
  - **Then** I see the bulk invites page

## Bulk Invites: Form basics

- **TID-020** (COVERED)

  - **Given** the bulk invites UI
  - **When** I paste 3 valid emails and click **Send Invites**
  - **Then** I see 3 list items under `[data-testid="bulk-result"]`

- **TID-021** (COVERED)
  - **Given** the bulk invites UI
  - **When** I include invalid emails
  - **Then** I see a toast containing the text “Invalid emails”

## Dashboard: Invites listing & revoke

- **TID-030** (COVERED)

  - **Given** invites were created for my league
  - **When** I view the dashboard
  - **Then** I see rows under `[data-testid="pending-invites"]`

- **TID-031** (COVERED)

  - **Given** I am the owner of a league with pending invites
  - **When** I view the dashboard
  - **Then** I see a **Revoke** button on those rows

- **TID-032** (COVERED)
  - **Given** I click **Revoke**
  - **When** the revoke succeeds
  - **Then** the invite disappears from the list

## Accessibility & Dev flags

- **TID-040** (COVERED)
  - **Given** NEXT_PUBLIC_E2E_DEV_SAFETY=1
  - **When** I load any page
  - **Then** a subtle DEV badge is visible

> E2E coverage: TID-001, 010, 011, 020, 021, 030, 031, 032, 040.
