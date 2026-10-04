# Feature Review Audit: F134 — Mobile

## Acceptance Criteria Checklist
- [x] **Mobile Web Workflows**: View diagrams, fast search, review comments, pull request approvals, notifications, and AI Copilot questions.
- [x] **Desktop-First Canvas Invariant**: Canvas stays desktop-first on viewports < 768px (`getCanvasDisplayMode`), with clear advisory banner and first-class companion toolset.
- [x] **Test: Mobile viewport: view + approve a change + comment**: Fully verified under simulated mobile viewport constraints (375px width) in `mobile.test.ts` (6 unit tests) and `mobile.spec.tsx` (3 integration tests).

## Review Sign-off
- **Architectural Boundary**: Zero runtime dependencies in `@diagramhq/domain`.
- **Component Design**: Accessible mobile shell with bottom navigation bar and reactive workflows in `@diagramhq/web`.
- **Status**: APPROVED for merge to `main`.
