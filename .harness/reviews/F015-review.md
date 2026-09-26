# Code Review — F015 (Auto-layout)

Reviewer: `code-review` skill (`/code-review 16 --level high`), forked subagent. Date: 2026-09-26.
Branch: `feat/F015-auto-layout`. Target: PR #16.

## Round 1 — Findings

1. **[CONFIRMED, high]** `dispatchAlignOperation` (F014) and `handleApplyLayout` (F015) used independent busy-guards (`isAligningRef` vs `isApplyingLayoutRef`), so the two whole-graph mutations weren't mutually exclusive — aligning a selection while a layout apply was still persisting (or vice versa) could have one operation's rollback-on-failure handler clobber the other's already-applied positions.
2. **[CONFIRMED, medium]** `ApplyLayoutCommand.execute()` recomputed the layout via `applyLayout()` even though `handleApplyLayout` had already computed the identical positions synchronously for the optimistic UI update — doubling the (potentially expensive, e.g. `forceDirected`'s 150-iteration O(n²) simulation) computation on every click for no behavioral benefit.
3. **[NOTED, design suggestion]** The two near-duplicate optimistic-update/rollback blocks (align, layout) are why they could race in the first place; a generic shared mutex/hook would prevent a third future whole-graph mutation from repeating the mistake.
4. **[CONFIRMED, low]** `LayoutNode` (`layout-registry.ts`) was a field-for-field duplicate of the existing `AlignableNode` (`alignment.ts`) instead of reusing it — risk of silent drift if one gains a field the other doesn't.
5. **[CONFIRMED, medium]** `resolveOverlaps` (force-directed engine) capped itself at `nodes.length` relaxation passes, which isn't guaranteed to converge for larger/denser graphs (resolving one pair can reintroduce overlap in another), undermining the function's own "guarantees zero bbox overlap" doc claim beyond the ~8-node case the original test covered.

## Fixes applied (same branch, follow-up commit)

- Replaced `isAligningRef`/`isAligning` and `isApplyingLayoutRef`/`isApplyingLayout` with one shared `isMutatingGraphRef`/`isMutatingGraph`, used by both `dispatchAlignOperation` and `handleApplyLayout`, and wired into both `AlignmentToolbar`'s and `LayoutMenu`'s `disabled` prop — the two operations now serialize instead of racing. Fixes #1. Addresses the spirit of #3 without introducing a new generic abstraction for what are still only two call sites (rule of three).
- `ApplyLayoutCommand` redesigned to take precomputed `positions: CanvasPosition[]` (same order as `nodes`) instead of `engine`/`edges`/`options`, matching `MoveNodesCommand`'s shape — `execute()`/`undo()` only ever persist/revert positions they're given, never recompute. `handleApplyLayout` now computes once and passes the result to both the optimistic `setNodes` and the command. Fixes #2.
- `LayoutNode` is now `export type LayoutNode = AlignableNode;` in `layout-registry.ts` instead of a redeclared interface. Fixes #4.
- `resolveOverlaps`'s pass cap raised from `nodes.length` to `Math.max(nodes.length * 8, 200)`, with a new regression test: 40 nodes seeded with a deliberately tiny circle radius (`spacingX: 10`, far smaller than their 160×80 size) to force heavy initial overlap, asserting zero bbox overlap in the result. Fixes #5.
- Updated `apps/web/auto-layout.spec.ts` for `ApplyLayoutCommand`'s new constructor shape, plus a new test asserting `execute()` returns exactly the positions it was constructed with (never recomputes).

### Re-verification after round-1 fixes

- TypeScript: PASS
- Lint: PASS
- Tests: PASS (360 tests: 64 domain, 151 web, 145 api)
- Architecture: PASS
- Build: PASS

**Verdict: pending round-2 re-review.**
