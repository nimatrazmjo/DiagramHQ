# Project State

> **MASTER FILE. Every Harness session reads this FIRST, before doing anything.**
> Then: CURRENT_TASK.md → ROADMAP.md → the active phase file → DECISIONS.md + BLOCKERS.md → then inspect the actual code (the codebase is the source of truth for what EXISTS; these files are the source of truth for intended state + history). If they disagree, inspect, correct these files, and note the discrepancy in CHANGELOG.md.

## Product
Name: DiagramHQ
Description: Model-first architecture intelligence platform (a "better than IcePanel" Architecture OS). The model — objects + connections — is the product; diagrams are projections of it. Full spec: `product/PRODUCT.md`. CLI: `dhq`.

## Current Phase
Phase: 03
Phase Name: Architecture Model
Status: IN PROGRESS

## Current Feature
Feature ID: F032
Feature Name: Context diagrams
Status: NOT STARTED

## Overall Progress
Total Features: 135
Completed: 31
In Progress: 0
Blocked: 0
Not Started: 104
Progress: 23.0%
(Recompute from ROADMAP.md on every status change; counter contract in `scripts/SCRIPTS.md`.)

## Last Completed Work
F031 — Object lifecycle. Domain state machine (future, live, deprecated, removed), transition validator and factory, 4 domain tests, 4 API e2e tests, 3 web tests, and singleFork vitest config. PR #32.

Prior: F030 — Object metadata (PR #31 merged). F029 — Connections (PR #30 merged). F028 — Group (PR #29 merged). F027 — Queue (PR #28 merged). F026 — Database (PR #27 merged). F025 — Component (PR #26 merged). F024 — Application (PR #25 merged). F023 — System (PR #24 merged). F022 — Person (PR #23 merged). F021 — C4 Component (PR #22 merged). F020 — C4 Container (PR #21 merged). F019 — C4 Context (PR #20 merged). F018 — Architecture model (PR #19 merged). F017 — Minimap (PR #18 merged). F016 — Undo/redo (PR #17 merged). F015 — Auto-layout (PR #16 merged). F014 — Alignment (PR #15 merged). F013 — Multi-select (PR #14 merged). F012 — Drag and drop (PR #13 merged). F011 — Object selection (PR #12 merged). F010 — Pan and zoom (PR #11 merged). F009 — Infinite canvas (PR #10 merged). F008 — Application shell (PR #9 merged). F005 — User roles (PR #8 merged). F004 — Workspaces (PR #7 merged). F003 — Organizations (PR #6 merged). F002 — Authentication (PR #5 merged). F007 — API foundation (PR #4 merged). F006 — Database foundation (PR #1 merged). F001 — Project architecture (merged).

## Current Work
None. Ready to start F032 — Context diagrams.

## Next Task
F032 — Context diagrams. First diagram type from the model.

## Last Verified
F031 @ feat/F031-object-lifecycle — pnpm verify (typecheck / lint / test / check-architecture) + pnpm build all green (260 web tests, 236 api tests, 135 domain tests).

## Current Git Commit
Branch `feat/F031-object-lifecycle`. Working tree clean.

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
