# Current Task

Feature ID: F010
Feature: Pan and zoom (Wheel zoom, space-pan, fit-to-content 'F' shortcut, smooth viewport transitions)
Status: COMPLETE
Phase: Phase 02 — Canvas

## Objective
Support smooth, infinite pan and zoom on the canvas with wheel zoom limits (0.1x to 4x), space-bar drag panning, and a fit-to-content shortcut ('F' key), keeping viewport interactions responsive and synchronized with the UI store.

## Prerequisite
F009 (Infinite canvas) is COMPLETE and merged to `main`. Branch `feat/F010-pan-and-zoom` is active.

## Steps
- [x] Implement wheel zoom limits (minZoom 0.1, maxZoom 4) in `InfiniteCanvas`
- [x] Configure space-pan activation (`panActivationKeyCode="Space"`) and grab cursor styling
- [x] Implement fit-to-content ('F' keypress listener outside inputs) invoking `fitView`
- [x] Add zoom helpers in `canvas-store.ts` (`zoomIn`, `zoomOut`, `resetZoom`)
- [x] Implement component tests in `apps/web/pan-zoom.spec.ts`
- [x] Run full verification suite (`pnpm verify` + `pnpm build`)

## Verification
- [x] TypeScript: PASS · Lint: PASS · Unit/Integration: PASS · Build: PASS · check-architecture: PASS

## Do Not
- Store domain entity models inside Zustand stores (layer-boundaries rule 4).
- Persist positions to DB without command layer (F012).

## Next Task
F011 — Object selection.

## Last Updated
2026-09-26
