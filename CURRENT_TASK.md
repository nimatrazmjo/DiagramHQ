# Current Task: F091 — Data lineage

**Status**: NOT STARTED

## Description
Data lineage tracing and compliance path engine for DiagramHQ (Phase 11 — Drift and Governance):
- End-to-end data lineage trace from source of truth datastores to upstream consumption entrypoints and downstream pipelines
- Multi-hop data tracing across 4+ hops
- Highlight compliance zones (PII / PCI / HIPAA / GDPR) along the data path and flag compliance boundary crossings
- Acceptance criteria:
  - End-to-end trace from source of truth to consumption
  - Highlight compliance zones (PII / PCI) along the path
  - Test: trace renders across 4+ hops; compliance boundary crossings flagged.

- Feature ID: F091
- Phase: 11 — Drift and Governance
- Dependencies: F046, F090

## Next Steps
1. In `packages/domain/src/`, implement `data-lineage.ts`:
   - Data types for `DataLineageTrace`, `LineageHop`, `LineagePath`, `DataClassification`, `LineageBoundaryCrossing`
   - `traceDataLineage(model, sourceStoreId, options?)` → returns `DataLineageReport` tracing upstream sources and downstream consumers across 4+ hops with compliance zone crossings highlighted
   - Unit tests in `packages/domain/src/data-lineage.test.ts`
2. In `apps/web/`, implement canvas UI:
   - `<DataLineageModal />` in `apps/web/components/canvas/data-lineage-panel.tsx`
   - Integration specs in `apps/web/data-lineage.spec.tsx`
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
