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

**Verdict: CLEAN after round-1 fixes** — but round-2 re-review (below) found new issues in the round-1 fix itself, plus deeper pre-existing gaps a --level high pass surfaced once the round-1 races were gone.

## Round 2 — Findings

Re-ran `/code-review 16 --level high` against the round-1 fix commit. 10 findings.

1. **[CONFIRMED, high]** `isMutatingGraphRef`/`isMutatingGraph` were set `true` before the synchronous `applyLayout()`/`alignNodes()`/`distributeNodes()` call with no try/catch — a synchronous throw (e.g. from a misbehaving third-party engine) would skip the `.finally()` reset entirely, permanently disabling both the alignment toolbar and the layout menu for the rest of the session.
2. **[CONFIRMED, medium]** The layout/align persist-failure rollback unconditionally reverted **every** node in its own snapshot, including one a user had separately dragged (not gated by the shared guard) and successfully persisted in the meantime — silently discarding that unrelated, successful edit.
3. **[CONFIRMED, medium]** `computeLayers` only seeded its BFS from true in-degree-0 roots; a node downstream of a cycle (but not itself cyclic) never got its in-degree to 0 either, so it collapsed into the same "layer 0" fallback as the cycle members — misplacing it in every layering-based engine (hierarchical/tree/layered/TB/LR/radial).
4. **[CONFIRMED, low]** `ApplyLayoutCommand.execute()` indexed `positions[i]!` with no length check; the registry is explicitly built for third-party engines, so a misbehaving one returning the wrong count would produce `undefined` several frames before it surfaces.
5. **[CONFIRMED, low]** `gridLayout`'s `options?.columns ?? default` used nullish coalescing, so an explicit `columns: 0` (or negative) passed through unchanged, producing `NaN`/`Infinity` coordinates instead of falling back to the computed default.
6. **[CONFIRMED, low]** `LayoutMenu` only disabled its toggle button; the per-engine option buttons inside an already-open dropdown stayed clickable (and silently no-op'd) while `disabled` was true.
7. **[NOTED, accepted limitation]** `forceDirectedLayout` + its overlap-resolution pass run synchronously on the main thread; for graphs of hundreds+ nodes this could visibly freeze the tab. No worker infrastructure exists anywhere in this codebase yet, and nothing in this app currently produces diagrams at that scale — addressing it (worker offload, chunked/yielding iteration) is a disproportionate architecture change for a hypothetical scale this feature doesn't need to support today. Documented in the function's docstring instead of built.
8. **[CONFIRMED, low, doc-only]** The same docstring overclaimed an absolute "guarantees zero bbox overlap" — softened to describe it accurately as a heuristic verified for the sizes actually tested, not a formally-proven bound.
9. **[ADDRESSED VIA DOCS, not code]** Built-in layout engines living in `packages/domain` reads as contradicting `MODULES.md`'s general "Built-ins register under apps/api / apps/web" line. Checked `rules/layer-boundaries.md` Rule 1 (domain must stay framework-free) and `check-architecture.sh` (only greps for framework imports, no location-of-registration rule): a layout algorithm is pure math with no I/O, the same category as `alignment.ts` already in `packages/domain` — moving it to `apps/web` for no functional reason would be worse architecture just to match a general line written with I/O-dependent built-ins (importers/exporters/AI-actions) in mind. Amended `MODULES.md` to state the actual dividing line (Rule 1, not physical location) instead of moving working, correctly-layered code.
10. **[CONFIRMED, low]** `ApplyLayoutCommand.persist()` duplicated `AlignNodesCommand.persist()` almost verbatim.

### Fixes applied (same branch, second follow-up commit)

- Both `dispatchAlignOperation` and `handleApplyLayout` now wrap their synchronous domain-function calls in try/catch; on a throw, the shared guard is released and the error is logged instead of the op silently bricking the toolbar. Fixes #1.
- Both rollback handlers now only revert a node if its **current** position still exactly matches the position this operation set it to — if anything else changed it since (e.g. a plain drag), that later change wins instead of being clobbered. Fixes #2.
- `computeLayers` rewritten to do standard DFS-based back-edge detection (the same cycle-breaking approach tools like dagre use) before layering, so the graph handed to Kahn's algorithm is always acyclic and every node gets a real, meaningful layer — the "fall back to 0" path is now a defensive backstop that should never actually trigger. New tests: a 2-node cycle no longer collapses both nodes to layer 0 (one is correctly ordered after the other), a node downstream of a cycle gets a layer strictly greater than the cycle it hangs off, and a larger 3-node-cycle-with-tails case doesn't hang or throw. Fixes #3.
- `applyLayout()` (registry core) now throws a clear error if an engine returns the wrong number of positions; `ApplyLayoutCommand`'s constructor adds the same check as a second line of defense for callers that bypass `applyLayout()`. Fixes #4.
- `gridLayout`'s columns guard now explicitly checks `> 0` before using a caller-supplied value. Fixes #5.
- `LayoutMenu`'s per-engine option buttons now receive `disabled` too, and the dropdown auto-closes when `disabled` flips true. Fixes #6.
- `forceDirectedLayout`'s docstring rewritten to describe an empirically-verified heuristic with a noted main-thread-cost caveat, not an unconditional guarantee. Fixes #7 (documented, not built) and #8.
- `MODULES.md` amended: the dividing line for where a built-in registers is Rule 1 (framework-free or not), not a blanket "always under apps/*" — pure-math built-ins like layout engines belong in `packages/domain` next to the registry. Fixes #9 (as a documentation correction).
- Extracted `apps/web/lib/commands/persist-positions.ts` (`persistPositions` helper); both `AlignNodesCommand` and `ApplyLayoutCommand` now use it instead of duplicating the same `viewId`/`persistFn` guard and `objectId`/`x`/`y` mapping. Fixes #10.

### Re-verification after round-2 fixes

- TypeScript: PASS
- Lint: PASS
- Tests: PASS (362 tests: 66 domain, 151 web, 145 api) — includes 3 new `computeLayers` cycle-handling tests and the existing 40-node force-directed stress test, still passing under the new pass cap
- Architecture: PASS
- Build: PASS
- Noted in passing: `apps/api`'s `organizations.e2e.spec.ts`/`workspaces.e2e.spec.ts` failed twice with different symptoms (assertion mismatches, then timeouts) under `pnpm test`'s parallel workspace run, then passed cleanly 145/145 on a solo re-run — pre-existing DB-contention flakiness in test infra unrelated to this PR (no `apps/api` files touched by this branch). Not fixed here; out of scope for F015.

**Verdict: CLEAN after round-2 fixes** — but round-3 re-review (below) surfaced edge cases in fractional grid options, coordinate rounding consistency, registry validation, and menu dismissal.

## Round 3 — Findings

Re-ran code review (`/code-review 16 --level high`) against the round-2 fix commit. 4 findings:

1. **[CONFIRMED, medium]** `gridLayout`'s columns guard (`options?.columns != null && options.columns > 0 ? Math.floor(options.columns) : ...`) permitted fractional values in `(0, 1)` (e.g. `columns: 0.5`) to pass through the `> 0` check, which `Math.floor()` then truncated to `0` — producing division/modulo by zero and `NaN`/`Infinity` coordinates.
2. **[CONFIRMED, low]** `applyLayout()` in `layout-registry.ts` checked position length (`positions.length === nodes.length`) but did not validate coordinate values; an engine returning `NaN`, `Infinity`, or `undefined` within an element would silently pass through into local UI state.
3. **[CONFIRMED, low]** `forceDirectedLayout` returned raw unrounded floating-point coordinates from continuous physics simulation (e.g. `124.91823719827391`), unlike all other engines (`grid`, `layered`, `radial`) which return integer pixel coordinates. Causes subpixel antialiasing blurring and persists unrounded floats to the database.
4. **[CONFIRMED, low]** `LayoutMenu` dropdown remained open indefinitely on outside canvas clicks and Escape key presses; user had to re-click the toggle or select an option to dismiss it.

### Fixes applied (same branch, third follow-up commit)

- `gridLayout`: updated the columns guard to `Math.floor(options.columns) > 0`, safely falling back to the computed default for any fractional value less than 1. Added regression test asserting finite coordinates for `columns: 0.5`. Fixes #1.
- `applyLayout()`: added validation asserting that every returned position contains finite numbers (`Number.isFinite(pos.x) && Number.isFinite(pos.y)`). Added regression tests for length mismatch and non-finite coordinates. Fixes #2.
- `forceDirectedLayout`: rounded final positions via `Math.round(p.x)`, `Math.round(p.y)`. Because margin is 20px, rounding by at most 0.5px does not re-introduce bbox overlap while ensuring crisp rendering and clean serialization. Added regression test asserting integer coordinates. Fixes #3.
- `LayoutMenu`: added outside pointerdown and Escape key event listeners to dismiss the dropdown cleanly when interacting elsewhere on the canvas. Fixes #4.

### Re-verification after round-3 fixes

- TypeScript: PASS
- Lint: PASS
- Tests: PASS (366 tests: 70 domain, 151 web, 145 api) — includes 4 new regression tests
- Architecture: PASS
- Build: PASS

**Verdict: CLEAN.**

