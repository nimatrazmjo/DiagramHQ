# Current Task: F088 — Blast-radius analysis

**Status**: NOT STARTED

## Description
Blast-radius analysis engine for DiagramHQ (Phase 11 — Drift and Governance):
- Given a target component/service/node, compute the full blast radius of a change or failure:
  - Identify all **directly dependent** services (in-degree nodes).
  - Identify all **transitively dependent** services (multi-hop upstream dependents).
  - Categorize impact by type: services, flows, databases, teams, customer-facing features.
  - Severity scoring: distinguish fallback-capable vs no-fallback paths.
- Acceptance criteria:
  - Counts: services, flows, databases, teams, customer-facing features
  - Test: blast-radius counts are correct.

- Feature ID: F088
- Phase: 11 — Drift and Governance
- Dependencies: F087

## Next Steps
1. In `packages/domain/src/`, implement `blast-radius.ts`:
   - `BlastRadiusReport` type with impactedServices, impactedFlows, impactedDatabases, impactedTeams, customerFacingCount, severityScore.
   - `computeBlastRadius(model, targetNodeId)` using reverse-traversal of the dependency graph.
   - Unit tests in `packages/domain/src/blast-radius.test.ts`.
2. In `apps/web/`, implement canvas UI:
   - `<BlastRadiusModal />` in `apps/web/components/canvas/blast-radius-panel.tsx`.
   - Integration specs in `apps/web/blast-radius.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
