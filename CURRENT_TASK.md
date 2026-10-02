# Current Task: F061 — Merge

**Status**: NOT STARTED

## Description
Architecture Branch Merge engine and conflict resolution detecting three-way merge conflicts when merging a feature branch onto main. Handles object and connection merging, detects conflicting simultaneous modifications on identical entity IDs (same object ID modified concurrently on both branches), supports conflict resolution strategies ('theirs', 'ours', 'manual'), and applies clean merges cleanly onto main.
- Feature ID: F061
- Phase: 07 — Versioning
- Dependencies: F057, F058, F059, F060
- Acceptance criteria:
  - Merge a branch onto main; conflict detection on the same object id
  - Test: merge applies to main; a conflict is detected.

## Next Steps
1. Review `PHASE-07-VERSIONING.md` for F061 acceptance criteria.
2. In `packages/domain/src/`, implement architecture merge engine (`merge.ts`):
   - 3-way merge logic: base version / parent, source branch, target branch (main).
   - Conflict detection on identical object ID: `ArchitectureMergeConflict`, `detectMergeConflicts`, `applyBranchMerge`.
   - Unit tests in `packages/domain/src/merge.test.ts`.
3. In `apps/web/`, implement merge dialog and conflict resolution modal:
   - `<MergeBranchModal />` and `<ConflictResolutionBanner />`.
   - Web integration specs in `apps/web/merge.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
