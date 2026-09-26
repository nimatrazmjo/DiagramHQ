# Code Review — F014 (Alignment)

Reviewer: `code-review` skill (`/code-review 15 --level high`), forked subagent. Date: 2026-09-26.
Branch: `feat/F014-alignment`. Target: PR #15.

## Round 1 — Findings

Diff reviewed: `git diff origin/main...HEAD` (15 files, ~935 insertions). Ran `pnpm --filter @diagramhq/domain test` and `pnpm --filter web test` — all passing, but flagged that the passing tests only exercised the pure domain functions and the command/toolbar in isolation, not the React Flow node-mapping code in `infinite-canvas.tsx`, where the most severe bug lived.

1. **[CONFIRMED, high]** `handleAlign`/`handleDistribute` read `n.width`/`n.height` directly, but React Flow v12 only writes auto-measured node size to `node.measured.{width,height}` (verified against `@xyflow/react@12.12.0`'s bundled source: `applyChange`'s `'dimensions'` case sets `element.measured = {...}` and only mirrors onto top-level `width`/`height` when `setAttributes` is set, which this app never does). Since no `CanvasNode` in this app pins explicit width/height, every align-right/bottom/center and distribute call was treating all nodes as 0×0 — right/bottom/center collapsed to left/top, and distribute spacing ignored real widths.
2. **[CONFIRMED, medium]** `handleAlign`/`handleDistribute` deferred the local `setNodes` UI update until the async `dispatch(...).then(...)` resolved (which awaits `batchPersistFn`), unlike `handleSelectionDragStop`'s synchronous-optimistic pattern — rapid successive clicks could race on stale closures / out-of-order resolution.
3. **[CONFIRMED, medium]** No `.catch()` on the dispatch promise — a persist failure would silently no-op the UI with an unhandled rejection.
4. **[CONFIRMED, low]** `handleAlign`/`handleDistribute` duplicated ~30 lines of near-identical logic.
5. **[CONFIRMED, low]** Both handlers rebuilt node state with an O(n·m) `.find()` scan per node instead of a `Map` lookup.

## Fixes applied (same branch, follow-up commit)

- Added `toAlignableNode(node: Node): AlignableNode` (exported, module-level in `infinite-canvas.tsx`) that prefers `node.measured?.width/height`, falling back to `node.width/height`, then `undefined`. Used by the new shared handler. Fixes #1.
- Merged `handleAlign`/`handleDistribute` into a single `dispatchAlignOperation(operation, minNodes)`: computes positions synchronously via the pure domain `alignNodes`/`distributeNodes` functions and applies them to local node state immediately (no longer waits on the persist promise), then fires `AlignNodesCommand` through the dispatcher in the background for undo history + persistence. Fixes #2 and #4.
- Added `.catch((error) => console.error(...))` on the background dispatch. Fixes #3.
- Position lookups now use a `Map<string, CanvasPosition>` instead of `.find()`. Fixes #5.
- Added 3 regression tests for `toAlignableNode` in `apps/web/alignment.spec.ts` (prefers `measured`, falls back to top-level `width`/`height`, undefined when neither present) — 134 web tests now pass (was 131).

## Re-verification after fixes

- TypeScript: PASS (`pnpm --filter web typecheck`)
- Lint: PASS (`pnpm lint`, 0 errors/warnings)
- Tests: PASS (327 tests: 48 domain, 134 web, 145 api)
- Architecture: PASS (`pnpm check-architecture`)
- Build: PASS (`pnpm build`)

## Round 2 — Findings

Re-ran `/code-review 15 --level high` against the round-1 fix commit. 4 new findings, all against the round-1 fix itself:

1. **[CONFIRMED, high]** `handleSelectionDragStop`'s new snap-to-grid path (added in round 1) called `snapToGrid(rawPosition)` independently per dragged node. For a rigid group drag this distorts relative offsets (e.g. two nodes 10px apart could become 20px apart post-snap) — a regression specific to the group-drag snap path added by this feature.
2. **[CONFIRMED, medium]** `dispatchAlignOperation`'s optimistic `setNodes` (added in round 1) never rolled back on a `persistFn` rejection, so a failed persist left the canvas showing unsaved positions with no user-visible signal beyond a console error.
3. **[ACKNOWLEDGED, not fixed, low]** `dispatchAlignOperation` closes over the render-time `nodes`/`selectedNodeIds`; two align/distribute clicks fired before React re-renders between them could both read pre-first-click state. This is a general property of closure-based React state shared by the pre-existing `handleNodeDragStop`/`handleSelectionDragStop` handlers (not introduced by F014), requires a nontrivial ref-synchronization change to fully close, and has no realistic single-user trigger (only back-to-back synthetic/scripted clicks within one render tick). Deferred rather than risking a speculative fix; worth revisiting with F016 (undo/redo) if a more robust state model is introduced then.
4. **[CONFIRMED, low]** `dispatchAlignOperation` reintroduced an O(n·m) `.filter(... .includes(...))` scan the same feature had already fixed for the `.find()` lookups elsewhere in the same function.

### Fixes applied (same branch, second follow-up commit)

- Added `snapGroupPositions(positions, gridSize?)` (exported, module-level): derives one delta from an anchor node and applies it uniformly to the whole group, preserving relative offsets. `handleSelectionDragStop` now uses it instead of per-node `snapToGrid`. Fixes #1.
- `dispatchAlignOperation` now captures `previousPositionById` before the optimistic update and reverts to it in the dispatch `.catch()`. Fixes #2.
- `dispatchAlignOperation` now builds a `Set` from `selectedNodeIds` for the membership check instead of `.includes()`. Fixes #4.
- #3 left as-is with rationale recorded above.
- Added 4 regression tests for `snapGroupPositions` in `apps/web/alignment.spec.ts` (empty input, anchor snaps, relative offset preserved, custom grid size) — 138 web tests now pass (was 134).

### Re-verification after round-2 fixes

- TypeScript: PASS
- Lint: PASS
- Tests: PASS (331 tests: 48 domain, 138 web, 145 api)
- Architecture: PASS
- Build: PASS

**Verdict: CLEAN.** 3 of 4 round-2 findings fixed; #3 explicitly deferred with rationale (pre-existing pattern, no realistic trigger, risky speculative fix). No further PR round required.

## Round 3 — Findings

Re-ran `/code-review 15 --level high` against the round-2 fix commit.

1. **[NOT REPRODUCED]** "Single-node drag with snap-to-grid never updates the visible node position to match it, sits off-grid all session." Investigated directly against `createNodeDragStopHandler` (`infinite-canvas.tsx`): `onPositionChange(node.id, newPosition)` is called with the **snapped** `newPosition` (line 98-100, 119-121) and the call site's `onPositionChange` does `setNodes(...)` with that snapped value (line 250-254). The node does end up snapped, contrary to the finding's literal claim. What *is* real: this update only lands after `await defaultCommandDispatcher.dispatch(command)` resolves (a persist round-trip), so there's a brief visual lag from raw to snapped position, and if that promise *rejects* the function throws before reaching `onPositionChange` — but that failure-handling gap predates F014 (this code path existed for plain moves since F012; F014 only added the two optional snap params) and is out of this feature's scope. Recorded here rather than silently dropped.
2. **[CONFIRMED, medium]** `handleSelectionDragStop` (group drag, touched by this diff to add snap-to-grid) dispatches with no `.catch`/rollback, unlike the align path added right below it in the same diff — an inconsistency within the PR's own diff.
3. **[CONFIRMED, medium]** `dispatchAlignOperation`'s failure-rollback (added in round 2) could stomp a second, still-in-flight or already-succeeded align/distribute if two operations overlapped, since each capture s its own "previous positions" snapshot independently.
4. **[CONFIRMED, low]** `alignNodes`'s `left`/`right`/`top`/`bottom` branches used `Math.min(...arr)`/`Math.max(...arr)`, which throws `RangeError` past ~65k-125k spread arguments (engine-dependent) — a latent crash for a very large multi-select.

### Fixes applied (same branch, third follow-up commit)

- `handleSelectionDragStop` now has the same `.catch` + revert-to-`prevPosition` pattern as `dispatchAlignOperation`. Fixes #2.
- Added an `isAligningRef`/`isAligning` guard: `dispatchAlignOperation` no-ops while a previous align/distribute is still persisting (ref checked synchronously, so no same-tick race), and the toolbar's align/distribute buttons are visually disabled during that window (`AlignmentToolbar` gained a `disabled` prop). This also happens to close round 2's deferred finding #3 (closure staleness on back-to-back clicks) for the align/distribute path specifically. Fixes #3.
- `packages/domain/src/alignment.ts`: replaced the four `Math.min(...)`/`Math.max(...)` spreads with `reduce`-based `minOf`/`maxOf` helpers. Fixes #4.
- #1 recorded as investigated/not reproduced, with the exact code path cited above.
- Added regression tests: `alignNodes` on a 70,000-node selection (`packages/domain/src/alignment.test.ts`) for #4; `AlignmentToolbar`'s `disabled` prop disabling align+distribute but not the snap toggle (`apps/web/alignment.spec.ts`) for #3's UI half. 49 domain tests (was 48), 139 web tests (was 138).

### Re-verification after round-3 fixes

- TypeScript: PASS
- Lint: PASS
- Tests: PASS (333 tests: 49 domain, 139 web, 145 api)
- Architecture: PASS
- Build: PASS

**Verdict: CLEAN.** All actionable round-3 findings fixed; #1 investigated and not reproduced (documented); round-2's #3 remains deferred for the group-drag path only (align/distribute path is now guarded). No further PR round required.
