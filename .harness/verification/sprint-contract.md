# Sprint Contract — F017: Minimap

Feature: F017 — Minimap
Phase: Phase 02 — Canvas
Date: 2026-09-26

## 1. Scope & Acceptance Criteria
- [x] Minimap:
  - MiniMap component rendered on canvas (`data-testid="minimap"`).
  - Reflects graph nodes with styled colors by node category and highlights selected nodes.
  - Click-to-navigate and pannable viewport mask.
  - Toggle button in toolbar (`data-testid="toggle-minimap-btn"`) to show/hide minimap, backed by `useCanvasStore.isMinimapVisible`.
- [x] Fullscreen mode:
  - Fullscreen toggle button in toolbar (`data-testid="fullscreen-btn"`).
  - Integrates with HTML5 Fullscreen API (`element.requestFullscreen` / `document.exitFullscreen`) with error handling.
  - State in `useCanvasStore`: `isFullscreen`, `toggleFullscreen`, `setIsFullscreen`.
  - Keyboard shortcut: <kbd>Shift</kbd>+<kbd>F</kbd> toggles fullscreen.
- [x] Focus mode:
  - Focus mode toggle button in toolbar (`data-testid="focus-mode-btn"`).
  - When active (`isFocusMode: true`), isolates selection:
    - Nodes not in the active selection are visually dimmed / subdued (opacity 0.15, grayscale).
    - Edges not connected between selected nodes are visually dimmed / subdued (opacity 0.08).
    - Active selection remains fully opaque with prominent styling.
  - Focus badge rendered on canvas when focus mode is active: `data-testid="focus-mode-badge"`.
  - <kbd>Escape</kbd> exits focus mode if no selection remains.
  - State in `useCanvasStore`: `isFocusMode`, `toggleFocusMode`, `setIsFocusMode`.
  - Keyboard shortcut: <kbd>Alt</kbd>+<kbd>F</kbd> or toolbar button.
- [x] Layer Boundary Invariants:
  - Strictly conforms to Rule 4: `useCanvasStore` manages only transient UI flags (`isMinimapVisible`, `isFullscreen`, `isFocusMode`), zero domain entity models.
  - Zero `any` types.
- [x] Monorepo verification:
  - `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check-architecture`, `pnpm build` pass with zero errors.
