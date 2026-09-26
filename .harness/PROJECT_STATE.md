# Project State

> **MASTER FILE. Every Harness session reads this FIRST, before doing anything.**
> Then: CURRENT_TASK.md → ROADMAP.md → the active phase file → DECISIONS.md + BLOCKERS.md → then inspect the actual code (the codebase is the source of truth for what EXISTS; these files are the source of truth for intended state + history). If they disagree, inspect, correct these files, and note the discrepancy in CHANGELOG.md.

## Product
Name: DiagramHQ
Description: Model-first architecture intelligence platform (a "better than IcePanel" Architecture OS). The model — objects + connections — is the product; diagrams are projections of it. Full spec: `product/PRODUCT.md`. CLI: `dhq`.

## Current Phase
Phase: 01
Phase Name: Foundation
Status: IN PROGRESS

## Current Feature
Feature ID: F007
Feature Name: API foundation
Status: NOT STARTED (details in CURRENT_TASK.md)

## Overall Progress
Total Features: 135
Completed: 2
In Progress: 0
Blocked: 0
Not Started: 133
Progress: 1.5%
(Recompute from ROADMAP.md on every status change; counter contract in `scripts/SCRIPTS.md`.)

## Last Completed Work
F006 — Database foundation. Postgres + Prisma + migrations for core model schema, tenant isolation, and domain invariants. Verified: migration applied, 20 tests green (15 domain, 5 api), seed script executed, typecheck/lint/build/check-architecture green. Evaluator score 5.0/5.0. Lives on branch `feat/F006-database-foundation`.

## Current Work
None in progress. Ready for F007 (API foundation).

## Next Task
F007 — API foundation (NestJS skeleton, validation, error envelope, health). See CURRENT_TASK.md.

## Last Verified
F006 @ feat/F006-database-foundation — pnpm typecheck / lint / test (20) / check-architecture / build all green. PostgreSQL 16 container healthy.

## Current Git Commit
main @ 4b709a3. Branch feat/F006-database-foundation @ 905243a (F006). Working tree CLEAN.

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
NOT STARTED. Schema designed in `architecture/DATA_MODEL.md` (Postgres + Prisma; tenant-isolated; model_objects + model_connections adjacency, ADR-0003). Lands in F006.

## API Status
Scaffolded (NestJS 10 + health endpoint). Full surface from F007. Not yet wired to the domain/DB.

## Frontend Status
Scaffolded (Next.js 14 standalone shell). React Flow canvas in Phase 02. Tailwind/shadcn deferred to the UI phase.

## Backend Status
NOT STARTED. NestJS + Prisma + Redis. Foundation in Phase 01.

## Testing Status
Vitest wired; 4 tests passing (domain + api). GitHub Actions CI runs lint/typecheck/test/build.

## Integration Status
NOT STARTED. Code integrations Phase 09; infrastructure Phase 10. None connected.
