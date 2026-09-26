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

**Verdict: CLEAN after round-1 fixes.** No PR round 2 needed — all 5 findings addressed in a single follow-up commit.
