# Current Task: F058 — Architecture diff

**Status**: NOT STARTED

## Description
Visual architecture diff engine and UI comparing two versions or branches: accurately identifying added, modified, removed, and moved entities (objects, connections, views, flows) with semantic coloring (green for added, blue/yellow for modified, red for removed, purple for moved).
- Feature ID: F058
- Phase: 07 — Versioning
- Dependencies: F055, F056, F057
- Acceptance criteria:
  - Diff two versions: added/modified/removed/moved with colors
  - Test: diff matches seeded changes.

## Next Steps
1. Review `PHASE-07-VERSIONING.md` for F058 acceptance criteria.
2. In `packages/domain/src/`, implement architecture diff engine (`diff.ts`):
   - Categorize entity changes: `added`, `modified`, `removed`, `moved` (position changes on objects without structural change).
   - Assign semantic colors: green (`added`), amber (`modified`), rose (`removed`), indigo (`moved`).
   - Unit tests in `packages/domain/src/diff.test.ts` verifying that seeded changes match computed diff categories.
3. In `apps/web/`, implement visual diff overlay and inspector UI:
   - `<VisualDiffViewer />` and `<DiffLegend />`.
   - Web integration specs in `apps/web/diff.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
