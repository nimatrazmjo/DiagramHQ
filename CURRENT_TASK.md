# Current Task: F062 — AI chat

**Status**: NOT STARTED

## Description
Persistent AI architecture assistant and grounded Q&A panel over the model. Understands architecture context (objects, connections, technologies, owners, flows) and answers user questions while citing concrete object and connection IDs.
- Feature ID: F062
- Phase: 08 — AI Copilot
- Dependencies: Phase 03, Phase 04, Phase 05, Phase 07
- Acceptance criteria:
  - Persistent panel; grounded Q&A over the model; answers cite object ids
  - Test: 'why does X depend on Y' cites the real connection.

## Next Steps
1. Review `PHASE-08-AI-COPILOT.md` for F062 acceptance criteria.
2. In `packages/domain/src/`, implement AI Copilot grounded Q&A engine (`ai-chat.ts`):
   - Interfaces: `AIChatMessage`, `AIChatContext`, `GroundedCitation`, `askArchitectureCopilot`, `resolveDependencyRationale`.
   - Cites real `ObjectId` and `ConnectionId` from the model graph.
   - Unit tests in `packages/domain/src/ai-chat.test.ts`.
3. In `apps/web/`, implement AI Copilot panel:
   - `<AICopilotPanel />` and `<AIChatMessageList />` with interactive citation badges.
   - Web integration specs in `apps/web/ai-chat.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
