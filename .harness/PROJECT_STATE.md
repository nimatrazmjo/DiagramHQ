# Project State

> **MASTER FILE. Every Harness session reads this FIRST, before doing anything.**
> Then: CURRENT_TASK.md → ROADMAP.md → the active phase file → DECISIONS.md + BLOCKERS.md → then inspect the actual code (the codebase is the source of truth for what EXISTS; these files are the source of truth for intended state + history). If they disagree, inspect, correct these files, and note the discrepancy in CHANGELOG.md.

## Product
Name: DiagramHQ
Description: Model-first architecture intelligence platform (a "better than IcePanel" Architecture OS). The model — objects + connections — is the product; diagrams are projections of it. Full spec: `product/PRODUCT.md`. CLI: `dhq`.

## Current Phase
Phase: 04
Phase Name: Diagrams and Views
Status: IN PROGRESS

## Current Feature
Feature ID: F038
Feature Name: Security views
Status: NOT STARTED

## Overall Progress
Total Features: 135
Completed: 37
In Progress: 0
Blocked: 0
Not Started: 98
Progress: 27.4%
(Recompute from ROADMAP.md on every status change; counter contract in `scripts/SCRIPTS.md`.)

## Last Completed Work
F037 — Saved views. Added `isStarred` property to views, with `PATCH /views/:viewId` endpoint. Validated by 2 new e2e tests in `saved-views.e2e.spec.ts`.

Prior: F036 — Filters. FilterBuilder React component allowing composition of multi-attribute filters. Validated via renderToString tests and mapped to evaluateDynamicView. PR #37 merged.

Prior: F035 — Dynamic views. Live filtered projections across 12 criteria (team, technology, environment, domain, owner, status, tag, criticality, data-classification, cloud, region, repository). View projection updates immediately on object metadata modifications. 4 API e2e tests, 1 web test, 3 domain tests. PR #36.

## Current Work
None. Ready to start F038 — Security views.

## Next Task
F038 — Security views. Overlay trust boundaries, public endpoints, auth, encryption, secrets, PII/PCI/HIPAA/SOC2.

## Last Verified
F037 @ feat/F037-saved-views — pnpm verify (typecheck / lint / test / check-architecture) + pnpm build all green.

## Current Git Commit
Working tree: DIRTY on branch `feat/F037-saved-views`.

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
