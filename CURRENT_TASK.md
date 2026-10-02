# Current Task: F059 — Architecture changes

**Status**: NOT STARTED

## Description
Architecture change set engine and impact analysis computing comprehensive change sets (added, modified, removed entities) and affected downstream sets: affected objects (direct and indirectly connected), affected flows (flows traversing changed connections or objects), and affected teams (teams owning the affected objects).
- Feature ID: F059
- Phase: 07 — Versioning
- Dependencies: F054, F055, F056, F057, F058
- Acceptance criteria:
  - A change lists added/modified/removed + affected counts (objects, flows, teams)
  - Test: a change reports the correct affected sets.

## Next Steps
1. Review `PHASE-07-VERSIONING.md` for F059 acceptance criteria.
2. In `packages/domain/src/`, implement architecture change set engine (`changes.ts`):
   - Interfaces: `ArchitectureChangeSet`, `AffectedSets` (affected objects, affected flows, affected teams), `createArchitectureChangeSet`, `calculateAffectedSets`.
   - Unit tests in `packages/domain/src/changes.test.ts`.
3. In `apps/web/`, implement change impact analysis drawer and badges:
   - `<ChangeSetSummary />` and `<ImpactAnalysisBadge />`.
   - Web integration specs in `apps/web/changes.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
