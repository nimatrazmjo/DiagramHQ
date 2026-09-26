# Sprint Contract — F010 (Pan and Zoom)

Written by the Planner before any code. It fixes "done" so the Generator cannot drift and the Evaluator has something objective to grade against.

## Feature
- Id: F010
- Title: Pan and zoom
- Phase / slice: Phase 02 — Canvas

## Goal (one sentence)
Support smooth, infinite pan and zoom on the canvas with wheel zoom clamping, space-bar drag panning, and a fit-to-content shortcut ('F' key), keeping viewport interactions responsive and synchronized with the UI store.

## Acceptance -> checks
Map each acceptance item from `PHASE-02-CANVAS.md` to how it will be verified.
| Acceptance item | How verified (command / test / screenshot) |
|---|---|
| Wheel zoom with min/max zoom limits (0.1x to 4x) | Unit/component tests in `apps/web/pan-zoom.spec.ts` asserting zoom clamping and viewport update |
| Space-pan activation (Space key sets panning mode) | Component test verifying spacebar activates pan-on-drag cursor and gesture behavior |
| Fit-to-content ('F' key / button shortcut) | Component test asserting 'F' keypress triggers fit-to-content viewport adjustment |
| Smooth at target node counts | Viewport changes fire smoothly without triggering domain model re-renders |
| Test: component test for zoom/pan/fit | Automated Vitest test suite in `apps/web/pan-zoom.spec.ts` |

## Plan (steps)
1. In `apps/web/components/canvas/infinite-canvas.tsx`:
   - Configure React Flow with `minZoom={0.1}`, `maxZoom={4}`.
   - Configure `panActivationKeyCode="Space"` (or Space key down enables grab/dragging).
   - Add keyboard event listener for 'F' / 'f' key (when focus is outside text input) to trigger `fitView({ padding: 0.2, duration: 250 })`.
   - Add quick zoom/fit controls in the top toolbar or Controls panel.
   - Handle viewport transitions smoothly.
2. In `apps/web/components/canvas/canvas-renderer.ts`:
   - Ensure `ReactFlowCanvasRenderer` implements `zoomIn`, `zoomOut`, `fitView`, `setViewport`, `getViewport`.
3. In `apps/web/lib/canvas-store.ts`:
   - Add zoom helpers: `zoomIn()`, `zoomOut()`, `resetZoom()`.
4. Automated tests in `apps/web/pan-zoom.spec.ts`:
   - Test zoom bounds clamping.
   - Test space key activates pan.
   - Test 'F' key triggers fitView.
   - Test store viewport synchronization.
5. Verification:
   - Run `pnpm verify` and `pnpm build`.

## In scope
- Wheel zoom limits (`0.1x` to `4x`).
- Space-bar pan activation.
- 'F' key shortcut for fit-to-content.
- Zoom helper methods on `useCanvasStore` and `CanvasRenderer`.
- Component tests for zoom, pan, and fit in `apps/web/pan-zoom.spec.ts`.

## Explicitly out of scope (parked)
- Object selection (F011).
- Drag and drop layout persistence (F012).
- Multi-select marquee (F013).
- Alignment helpers (F014).
- Auto-layout registry (F015).

## Boundaries touched
- `apps/web/components/canvas/infinite-canvas.tsx`
- `apps/web/components/canvas/canvas-renderer.ts`
- `apps/web/lib/canvas-store.ts`
- `apps/web/pan-zoom.spec.ts`

## Definition of done
- All acceptance checks green + evidence recorded.
- `check-architecture` passes.
- Evaluator score >= 4.0.
- State + handoff updated, committed on `feat/F010-pan-and-zoom`.

---
Signed off (Planner) before build: [x]
