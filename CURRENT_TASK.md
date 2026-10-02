# Current Task: F048 — Real-time collaboration

**Status**: NOT STARTED

## Description
Live multi-user editing with conflict resolution (CRDT / Operational Transformation or state sync with deterministic conflict resolution).
- Feature ID: F048
- Phase: 06 — Collaboration
- Acceptance criteria:
  - Multiple users edit live; conflict resolution (CRDT/OT)
  - Test: two clients: an edit in one appears in the other.

## Next Steps
1. Review `PHASE-06-COLLABORATION.md` for F048 acceptance criteria.
2. In `packages/domain/src/`, implement collaborative document / operational message state machine (`createCollabSession()`, `applyRemoteOperation()`, `broadcastLocalOperation()`, deterministic LWW/CRDT or vector-clock conflict resolution).
3. In `apps/web/`, implement collaborative room hook/store and synchronization transport simulation.
4. Add unit and integration tests verifying concurrent multi-client edits and convergence.
5. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
