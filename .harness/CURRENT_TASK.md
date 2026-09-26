# Current Task

Feature ID: F008
Feature: Application shell (Next.js shell: left navigator, top bar, inspector slot, responsive routing)
Status: COMPLETE (PR ready for review loop)
Phase: Phase 01 — Foundation

## Objective
Implement responsive Next.js application shell: Left navigator (Overview, Systems, Apps, Data, Flows, Views, Decisions), Top bar (search, AI, user), Right inspector slot, and route integration under `/workspace/[workspaceId]` holding at narrow phone viewports.

## Prerequisite
F001–F007 are COMPLETE and merged to `main`. Branch `feat/F008-application-shell` is active.

## Steps
- [x] Create `apps/web/components/shell/` (`left-navigator.tsx`, `top-bar.tsx`, `inspector-panel.tsx`, `app-shell.tsx`)
- [x] Implement Left navigator with all 7 sections (Overview, Systems, Apps, Data, Flows, Views, Decisions)
- [x] Implement Top bar with search input, AI button, and user session display
- [x] Implement Right inspector slot with collapsible state
- [x] Implement responsive layout with mobile drawer toggle for narrow phone widths
- [x] Wire `/workspace/[workspaceId]` studio layout and views in `apps/web/app/workspace/`
- [x] Protect `/workspace` in `apps/web/middleware.ts` and link from dashboard
- [x] Unit & component tests in `apps/web/shell.spec.ts`
- [x] Run full verification suite (`pnpm verify` + `pnpm build`)

## Verification
- [x] TypeScript: PASS · Lint: PASS · Unit/Integration: PASS · Build: PASS · check-architecture: PASS

## Do Not
- Implement canvas nodes/edges (F009).
- Implement pan and zoom canvas interactions (F010).
- Wire live AI LLM streaming backend (Phase 08).

## Next Task
F009 — Infinite canvas (Phase 02 — Canvas).

## Last Updated
2026-09-26
