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
Status: COMPLETE (details in CURRENT_TASK.md; not yet merged — its own PR is about to be opened and taken through `loops/pr-review-loop.md`)

## Overall Progress
Total Features: 135
Completed: 3
In Progress: 0
Blocked: 0
Not Started: 132
Progress: 2.2%
(Recompute from ROADMAP.md on every status change; counter contract in `scripts/SCRIPTS.md`.)

## Last Completed Work
F007 — API foundation. Global `ValidationPipe` (class-validator/class-transformer), global `AllExceptionsFilter` producing the typed `{ error: { code, message, details } }` envelope with no stack-trace/DB-error leakage, `/health` checking Postgres via `PrismaService`. Verified: 31 tests green (15 domain, 16 api — including a new real HTTP-level integration suite, `apps/api/src/app.e2e.spec.ts`), typecheck/lint/build/check-architecture green, plus a live smoke test against the running server + real Postgres (`curl /health` -> 200 ok/up; `curl /does-not-exist` -> 404 typed envelope). Evaluator score 5.0/5.0. Log: `.harness/reviews/F007-review.md`.

Implementation was recovered from a concurrent (Antigravity/Cowork) session's uncommitted WIP that had been stashed mid-session rather than lost; completing it surfaced a real bug the unit tests alone had missed — Vitest's default esbuild transform doesn't emit the `design:paramtypes` metadata NestJS's DI/`ValidationPipe` need, silently breaking both constructor injection and DTO validation. Fixed via `unplugin-swc` + `apps/api/vitest.config.ts` (see `F007-review.md` for detail).

Also landed since the last update to this file: F006 merged (PR #1, 3 review rounds); harness `pr-review-loop.md` docs merged (PR #2, 4 rounds); `scripts/agent-relay.sh` keep-awake/signal-handling cleanup + `RUNTIME-CONTINUITY.md` platform notes merged (PR #3, 4 rounds — recovered after an accidental `git checkout main -- .` wiped them mid-session; see that PR's commit history for the full account).

## Current Work
None in progress. F007 done, awaiting its own PR + `loops/pr-review-loop.md` pass before merge.

## Next Task
Open a PR for `feat/F007-api-foundation`, run it through the review loop, merge. Then F002 — Authentication (next unchecked item in ROADMAP order; F006/F007 were worked ahead of it with no recorded reason). See `CURRENT_TASK.md`.

## Last Verified
F007 @ feat/F007-api-foundation — pnpm verify (typecheck / lint / test x31 / check-architecture) + pnpm build all green. Live smoke test against real Postgres green. PostgreSQL 16 container healthy.

## Current Git Commit
main @ a9fa586 (F006, harness docs, and agent-relay cleanup all merged). Branch `feat/F007-api-foundation`, branched fresh from main after those merges. Working tree CLEAN — the stashed F007 WIP mentioned in earlier versions of this file has been popped and built on; `git stash list` is empty.

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
