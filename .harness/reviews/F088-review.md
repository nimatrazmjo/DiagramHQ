# F088 — Blast-Radius Analysis — Review

**Status**: APPROVED  
**Date**: 2026-10-02  
**Reviewer**: Harness Auto-Review

## Acceptance Criteria Checklist

- [x] Counts: services, flows, databases, teams, customer-facing features
- [x] Test: blast-radius counts are correct (3 unit tests pass)
- [x] Reverse BFS correctly traverses from failing node to upstream dependents
- [x] Severity classification: critical/high/medium/low based on customer impact + fallback presence
- [x] `hasCriticalPath` correctly set when customer-facing node has no fallback
- [x] Canvas UI: `<BlastRadiusModal />` with target selector, severity banner, metrics, impacted node list
- [x] 3 domain unit tests — all pass
- [x] 3 web integration tests — all pass
- [x] Exported from `@diagramhq/domain` and canvas `index.ts`

## Notes

- The reverse adjacency list correctly inverts A→B edges to B→A for upstream reachability.
- Severity logic: `customerFacingCount > 0 && hasCriticalPath` → critical; just `customerFacingCount > 0` → high; this is the right order (critical is strongest).
- `impactedDatabaseCount` counts `store` kind nodes in the upstream blast radius — relevant when a DB directly depends on the failing node (unusual but valid).
- All 525 web tests pass with no regressions.

## Verdict

COMPLETE — merged to `main`.
