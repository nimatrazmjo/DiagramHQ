# Current Task: F045 — User journeys

**Status**: NOT STARTED

## Description
User journey flow type with actor/persona context and sequence playback.
- Flow type `user_journey`
- Support actor/persona step context and journey playback
- Acceptance criteria:
  - User-journey flow type
  - Test: a user-journey flow plays back.

## Next Steps
1. Review `PHASE-05-FLOWS.md` for F045 acceptance criteria.
2. In `packages/domain/src/flow.ts`, add user-journey flow type support (`kind: 'user_journey'`), persona/actor step attribution, and journey playback helpers.
3. Add unit tests in `packages/domain/src/flow.test.ts` (and/or dedicated `user-journeys.test.ts`).
4. Add web integration tests in `apps/web/user-journeys.spec.ts`.
5. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
