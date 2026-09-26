# Code Review — F017 (Minimap)

Reviewer: PR Review Loop (Maker-Checker protocol). Date: 2026-09-26.
Branch: `feat/F017-minimap`. Target: PR #18.

## Round 1 — Findings & Fixes

Diff reviewed: `git diff origin/main...HEAD` across 8 files (+466 / -86).

### 8-Angle Architectural & Code Review:
1. **Correctness**:
   - `<MiniMap>` conditionally rendered when `isMinimapVisible` is true.
   - Interactive viewport indicator with pannable/zoomable click-to-navigate.
   - HTML5 Fullscreen API correctly uses `containerRef` and synchronizes with `fullscreenchange` events.
   - Focus Mode properly isolates selected nodes with opacity reduction (0.15) and grayscale filter (100%), and highlights connected edges while dimming disconnected ones.
2. **Edge Cases**:
   - Browser environments where `requestFullscreen` throws (e.g., iframe permissions or unsupported browsers) caught and handled gracefully without breaking state.
   - SSR safe: SSR does not access `document.fullscreenElement`, and props `isMinimapVisible`, `isFullscreen`, `isFocusMode` allow static rendering validation.
3. **Lifecycle & Cleanup**:
   - `fullscreenchange` event listener registered on mount and cleanly unregistered in `useEffect` cleanup.
   - Keyboard event listener cleans up without leaking.
4. **Performance**:
   - `displayedNodes` and `displayedEdges` are memoized via `useMemo` so dimming transforms only recalculate when nodes/edges, selection, or focus mode changes.
5. **Typing & Zero `any`**:
   - Zero `@typescript-eslint/no-explicit-any` instances. Strictly typed using `@xyflow/react` types (`Node`, `Edge`, etc.).
6. **Architectural Boundaries**:
   - Layer Boundary Rule 4 strictly maintained: Zustand stores only transient UI viewport/display flags (`isMinimapVisible`, `isFullscreen`, `isFocusMode`). Zero domain entities stored in Zustand.
   - `canvas.spec.ts` whitelist updated and tested.
7. **Accessibility & UX**:
   - Dedicated toolbar buttons with informative tooltips and keyboard shortcuts: <kbd>M</kbd> (toggle minimap), <kbd>Shift</kbd>+<kbd>F</kbd> (fullscreen), <kbd>Alt</kbd>+<kbd>F</kbd> (focus mode), <kbd>Esc</kbd> (clear selection / exit focus mode).
   - Clear visual status badges in the top-left canvas status bar.
8. **Error Handling & Concurrency**:
   - Fullscreen API promise rejection caught.
   - No asynchronous races or state desyncs detected.

## Verification
- Monorepo tests: PASS (18 test files passed: 187 web tests + 145 api tests + 70 domain tests).
- TypeScript: PASS (`pnpm typecheck` clean across monorepo).
- ESLint: PASS (`pnpm lint` clean, 0 errors/warnings).
- Architecture: PASS (`pnpm check-architecture` clean).
- Build: PASS (`pnpm build` clean across all apps and packages).

**Verdict: CLEAN.** Ready to merge into `main`.
