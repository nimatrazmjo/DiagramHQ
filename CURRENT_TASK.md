# Current Task: F046 — Data flows

**Status**: NOT STARTED

## Description
Data-flow type; feeds data lineage (F091).
- Flow type: `data_flow`
- Acceptance criteria:
  - Data-flow type; feeds data lineage (F091)
  - Test: a data flow plays back.

## Next Steps
1. Review `PHASE-05-FLOWS.md` for F046 acceptance criteria.
2. In `packages/domain/src/`, implement data-flow creation (`createDataFlow()`), schema/data payload attribution per step (`dataType`, `payloadSchema`, `dataClassification`), and lineage extraction helper (`extractDataLineageFromFlow()`).
3. Add domain unit tests in `packages/domain/src/data-flows.test.ts`.
4. Add web integration tests in `apps/web/data-flows.spec.tsx`.
5. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
