# Current Task: F064 — Natural-language editing

**Status**: NOT STARTED

## Description
Natural-language architectural editing engine. Supports precise natural-language modifications to existing architecture models (e.g., 'add Redis between A and B', 'swap Postgres for DynamoDB', 'remove obsolete auth proxy'). Strictly adheres to the core architecture rule: every AI edit is presented as an explicit proposed change set (added, modified, removed entities) with clear Apply and Reject actions. Rejecting changes nothing; applying updates the live model.
- Feature ID: F064
- Phase: 08 — AI Copilot
- Dependencies: Phase 03, Phase 04, Phase 05, Phase 07, F062, F063
- Acceptance criteria:
  - NL edit -> explicit added/modified/removed with Apply/Reject; never silent
  - Test: 'add Redis between A and B' proposes exactly that; Reject changes nothing.

## Next Steps
1. Review `PHASE-08-AI-COPILOT.md` for F064 acceptance criteria.
2. In `packages/domain/src/`, implement NL editing engine (`ai-editing.ts`):
   - Interfaces: `NLEditInstruction`, `NLEditProposal`, `generateEditProposalFromInstruction`, `applyEditProposal`, `rejectEditProposal`.
   - Recognizes additions (e.g., "add Redis between A and B"), modifications (tech stack / label edits), and removals.
   - Unit tests in `packages/domain/src/ai-editing.test.ts`.
3. In `apps/web/`, implement canvas UI components and edit proposal preview:
   - `<NLEditModal />` and `<NLEditProposalCard />`.
   - Integration specs in `apps/web/ai-editing.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
