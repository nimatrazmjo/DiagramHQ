# Current Task: F070 — ADR generation

**Status**: NOT STARTED

## Description
AI-driven Architecture Decision Record (ADR) draft generator from proposed architecture changes and pull requests. Translates structural deltas (added, modified, removed objects and connections) into comprehensive, structured ADR proposals:
- Analyzes change sets, motivations, impacted components, and architectural trade-offs
- Drafts complete ADR fields: Title, Status (`proposed`), Context, Decision, Consequences (positive and negative), and Alternatives considered
- Links the generated ADR directly to the source change set or pull request via polymorphic attachment
- Human-in-the-loop workflow: architects review, edit, refine, and accept or reject the drafted ADR before committing to the repository
- Acceptance criteria:
  - Draft an ADR from a change; human edits + accepts
  - Test: a generated ADR links to the change.

- Feature ID: F070
- Phase: 08 — AI Copilot
- Dependencies: Phase 07 (F117 — ADR system, F059 — Changes, F060 — Pull requests)

## Next Steps
1. In `packages/domain/src/`, implement AI ADR generator engine (`ai-adr-generation.ts`):
   - Types: `GenerateADRInput`, `GeneratedADRDraft`.
   - Generator functions: `draftADRFromChangeSet(input)`, `acceptGeneratedADR(draft, modifications?)`.
   - Invariant: polymorphic attachment link directly pointing to the source change set / PR.
   - Unit tests in `packages/domain/src/ai-adr-generation.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<ADRGenerationModal />` and `<ADRDraftEditor />`.
   - Integration specs in `apps/web/ai-adr-generation.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
