# CURRENT TASK: F014 — Alignment

## Status: COMPLETE (pending PR review loop)

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
- TypeScript: PASS · Lint: PASS · Tests: PASS (324: 48 domain, 131 web, 145 api) · Build: PASS · check-architecture: PASS
- Evidence: `.harness/CHANGELOG.md` — "2026-09-26 — F014 — Alignment"

## Owner
Control plane (this agent)

## Started
2026-09-26

## Completed
2026-09-26 — implementation + local verification done. Next: push branch, open PR, run code-review skill, fix findings, then move to F015 per `loops/pr-review-loop.md`.

## Next Task
F015 — Auto-layout (not started).
