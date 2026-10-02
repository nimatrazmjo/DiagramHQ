# Current Task: F056 — Architecture snapshots

**Status**: NOT STARTED

## Description
Full-state architecture snapshot capture across all model entities: objects, connections, views, flows, metadata, and documentation with complete restoration back to active architecture state.
- Feature ID: F056
- Phase: 07 — Versioning
- Dependencies: F055
- Acceptance criteria:
  - A snapshot captures objects, connections, views, flows, metadata, documentation
  - Test: a snapshot restores to the captured state.

## Next Steps
1. Review `PHASE-07-VERSIONING.md` for F056 acceptance criteria.
2. In `packages/domain/src/`, implement full-state architecture snapshot engine (`snapshots.ts`):
   - Full state snapshot interface: `ArchitectureFullSnapshot` capturing objects, connections, views, flows, metadata, documentation.
   - Operations: `captureFullArchitectureSnapshot`, `restoreFullArchitectureSnapshot`, `compareSnapshots`.
   - Unit tests in `packages/domain/src/snapshots.test.ts`.
3. In `apps/web/`, implement snapshot restore and inspector UI:
   - `<SnapshotRestoreDialog />` or snapshot detail modal.
   - Web integration specs in `apps/web/snapshots.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
