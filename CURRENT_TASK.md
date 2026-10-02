# Current Task: F055 — Version history

**Status**: NOT STARTED

## Description
Live editable architecture version and immutable numbered snapshots with semantic version labels, timestamping, creator tracking, and immutability invariants.
- Feature ID: F055
- Phase: 07 — Versioning
- Dependencies: Phase 03, Phase 06
- Acceptance criteria:
  - Live editable version + immutable numbered snapshots
  - Test: snapshot stays immutable while live edits continue.

## Next Steps
1. Review `PHASE-07-VERSIONING.md` for F055 acceptance criteria.
2. In `packages/domain/src/`, implement version history engine (`version-history.ts`):
   - Version snapshot entities (`VersionSnapshot`, `SnapshotId`).
   - Live version mutability vs snapshot freeze.
   - Operations: `createNumberedSnapshot`, `getSnapshot`, `listSnapshots`, `verifySnapshotIntegrity`.
   - Invariants: Any mutation attempt on a snapshot throws `SnapshotImmutableError`.
   - Unit tests in `packages/domain/src/version-history.test.ts`.
3. In `apps/web/`, implement version history UI components:
   - `<VersionHistoryModal />` or `<VersionTimeline />` displaying live vs snapshot releases.
   - `<SnapshotBadge />` chip displaying snapshot number/tag and immutable status.
   - Web integration specs in `apps/web/version-history.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
