# Current Task: F066 — Impact analysis

**Status**: NOT STARTED

## Description
AI-driven architectural impact analysis engine. Computes and narratively explains the complete blast radius when an architecture object is modified, upgraded, or removed:
- Graph traversal calculating direct and indirect downstream dependents and upstream dependencies
- Affected flows (flows executing through the target object or its connections)
- Affected stakeholder teams (teams owning impacted objects)
- Critical paths and single-point-of-failure (SPOF) risks
- AI-synthesized narrative matching the computed structural impact set exactly
- Strict invariant: AI impact summary matches the mathematically computed graph impact set.

- Feature ID: F066
- Phase: 08 — AI Copilot
- Dependencies: Phase 03, Phase 04, Phase 05, Phase 07, F059, F062
- Acceptance criteria:
  - Select an object -> direct/indirect deps, affected flows/teams/APIs, critical paths, narrated
  - Test: AI impact matches the computed set.

## Next Steps
1. In `packages/domain/src/`, implement AI impact analysis engine (`ai-impact.ts`):
   - Interfaces: `ImpactAnalysisResult`, `analyzeObjectImpact`, `narrateImpactSummary`.
   - Unit tests in `packages/domain/src/ai-impact.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<ImpactAnalysisDrawer />` and `<ImpactGraphPreview />`.
   - Integration specs in `apps/web/ai-impact.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
