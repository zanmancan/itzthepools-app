# 0001 — API lists return arrays

**Problem**  
Inconsistent API response shapes (sometimes singletons) caused UI branching and regressions.

**Decision**  
All list endpoints return arrays. Empty results are `[]`, never `null` or a singleton object.

**Consequences**

- UI has a single code path for lists; no special-casing singletons.
- Tests assert arrays (including empty).
- Any change that violates this fails type checks and E2E.
