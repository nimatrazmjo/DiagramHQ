# F115 — Persona modes — PR Review

## Evaluator Pass (Checker role)

Diff reviewed against acceptance criteria in `PHASE-04-DIAGRAMS-AND-VIEWS.md` (F115 section). Commands re-run independently.

### Files changed
- `packages/domain/src/persona-view.ts` — pure projection function, no side effects.
- `packages/domain/src/persona-view.test.ts` — unit test; passes.
- `apps/web/components/canvas/persona-badges.tsx` — new badge component, consistent with existing badge pattern.
- `apps/web/components/canvas/app-node.tsx` — import + render of `<PersonaBadges />` added.
- `apps/web/components/canvas/system-node.tsx` — import + render added (both external + internal system sections).
- `apps/web/components/canvas/database-node.tsx` — import + render added.
- `apps/web/components/canvas/component-node.tsx` — import + render added.
- `apps/web/persona-modes.spec.ts` — 3 integration tests; all pass.

### Acceptance criteria check
- ✅ Modes: architect, developer, security, SRE, data, product, executive, auditor — all 8 in `PersonaMode` union type; all 8 in `PERSONA_CONFIG` map with distinct icon + colour.
- ✅ A persona re-scopes the render without changing the model — `projectPersonaViewToCanvas` spreads a new node/edge array; `model.objects` not mutated; verified by `hasOwnProperty` assertion in spec.

### Verification evidence
```
pnpm verify  →  exit 0
  typecheck: clean (all 4 packages)
  lint: clean (no ESLint errors)
  tests: 280 web tests passed, 256 API tests passed
  check-architecture: clean
pnpm build   →  exit 0 (Next.js build, all routes compiled)
commit: 35c4621 on feat/F115-persona-modes
```

### Evaluator scores (rubric: verification/evaluator-rubric.md)
```
Feature: F115
Scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5  => avg 5.0
Verdict: PASS
```

### Findings
None. PR is clean.

Approved.
