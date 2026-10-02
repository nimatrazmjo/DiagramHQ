# Current Task: F118 — Scenarios

**Status**: NOT STARTED

## Description
What-if architectural scenarios branching for hypothetical comparisons without committing or mutating the real model / main architecture branch.
- Feature ID: F118
- Phase: 07 — Versioning
- Dependencies: F055, F057, F058, F061
- Acceptance criteria:
  - Current vs proposed scenarios without touching the real model
  - Test: create a scenario; compare without mutating main.

## Next Steps
1. Review `PHASE-07-VERSIONING.md` for F118 acceptance criteria.
2. In `packages/domain/src/`, implement what-if scenario engine (`scenarios.ts`):
   - Interfaces: `ArchitectureScenario`, `createScenario`, `applyScenarioHypotheticalChange`, `compareScenarioWithMain`.
   - Ensure changes in a scenario never mutate base / main branch.
   - Unit tests in `packages/domain/src/scenarios.test.ts`.
3. In `apps/web/`, implement scenario comparison components:
   - `<ScenarioSelector />` and `<ScenarioComparisonModal />`.
   - Web integration specs in `apps/web/scenarios.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
