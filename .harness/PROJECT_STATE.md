# Project State

> **MASTER FILE. Every Harness session reads this FIRST, before doing anything.**
> Then: CURRENT_TASK.md → ROADMAP.md → the active phase file → DECISIONS.md + BLOCKERS.md → then inspect the actual code (the codebase is the source of truth for what EXISTS; these files are the source of truth for intended state + history). If they disagree, inspect, correct these files, and note the discrepancy in CHANGELOG.md.

## Product
Name: DiagramHQ
Description: Model-first architecture intelligence platform (a "better than IcePanel" Architecture OS). The model — objects + connections — is the product; diagrams are projections of it. Full spec: `product/PRODUCT.md`. CLI: `dhq`.

## Current Phase
Phase: 05
Phase Name: Flows
Status: IN PROGRESS

## Current Feature
Feature ID: F044
Feature Name: Flow playback
Status: NOT STARTED

## Overall Progress
Total Features: 135
Completed: 45
In Progress: 0
Blocked: 0
Not Started: 90
Progress: 33.3%
(Recompute from ROADMAP.md on every status change; counter contract in `scripts/SCRIPTS.md`.)

## Last Completed Work
F043 — Flow visualization. Highlight flow path over existing architecture. Added `projectFlowToCanvas()` domain projection (4 unit tests), `<FlowBadges />` UI component, node dimming/highlighting integration across all node types, animated edge glow and step pill badges in `icepanel-edge.tsx`, and web integration suite in `flow-visualization.spec.ts` (4 tests).

Prior: F042 — Flow steps. Ordered, annotated steps. Added `addFlowStep()`, `removeFlowStep()`, `annotateFlowStep()`, `reorderFlowStepsByIndex()`, and `reorderFlowStepList()` to domain (5 tests), added step endpoints and unit tests to API (5 tests), and added web integration spec in `flow-steps.spec.ts` (4 tests).

Prior: F041 — Flow model. Ordered sequence of connections. Added `FlowStep` and `FlowWithSteps` domain interfaces, pure domain validation & creation functions in `flow.ts` (8 unit tests), NestJS `FlowsModule` with endpoints and unit tests (8 tests), and web integration spec in `flow-model.spec.ts` (4 tests).

Prior: F135 — Architecture templates. Starter templates (SaaS, e-commerce, fintech, healthcare, microservices, monolith, serverless, event-driven, data-platform, Kubernetes, AWS, Azure, GCP). Pure domain instantiation, UI template picker card grid, 19 integration tests.

Prior: F115 — Persona modes. Added `projectPersonaViewToCanvas` domain projection, `<PersonaBadges />` UI component, and `persona-modes.spec.ts` integration spec covering all 8 persona modes.

Prior: F114 — Technology catalog. Added Technology model properties, technology view projection, UI badges, and view filter lifecycle evaluation.

Prior: F040 — Ownership views. Added `projectOwnershipViewToCanvas` projection and `<OwnershipBadges />` component to color objects by team/owner.

Prior: F039 — Data views. Added `projectDataViewToCanvas` projection and `<DataBadges />` component to highlight data classification and animate data movement flows.

Prior: F038 — Security views. Added projection wrappers and custom badge components for trust boundaries, endpoints, auth, compliance, secrets, and encryption.

Prior: F037 — Saved views. Added `isStarred` property to views, with `PATCH /views/:viewId` endpoint. Validated by 2 new e2e tests in `saved-views.e2e.spec.ts`.

## Current Work
F044 — Flow playback. Animated playback with play, pause, next, previous, speed, and restart controls.

## Next Task
F044 — Flow playback. Animated playback with play, pause, next, previous, speed, and restart controls.

## Last Verified
F043 @ feat/F043-flow-visualization — typecheck / lint / tests (177 domain + 318 web + 270 api = 765 total) / check-architecture / pnpm build all green.

## Current Git Commit
Working tree: on branch `feat/F043-flow-visualization`.



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
