# Code Review — F010 (Pan and Zoom)

Reviewer: Evaluator (Rubric-based). Date: 2026-09-26.
Branch: `feat/F010-pan-and-zoom`.
Target: Infinite pan and zoom with wheel zoom clamping (0.1x to 4.0x), space-pan drag activation, fit-to-content shortcut ('F' key), and zoom toolbar.

## Evaluator Rubric Scores
- **Acceptance completeness**: 5/5
  - Wheel zoom limits: Clamped between `MIN_ZOOM` (0.1) and `MAX_ZOOM` (4.0) via `clampZoom` in `apps/web/lib/canvas-store.ts` and configured on React Flow canvas (`minZoom={0.1}`, `maxZoom={4.0}`, `zoomOnScroll={true}`).
  - Space-pan activation: Space key listener on window sets `isSpacePanning` state in `useCanvasStore`, dynamically styling `cursor-grab`/`active:cursor-grabbing` and rendering a `PAN MODE (SPACE)` status badge. React Flow canvas configured with `panActivationKeyCode="Space"`.
  - Fit-to-content: 'F' / 'f' key listener outside text inputs triggers `reactFlow.fitView({ padding: 0.2, duration: 250 })`. Toolbar includes dedicated "Fit (F)" action button.
  - Toolbar controls: Added `pan-zoom-toolbar` with Zoom Out (−), Zoom In (+), Reset (100%), and Fit (F) buttons.
  - Smooth at target node counts: Native React Flow transformation matrix avoids DOM churn and domain re-projections.
  - Tests: Comprehensive unit and component tests in `apps/web/pan-zoom.spec.ts` (10 tests) and updated store bounds in `apps/web/canvas.spec.ts`.
- **Correctness**: 5/5
  - Zoom increment, decrement, and reset functions reliably respect boundaries.
  - Input and textarea focus states prevent accidental trigger of canvas shortcuts.
  - Viewport state synchronizes seamlessly between React Flow and `useCanvasStore`.
- **Boundary & scope compliance**: 5/5
  - Strict compliance with Layer Boundaries Rule 4: No domain entities stored in Zustand store; only viewport coordinates, selection IDs, and `isSpacePanning` flag.
  - Architecture checks (`./scripts/check-architecture.sh`) clean.
- **Modularity**: 5/5
  - Reusable zoom helpers (`zoomIn`, `zoomOut`, `resetZoom`, `clampZoom`) exported from `apps/web/lib/canvas-store.ts`.
  - Clean `CanvasRenderer` bridge delegates fitView and viewport changes without coupling to UI components.
- **Evidence & handoff quality**: 5/5
  - 235 automated tests passing monorepo-wide (34 domain, 71 web, 130 api).
  - Clean production build across all Next.js and NestJS targets.

**Average Score**: 5.0 / 5.0
**Verdict**: PASS

## Verification Summary
- `pnpm prisma:generate`: Clean.
- `pnpm build:domain`: Clean.
- `pnpm typecheck`: Clean across all packages and apps (0 errors).
- `pnpm lint`: Clean (0 errors, 0 warnings).
- `pnpm test`: 235 tests passed (34 domain, 71 web, 130 api).
- `pnpm build`: Clean production build across all Next.js and NestJS targets.
- Architecture check: `./scripts/check-architecture.sh` -> clean.

## PR Review — Round 1 (PR #11)
Independent pass over the pull request diff:
1. **Pan and Zoom Mechanics**:
   - `InfiniteCanvas` wrapped in `ReactFlowProvider` to expose `useReactFlow()` control.
   - Wheel zoom limits bounded safely to 0.1x – 4.0x.
   - Space keydown/keyup events toggle pan mode with visual indicator and grab cursors.
   - 'F' shortcut and toolbar buttons trigger animated `fitView`.
2. **State & Architecture Isolation**:
   - `useCanvasStore` maintains transient viewport and pan flags with zero domain entity storage.
   - Framework-agnostic `CanvasRenderer` interface satisfied.
3. **Automated Testing**:
   - 10 new tests in `pan-zoom.spec.ts` testing store clamping, space-pan toggling, keyboard shortcut safeguards, and toolbar rendering.

**PR Verdict**: CLEAN. Exiting PR review loop.
