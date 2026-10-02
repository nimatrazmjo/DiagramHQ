# F089 — Failure Simulation — Review

**Status**: APPROVED  
**Date**: 2026-10-02  
**Reviewer**: Harness Auto-Review

## Acceptance Criteria Checklist

- [x] Mark an object down; highlight the blast radius with severity; distinguish fallback vs no-fallback
- [x] Test: simulate a DB outage; downstream flagged; fallbacks distinguished (3 unit tests pass)
- [x] Multi-node outage simulation support via `SimulationConfig`
- [x] Fallback detection via object metadata (`hasFallback`, `fallback`, `circuitBreaker`, `redundant`)
- [x] Worst-case status resolution (`down` > `degraded` > `fallback` > `healthy`)
- [x] Disrupted edge tracking via `getAffectedConnections`
- [x] Canvas UI: `<FailureSimulationModal />` with multi-node outage selector, reason input, severity banner, 6 KPI cards, status filters, and impacted-node cards with fallback indicators
- [x] 3 domain unit tests — all pass
- [x] 3 web integration tests — all pass
- [x] Exported from `@diagramhq/domain` and canvas `index.ts`

## Notes

- Downstream impact resolution correctly runs reverse BFS from failing nodes to flag dependent services.
- Distinguishes nodes equipped with fallback resilience (`status: 'fallback'`) from vulnerable unmitigated dependencies (`status: 'degraded'`).
- UI allows dynamic outage toggling directly from the node list cards or via selector.
- All 1,272 monorepo tests pass with no regressions.

## Verdict

COMPLETE — merged to `main`.
