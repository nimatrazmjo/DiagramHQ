# Sprint Contract — F009 (Infinite Canvas)

Written by the Planner before any code. It fixes "done" so the Generator cannot drift and the Evaluator has something objective to grade against.

## Feature
- Id: F009
- Title: Infinite canvas
- Phase / slice: Phase 02 — Canvas

## Goal (one sentence)
An interactive infinite canvas mounted behind a framework-agnostic CanvasRenderer interface that projects domain objects and connections into canvas nodes and edges, keeping UI interaction state decoupled from domain state.

## Acceptance -> checks
Map each acceptance item from `PHASE-02-CANVAS.md` to how it will be verified.
| Acceptance item | How verified (command / test / screenshot) |
|---|---|
| Infinite canvas mounts and renders nodes/edges | Component test in `apps/web/canvas.spec.ts` rendering the canvas with nodes and edges; snapshot / DOM verification |
| CanvasRenderer interface isolates the renderer (ADR-0002, MODULES.md §7) | Pure TypeScript interface in `packages/domain/src/canvas.ts` implemented by `ReactFlowCanvasRenderer` in `apps/web/components/canvas/react-flow-renderer.ts`, swappable for PixiJS/WebGL |
| Canvas holds no domain data in Zustand (layer-boundaries rule 4) | UI store (`apps/web/lib/canvas-store.ts`) stores only viewport (`{ x, y, zoom }`) and transient selection (`selectedIds: string[]`), with no domain entities mirrored |
| Test: component test + screenshot / DOM structure of a rendered graph | Comprehensive tests in `apps/web/canvas.spec.ts` verifying mounting, projection, and isolation |

## Plan (steps)
1. In `packages/domain`:
   - Create `src/canvas.ts`:
     - Define `CanvasNode`, `CanvasEdge`, `CanvasViewport`, `CanvasInteractionHandler`.
     - Define `CanvasRenderer` interface (`name`, `mount`, `unmount`, `render`, `setViewport`, `getViewport`, `fitView`).
     - Define pure projection function: `projectViewModelToCanvas(view, objects, connections): { nodes: CanvasNode[]; edges: CanvasEdge[] }`.
     - Re-export from `packages/domain/src/index.ts`.
   - Unit tests in `packages/domain/src/canvas.test.ts`.
2. In `apps/web`:
   - Create `lib/canvas-store.ts` (Zustand):
     - Stores only transient UI state: `viewport` (`x, y, zoom`), `selectedNodeIds`, `selectedEdgeIds`, `hoveredNodeId`. No domain entities stored (layer-boundaries rule 4).
   - Create `components/canvas/`:
     - `canvas-renderer.ts`: Concrete implementation of `CanvasRenderer` adapting React Flow.
     - `infinite-canvas.tsx`: Client component rendering React Flow with controls, background grid, minimap placeholder, custom architecture node types (SystemNode, AppNode, StoreNode), and edge types.
     - `canvas-nodes.tsx`: Node components for architectural objects (systems, apps, stores).
     - `index.ts`: Unified export.
   - Integrate into `/workspace/[workspaceId]` studio page:
     - Provide a toggle or dedicated tab to view the live Interactive Canvas.
3. Automated tests:
   - `apps/web/canvas.spec.ts`: Component & unit tests for `CanvasRenderer`, `projectViewModelToCanvas`, React Flow canvas mounting, node rendering, and Zustand store boundary verification.
4. Verification:
   - Run `pnpm verify` (`typecheck`, `lint`, `test`, `check-architecture`) and `pnpm build`.

## In scope
- `CanvasRenderer` interface in `packages/domain`.
- React Flow canvas mounting behind `CanvasRenderer` interface in `apps/web`.
- Pure model projection (`projectViewModelToCanvas`).
- Transient UI store (`canvas-store.ts`) adhering to layer boundaries (no domain data in store).
- Architecture node components (systems, apps, stores) and edge rendering.

## Explicitly out of scope (parked)
- Advanced pan/zoom gesture physics (F010).
- Drag and drop layout persistence to `view_objects` table (F012).
- Multi-select marquee box (F013).
- Auto-layout dagre/elk engine (F015).

## New dependencies
- `@xyflow/react` in `apps/web` (React Flow).
- `zustand` in `apps/web` (transient UI state).

## Boundaries touched
- `packages/domain`: `src/canvas.ts`, `src/canvas.test.ts`, `src/index.ts`.
- `apps/web`: `components/canvas/*`, `lib/canvas-store.ts`, `app/workspace/*`, `canvas.spec.ts`.

## Definition of done
- All acceptance checks green + evidence recorded.
- `check-architecture` passes.
- Evaluator score >= 4.0, no criterion at 1.
- State + handoff updated, committed on `feat/F009-infinite-canvas`.

---
Signed off (Planner) before build: [x]
