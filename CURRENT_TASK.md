# Current Task: F049 — Presence

**Status**: NOT STARTED

## Description
Real-time user presence, live cursors, remote selection, current-object indicators, and peer badges.
- Feature ID: F049
- Phase: 06 — Collaboration
- Acceptance criteria:
  - Cursors, selection, current-object, presence indicators
  - Test: presence shows both users + cursors.

## Next Steps
1. Review `PHASE-06-COLLABORATION.md` for F049 acceptance criteria.
2. In `packages/domain/src/`, implement presence state types and pure management functions:
   - `UserPresence` (userId, userName, userColor, avatarUrl, cursor: {x, y, viewId} | null, selectedObjectIds: string[], currentObjectId: string | null, lastActiveAt: number)
   - Pure presence manager: `createPresenceState()`, `updateLocalPresence()`, `updateRemotePresence()`, `removePresencePeer()`, `pruneInactivePeers()`, `filterPresenceByView()`.
   - Unit tests in `packages/domain/src/presence.test.ts`.
3. In `apps/web/`, implement canvas presence overlay:
   - `<PresenceCursors />`: live animated cursors with name tags and color branding.
   - Remote selection outlines / halos on canvas nodes.
   - Presence indicators / avatars in toolbar / header.
   - Web integration specs in `apps/web/presence.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
