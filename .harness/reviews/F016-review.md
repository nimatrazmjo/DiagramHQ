# Code Review — F016 (Undo/redo)

Reviewer: PR Review Loop (Maker-Checker protocol). Date: 2026-09-26.
Branch: `feat/F016-undo-redo`. Target: PR #17.

## Round 1 — Findings & Fixes

Diff reviewed: `git diff origin/main...HEAD` across 17 files (+1014 / -67).

### Findings identified:
1. **[CONFIRMED, high]** In `apps/web/lib/commands/dispatcher.ts`, `undo()` and `redo()` popped commands from their respective stacks prior to awaiting execution (`command.undo()` / `command.execute()`). If an asynchronous persist or execution threw an error (e.g. network failure), the command was silently dropped from both `history` and `undone`, permanently corrupting the user's undo stack.
   - *Fix applied*: Wrapped `command.undo()` and `command.execute()` in try/catch blocks that restore the command back to `history` or `undone` on failure and re-throw the error, preserving history integrity. Added 2 regression tests verifying error rollback in `apps/web/undo-redo.spec.ts`.
2. **[CONFIRMED, medium]** In `apps/web/components/canvas/infinite-canvas.tsx`, `handleUndo` and `handleRedo` checked `if (isMutatingGraphRef.current) return;` but did not set `isMutatingGraphRef.current = true` while awaiting `defaultCommandDispatcher.undo()` or `redo()`. Successive rapid <kbd>Cmd</kbd>+<kbd>Z</kbd> strokes or clicks could race concurrently while network persists were in flight.
   - *Fix applied*: Acquired `isMutatingGraphRef.current = true` and `setIsMutatingGraph(true)` in both handlers and released them in `finally` blocks, adhering to the concurrency-guard pattern established in F014 and F015.
3. **[CONFIRMED, low]** ESLint `@typescript-eslint/no-explicit-any` violations were present in several command files' `applyCanvasUpdate` signatures and in test state mocks.
   - *Fix applied*: Replaced all `any` usages with `StateSetFn<Node>`, `StateSetFn<Edge>`, and concrete `@xyflow/react` types. Clean 0 errors / 0 warnings verified.

## Verification
- Monorepo tests: PASS (18 test files passed, 145 api tests + 25 undo-redo tests + 151 other web tests + 70 domain tests).
- TypeScript: PASS (`pnpm typecheck` clean across monorepo).
- ESLint: PASS (`pnpm lint` clean, 0 errors/warnings).
- Architecture: PASS (`pnpm check-architecture` clean).
- Build: PASS (`pnpm build` clean across all apps and packages).

**Verdict: CLEAN.** Ready to merge into `main`.
