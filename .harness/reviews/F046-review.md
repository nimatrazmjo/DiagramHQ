# F046 — Data flows — PR Review

## Evaluator Pass (Checker role)

Diff reviewed against acceptance criteria in `PHASE-05-FLOWS.md` (F046 section). Commands independently run and verified.

### Files changed
- `packages/domain/src/types.ts` — `Flow` extended with `dataClassification`, `dataElements`; `FlowStep` extended with `dataElements`, `transformation`, `dataClassification`; `DataLineageHop` and `DataLineageTrace` declared.
- `packages/domain/src/flow.ts` — `createDataFlow` factory, `annotateDataFlowStep` annotator, `extractDataLineage` function mapping hops, filtering elements, and detecting external exits (F091).
- `packages/domain/src/flow-playback.ts` — `getDataFlowPlaybackStepInfo` helper for runtime step payload inspection during playback.
- `packages/domain/src/flow-view.ts` — `FlowEdgeData` and `flowMetadata` pass data classification, data elements, and transformation notes.
- `packages/domain/src/data-flows.test.ts` — 5 unit tests covering flow creation, step annotations, step-by-step playback, lineage extraction with external exit detection, and canvas projection; all pass.
- `apps/web/components/canvas/data-flow-overlay.tsx` — canvas overlay card for data pipelines and lineage inspection.
- `apps/web/components/canvas/index.ts` — export added.
- `apps/web/data-flows.spec.tsx` — 5 web integration tests; all pass.

### Acceptance criteria check
- ✅ **Data-flow type; feeds data lineage (F091)** — verified by domain data flow model, lineage hop extraction, and external egress detection.
- ✅ **Test: a data flow plays back** — verified by 5 domain unit tests and 5 web integration tests.

### Verification evidence
```
pnpm typecheck   → exit 0 (all workspace packages clean)
pnpm lint        → exit 0 (ESLint clean)
pnpm test        → exit 0 (796 tests passed across domain, web, api)
pnpm check-architecture → clean (layer boundaries strictly preserved)
pnpm build       → exit 0 (all routes and packages compiled cleanly)
```

### Evaluator scores (rubric: verification/evaluator-rubric.md)
```
Feature: F046
Scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5  => avg 5.0
Verdict: PASS
```

### Findings
None. Data flows cleanly bridge model connections, flows, and data lineage without introducing architectural debt.

Approved.
