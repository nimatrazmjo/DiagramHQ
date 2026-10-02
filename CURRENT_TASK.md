# Current Task: F068 — AI documentation

**Status**: NOT STARTED

## Description
AI-driven architectural documentation generation engine. Generates comprehensive, grounded Markdown documentation for components, services, datastores, and macro architectures:
- Object and architecture docs automatically grounded in model metadata, connection topologies, dependencies, and technology tags
- Synthesizes technical overview, integration contracts, operational runbooks, and data schemas
- Strict invariant: Generated documentation is grounded in live model objects and connections, never hallucinating or inventing non-existent endpoints.
- Auto-refresh mechanism to sync and keep docs current on model updates.

- Feature ID: F068
- Phase: 08 — AI Copilot
- Dependencies: Phase 03, Phase 04, Phase 05, Phase 07, F062, F065
- Acceptance criteria:
  - Auto-generate object/architecture docs grounded in metadata + connections; keep current on change
  - Test: generated docs are grounded, not invented.

## Next Steps
1. In `packages/domain/src/`, implement AI documentation engine (`ai-documentation.ts`):
   - Interfaces: `ArchitectureDocumentationPage`, `generateObjectDocumentation`, `generateSystemArchitectureDocumentation`, `refreshDocumentationOnModelChange`.
   - Unit tests in `packages/domain/src/ai-documentation.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<DocumentationViewerModal />` and `<AIDocumentationCard />`.
   - Integration specs in `apps/web/ai-documentation.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
