# Current Task: F089 — Failure simulation

**Status**: NOT STARTED

## Description
Architecture failure simulation engine for DiagramHQ (Phase 11 — Drift and Governance):
- Mark one or more model objects as "down" / simulated failure
- Highlight the blast radius with severity (using F088's blast-radius analysis)
- Distinguish fallback vs no-fallback paths in the highlighted impact graph
- Acceptance criteria:
  - Mark an object down; highlight the blast radius with severity; distinguish fallback vs no-fallback
  - Test: simulate a DB outage; downstream flagged; fallbacks distinguished.

- Feature ID: F089
- Phase: 11 — Drift and Governance
- Dependencies: F088

## Next Steps
1. In `packages/domain/src/`, implement `failure-simulation.ts`:
   - `SimulationConfig`: set of downed node IDs + optional metadata (reason, simulated-at timestamp)
   - `SimulatedImpact` per node: status (degraded/down/fallback/healthy), cascadeChain, reason
   - `simulateFailure(model, config)` → `FailureSimulationReport` with: per-node impact status, full blast-radius summary, fallback-capable vs no-fallback counts, affected customer journeys
   - Unit tests in `packages/domain/src/failure-simulation.test.ts`
2. In `apps/web/`, implement canvas UI:
   - `<FailureSimulationModal />` in `apps/web/components/canvas/failure-simulation-panel.tsx`
   - Integration specs in `apps/web/failure-simulation.spec.tsx`
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
