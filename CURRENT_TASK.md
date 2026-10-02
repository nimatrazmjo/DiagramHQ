# Current Task: F065 — Architecture explanation

**Status**: NOT STARTED

## Description
Multi-altitude architecture explanation engine. Generates grounded explanations of systems, flows, components, and architectural decisions tailored to specific audience altitudes:
- Technical altitude (Engineer / Tech Lead): Detailed protocol, synchronous vs asynchronous semantics, data structures, concurrency, failure modes, error handling.
- Architectural altitude (Solutions / Enterprise Architect): Component boundaries, coupling, patterns, data ownership, integration topologies, scalability trade-offs.
- Executive altitude (VP / CTO): Business value, operational cost, reliability posture, team ownership, risk factors, time-to-market.
Strict invariant: All generated explanations must be grounded in and directly cite real model entities (objects, connections, flows, ADRs).

- Feature ID: F065
- Phase: 08 — AI Copilot
- Dependencies: Phase 03, Phase 04, Phase 05, Phase 07, F062, F063, F064
- Acceptance criteria:
  - Explain a system/flow/decision at a chosen altitude (engineer -> CTO)
  - Test: explanation references real objects.

## Next Steps
1. In `packages/domain/src/`, implement architecture explanation engine (`ai-explanation.ts`):
   - Types: `AudienceAltitude` ('engineer' | 'architect' | 'executive'), `ExplainTarget` (system, flow, object, adr), `ArchitectureExplanation`.
   - Core functions: `explainArchitectureAtAltitude`, `extractReferencedEntities`.
   - Unit tests in `packages/domain/src/ai-explanation.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<ExplanationAltitudeSelector />` and `<ArchitectureExplanationPanel />`.
   - Integration specs in `apps/web/ai-explanation.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
