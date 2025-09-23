# 0002 — Time handling: ET for logic, local-only for display

**Problem**  
Cutoffs and automations varied by environment and DST. Users expect times in their own timezone, while rules must be consistent.

**Decision**

- Store all timestamps in **UTC**.
- Evaluate business logic and official deadlines in **ET (America/New_York)**.
- **UI displays local time only** (browser timezone). No dual-time in end-user UI.
- Admin/logs/tests may reference ET for audit and determinism.

**Consequences**

- Tests pin to ET instants; helpers convert ET↔UTC for persistence and UTC↔Local for display.
- Admin tools and logs show ET explicitly; users only see local times.
- A small time helper is required and imported where dates are shown or computed.
