# CURRENT TASK: F017 — Minimap

## Status: IN PROGRESS

## Feature
**F017 — Minimap**

Minimap + fullscreen + focus mode on the infinite canvas.
- Minimap reflects graph nodes and viewport, supports click-to-navigate / pan, and toggleable visibility.
- Fullscreen mode expands canvas across the entire display via Fullscreen API.
- Focus mode isolates active selection by dimming non-selected graph elements and displaying a focus mode banner.

## Scope

### Canvas Store (`apps/web/lib/canvas-store.ts`)
- Add `isMinimapVisible: boolean`, `toggleMinimap()`, `setMinimapVisible(boolean)`
- Add `isFullscreen: boolean`, `toggleFullscreen()`, `setIsFullscreen(boolean)`
- Add `isFocusMode: boolean`, `toggleFocusMode()`, `setIsFocusMode(boolean)`

### Canvas Component (`apps/web/components/canvas/infinite-canvas.tsx`)
- Enhance `<MiniMap />` with dynamic `nodeColor` (reflecting node type and selection), pannable/zoomable navigation, and `data-testid="minimap"`.
- Conditionally render or style `<MiniMap />` based on `isMinimapVisible`.
- Implement fullscreen toggle via container element and event listeners (`fullscreenchange`).
- Implement focus mode rendering: when `isFocusMode` is true and nodes are selected, apply dimmed styling / class to unselected nodes and unconnected edges.
- Add Focus Mode badge (`data-testid="focus-mode-badge"`) when focus mode is active.
- Add toolbar buttons for Minimap toggle, Focus Mode toggle, and Fullscreen toggle.
- Keyboard shortcuts: <kbd>Shift</kbd>+<kbd>F</kbd> for fullscreen, <kbd>Alt</kbd>+<kbd>F</kbd> for focus mode, <kbd>Escape</kbd> handling.

### Tests (`apps/web/`)
- Unit and SSR tests in `apps/web/minimap-fullscreen-focus.spec.ts` covering:
  - Canvas store flags and toggles (`isMinimapVisible`, `isFullscreen`, `isFocusMode`).
  - Minimap rendering, node coloring, and toggle.
  - Focus mode selection isolation styles and badge.
  - Fullscreen handler and toolbar controls.

## Verification
- Monorepo checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check-architecture`, `pnpm build`.

## Owner
Control plane (this agent)

## Started
2026-09-26

## Next Task
F018 — Architecture model (Phase 03).
