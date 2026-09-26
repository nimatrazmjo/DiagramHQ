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
F006 — Database foundation. Postgres + Prisma + migrations for core model schema, tenant isolation, and domain invariants. Verified: migration applied, 21 tests green (15 domain, 6 api), seed script executed, typecheck/lint/build/check-architecture green. Evaluator score 5.0/5.0. Pushed to PR #1 (`feat/F006-database-foundation` -> `main`) and taken through 3 rounds of PR review (`loops/pr-review-loop.md`); every correctness finding fixed, 2 structural items (TenantContext's per-model isolation pattern, `architecture.create`'s non-transactional defaultVersionId set) logged as open decisions in `BLOCKERS.md` rather than fixed. Not yet merged — awaiting human merge of PR #1.

## Current Work
None in progress. F006 done pending PR #1 merge; ready to start F007 (API foundation) once merged.

## Next Task
Merge PR #1 (F006), then F007 — API foundation (NestJS skeleton, validation, error envelope, health). See CURRENT_TASK.md.

## Last Verified
F006 @ feat/F006-database-foundation — pnpm verify (typecheck / lint / test x21 / check-architecture) + pnpm build all green. PostgreSQL 16 container healthy.

## Current Git Commit
main @ 4b709a3 (unchanged; PR #1 not yet merged). Branch feat/F006-database-foundation @ a3886f6. Working tree CLEAN on this branch — a stashed, unrelated F007 WIP (from a concurrent session) sits in `git stash list`, not yet popped.

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
Scaffolded (NestJS 10 + health endpoint). Full surface from F007. Not yet wired to the domain/DB.

## Frontend Status
Scaffolded (Next.js 14 standalone shell). React Flow canvas in Phase 02. Tailwind/shadcn deferred to the UI phase.

## Backend Status
NOT STARTED. NestJS + Prisma + Redis. Foundation in Phase 01.

## Testing Status
Vitest wired; 21 tests passing (15 domain, 6 api). GitHub Actions CI runs lint/build/typecheck/test/check-architecture (see `.github/workflows/ci.yml`).

## Integration Status
NOT STARTED. Code integrations Phase 09; infrastructure Phase 10. None connected.
