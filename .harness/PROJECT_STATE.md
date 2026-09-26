# Project State

> **MASTER FILE. Every Harness session reads this FIRST, before doing anything.**
> Then: CURRENT_TASK.md → ROADMAP.md → the active phase file → DECISIONS.md + BLOCKERS.md → then inspect the actual code (the codebase is the source of truth for what EXISTS; these files are the source of truth for intended state + history). If they disagree, inspect, correct these files, and note the discrepancy in CHANGELOG.md.

## Product
Name: DiagramHQ
Description: Model-first architecture intelligence platform (a "better than IcePanel" Architecture OS). The model — objects + connections — is the product; diagrams are projections of it. Full spec: `product/PRODUCT.md`. CLI: `dhq`.

## Current Phase
Phase: 02
Phase Name: Canvas
Status: IN PROGRESS

## Current Feature
Feature ID: F011
Feature Name: Object selection
Status: COMPLETE

## Overall Progress
Total Features: 135
Completed: 11
In Progress: 0
Blocked: 0
Not Started: 124
Progress: 8.1%
(Recompute from ROADMAP.md on every status change; counter contract in `scripts/SCRIPTS.md`.)

## Last Completed Work
F011 — Object selection. Single-click node and edge selection on the canvas with active visual styling rings on CustomNodes (`SystemNode`, `AppNode`, `StoreNode`), Escape key clearing, pane click deselect, selection badge (`N SELECTED (ESC TO CLEAR)`), and toolbar `Clear` action. Synchronized with `useCanvasStore` (`selectNode`, `selectEdge`, `isNodeSelected`, `isEdgeSelected`, `clearSelection`) with zero domain entity models stored (Layer Boundaries Rule 4). Verified: 245 tests green across monorepo (34 domain, 81 web, 130 api), typecheck/lint/build/check-architecture clean. Evaluator score 5.0/5.0.

Prior: F010 — Pan and zoom (PR #11 merged). F009 — Infinite canvas (PR #10 merged). F008 — Application shell (PR #9 merged). F005 — User roles (PR #8 merged). F004 — Workspaces (PR #7 merged). F003 — Organizations (PR #6 merged). F002 — Authentication (PR #5 merged). F007 — API foundation (PR #4 merged). F006 — Database foundation (PR #1 merged). F001 — Project architecture (merged).

## Current Work
F011 review and PR merge; next feature: F012 — Drag and drop.

## Next Task
F012 — Drag and drop. See `CURRENT_TASK.md`.

## Last Verified
F011 @ feat/F011-object-selection — pnpm verify (typecheck / lint / test x245 / check-architecture) + pnpm build all green. PostgreSQL 16 container healthy.

## Current Git Commit
Branch `feat/F011-object-selection`. Working tree clean.

## Important Notes
- Model-first is non-negotiable (DEC-001 / ADR-0001). Diagrams never store objects.
- Build one feature at a time; phases are gated (finish + test a phase before the next). See ROADMAP.md phase order.
- No feature is COMPLETE without recorded evidence (CHANGELOG.md) and an Evaluator pass (`verification/`).
- Statuses are exactly: NOT STARTED, IN PROGRESS, BLOCKED, IN REVIEW, COMPLETE, DEPRECATED.

## Active Blockers
None. See BLOCKERS.md.

## Architecture Status
NOT STARTED. Target layers + boundaries defined in `architecture/ARCHITECTURE.md` and `rules/layer-boundaries.md`.

## Database Status
Foundation COMPLETE (F006, pending PR #1 merge). Postgres + Prisma schema matching `architecture/DATA_MODEL.md`, tenant-isolated via `TenantContext` (`apps/api/src/database/tenant.context.ts`), model_objects + model_connections adjacency (ADR-0003).

## API Status
Edge foundation COMPLETE (F007, pending its own PR merge): global validation, typed error envelope, `/health` wired to Postgres via `PrismaService`. Domain CRUD endpoints land in F003/F004/F018; auth guards in F002.

## Frontend Status
Scaffolded (Next.js 14 standalone shell). React Flow canvas in Phase 02. Tailwind/shadcn deferred to the UI phase.

## Backend Status
NOT STARTED. NestJS + Prisma + Redis. Foundation in Phase 01.

## Testing Status
Vitest wired; 31 tests passing (15 domain, 16 api — including a real HTTP-level NestJS integration suite via `@nestjs/testing` + `supertest`, `apps/api/src/app.e2e.spec.ts`). GitHub Actions CI runs lint/build/typecheck/test/check-architecture (see `.github/workflows/ci.yml`).

## Integration Status
NOT STARTED. Code integrations Phase 09; infrastructure Phase 10. None connected.
