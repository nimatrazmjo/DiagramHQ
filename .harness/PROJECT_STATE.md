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
Feature ID: F002
Feature Name: Authentication
Status: COMPLETE (pending PR review loop)

## Overall Progress
Total Features: 135
Completed: 4
In Progress: 0
Blocked: 0
Not Started: 131
Progress: 3.0%
(Recompute from ROADMAP.md on every status change; counter contract in `scripts/SCRIPTS.md`.)

## Last Completed Work
F002 — Authentication. Auth.js (NextAuth v5) in `apps/web` with route protection middleware (`middleware.ts`), login page (`/login`), and JWT session handling. Stateless token verification in `apps/api` via `AuthModule`, `AuthGuard`, `@CurrentUser()`, `@Public()`, and `/auth/me` returning standard typed error envelopes (`UNAUTHORIZED`). Shared domain user/session types in `packages/domain`. Verified: 57 tests green across workspace (15 domain, 5 web, 37 api), typecheck/lint/build/check-architecture clean. Evaluator score 5.0/5.0. Log: `.harness/reviews/F002-review.md`.

Prior: F007 — API foundation (PR #4 merged to main). F006 — Database foundation (PR #1 merged). F001 — Project architecture (merged).

## Current Work
None in progress. F002 PR review loop in progress.

## Next Task
F003 — Organizations. See `CURRENT_TASK.md`.

## Last Verified
F002 @ feat/F002-authentication — pnpm verify (typecheck / lint / test x57 / check-architecture) + pnpm build all green. PostgreSQL 16 container healthy.

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
