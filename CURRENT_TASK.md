# Current Task: F063 — Architecture generation

**Status**: NOT STARTED

## Description
Natural language architecture synthesis engine. Transforms high-level requirements or prompts into complete, valid architecture models (objects, connections, descriptions, technologies, tags, flows, diagrams, docs) delivered as a proposed change set that humans review and apply.
- Feature ID: F063
- Phase: 08 — AI Copilot
- Dependencies: Phase 03, Phase 04, Phase 05, Phase 07, F062
- Acceptance criteria:
  - NL prompt -> objects/connections/descriptions/technologies/tags/flows/diagrams/docs as a proposed changeset
  - Test: a prompt yields a valid model on apply.

## Next Steps
1. Review `PHASE-08-AI-COPILOT.md` for F063 acceptance criteria.
2. In `packages/domain/src/`, implement architecture generation engine (`ai-generation.ts`):
   - Interfaces: `ArchitectureGenerationPrompt`, `GeneratedArchitectureProposal`, `generateArchitectureFromPrompt`, `applyGeneratedProposalToModel`.
   - Generates fully populated objects, connections, technologies, tags, flows, and docs.
   - Unit tests in `packages/domain/src/ai-generation.test.ts`.
3. In `apps/web/`, implement AI Generation Modal and preview workflow:
   - `<AIGenerationModal />` and `<GenerationProposalPreview />`.
   - Web integration specs in `apps/web/ai-generation.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
