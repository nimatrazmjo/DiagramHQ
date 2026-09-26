# CURRENT TASK: F014 — Alignment

## Status: COMPLETE

## Feature
**F014 — Alignment Tools**

Provides snapping and layout-alignment operations for selected canvas objects:
- Snap to grid (configurable grid size, default 20px)
- Align selected nodes: left, right, top, bottom, center-horizontal, center-vertical
- Distribute selected nodes: horizontal (even x-gap), vertical (even y-gap)

## Scope

### Domain layer (`packages/domain/src/`)
- `alignment.ts`: Pure, framework-free functions
  - `snapToGrid(position: CanvasPosition, gridSize?: number): CanvasPosition`
  - `alignNodes(nodes: AlignableNode[], axis: AlignAxis): CanvasPosition[]`
    - `AlignAxis`: `'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV'`
  - `distributeNodes(nodes: AlignableNode[], axis: 'horizontal' | 'vertical'): CanvasPosition[]`
  - `AlignableNode`: `{ id: string; position: CanvasPosition; width?: number; height?: number }`
- `alignment.test.ts`: Unit tests with exact coordinate assertions

### Web layer (`apps/web/`)
- `lib/commands/align-nodes-command.ts`: `AlignNodesCommand` implementing `Command<...>` — calls batch persist
- `lib/commands/index.ts`: re-export
- `components/canvas/alignment-toolbar.tsx`: Toolbar component (6 align + 2 distribute + snap toggle)
- `components/canvas/infinite-canvas.tsx`: Mount toolbar when `selectedNodeIds.length > 1`
- `alignment.spec.ts`: Component + command tests

## Verification
- TypeScript: PASS · Lint: PASS · Tests: PASS (333: 49 domain, 139 web, 145 api) · Build: PASS · check-architecture: PASS
- PR #15, 3 review rounds, verdict CLEAN.
- Evidence: `.harness/CHANGELOG.md` — "2026-09-26 — F014 — Alignment"; `.harness/reviews/F014-PR.md`, `.harness/reviews/F014-review.md`.

## Owner
Control plane (this agent)

## Started
2026-09-26

## Completed
2026-09-26 — implementation, local verification, and PR #15 review loop (3 rounds, CLEAN) all done. PR open awaiting merge; branch not yet merged to `main`.

## Next Task
F015 — Auto-layout (not started). Per `loops/pr-review-loop.md`, do not start it until PR #15 is merged.
