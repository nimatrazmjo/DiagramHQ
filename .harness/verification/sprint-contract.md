# Sprint Contract — F011 (Object Selection)

Written by the Planner before any code. It fixes "done" so the Generator cannot drift and the Evaluator has something objective to grade against.

## Feature
- Id: F011
- Title: Object selection
- Phase / slice: Phase 02 — Canvas

## Goal (one sentence)
Enable single-click object and edge selection on the canvas with active visual styling, Escape key clearing, selection synchronization with the UI store (`useCanvasStore`), and inspector integration displaying the active selection properties.

## Acceptance -> checks
Map each acceptance item from `PHASE-02-CANVAS.md` to how it will be verified.
| Acceptance item | How verified (command / test / screenshot) |
|---|---|
| Click to select a node or edge | Component & unit tests in `apps/web/selection.spec.ts` asserting selection updates `selectedNodeIds`/`selectedEdgeIds` in `useCanvasStore` |
| Selection state in the UI store | Store tests verifying `selectNode`, `selectEdge`, and `clearSelection` actions without domain state mutation |
| Escape clears selection | Keyboard event test verifying `Escape` keypress triggers `clearSelection()` in store and unselects canvas items |
| Inspector integration | Studio page reflects selected item in `InspectorPanel` |
| Test: component test for selection state | Automated test suite in `apps/web/selection.spec.ts` |

## Plan (steps)
1. In `apps/web/lib/canvas-store.ts`:
   - Add selection helpers: `selectNode(id: string, multi?: boolean)`, `selectEdge(id: string, multi?: boolean)`, `isNodeSelected(id: string)`, `isEdgeSelected(id: string)`.
   - Ensure layer boundaries (zero domain entities stored).
2. In `apps/web/components/canvas/infinite-canvas.tsx`:
   - Bind `onNodeClick`, `onEdgeClick`, and canvas background click.
   - Add Escape keydown listener: when Escape is pressed and focus is not trapped in an input, calls `clearSelection()`.
   - Update nodes and edges with distinct active selection ring/glow classes (`ring-2 ring-blue-500`, border highlights).
3. In `apps/web/app/workspace/[workspaceId]/page.tsx`:
   - Connect active selection from `useCanvasStore` to the Studio shell's `InspectorPanel` so selected node properties (name, kind, description) are displayed in the inspector.
4. Automated tests in `apps/web/selection.spec.ts`:
   - Test node and edge click selection.
   - Test Escape key clears selection.
   - Test store selection helpers.
   - Test inspector reflects selected object.
5. Verification:
   - Run `pnpm verify` and `pnpm build`.

## In scope
- Single-click node and edge selection.
- Store selection state synchronization.
- Escape key clearing selection.
- Selected node/edge visual styling.
- Studio inspector reflection.
- Component tests in `apps/web/selection.spec.ts`.

## Explicitly out of scope (parked)
- Multi-select marquee box (F013).
- Drag and drop layout persistence (F012).
- Alignment helpers (F014).
- Auto-layout registry (F015).

## Boundaries touched
- `apps/web/lib/canvas-store.ts`
- `apps/web/components/canvas/infinite-canvas.tsx`
- `apps/web/components/canvas/custom-nodes.tsx`
- `apps/web/app/workspace/[workspaceId]/page.tsx`
- `apps/web/selection.spec.ts`

## Definition of done
- All acceptance checks green + evidence recorded.
- `check-architecture` passes.
- Evaluator score >= 4.0.
- State + handoff updated, committed on `feat/F011-object-selection`.

---
Signed off (Planner) before build: [x]
