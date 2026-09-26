# Implementation Changelog

Every completed feature and every meaningful state change is recorded here, newest first. Each entry names a feature ID (or the tracking system). No vague entries. A feature appears here as COMPLETE only after verification. (Supersedes the earlier `state/claude-progress.md`, archived under `_archive/`.)

## 2026-09-26 — F003 — Organizations

Status: COMPLETE

Implemented:
- Domain types (`packages/domain`): Registered `mem` prefix in `IdPrefix`, typed `MemberId`, and updated `Member` interface.
- API organization capabilities (`apps/api`):
  - `OrganizationsModule`, `OrganizationsService`, and `OrganizationsController` composed into `AppModule`.
  - Input validation: `CreateOrganizationDto` and `UpdateOrganizationDto`.
  - Transactional creation (`POST /organizations`): Creates organization and initial `owner` membership for the authenticated caller; auto-generates slug or validates custom slug with collision resolution.
  - Multi-tenant boundary enforcement: `GET /organizations` only lists organizations where caller is a member; `GET /organizations/:id`, `PATCH /organizations/:id`, `DELETE /organizations/:id` return 404 for unassociated callers (complete cross-tenant invisibility).
  - Role-guarded mutations: `PATCH` guarded to `owner` and `admin` roles; `DELETE` guarded strictly to `owner`.
  - Membership querying: `GET /organizations/:id/members`.
  - Unit test suite (`organizations.service.spec.ts`, 15 tests) and e2e integration test suite (`organizations.e2e.spec.ts`, 9 tests).
- Web application (`apps/web`):
  - `lib/api-token.ts`: Signs stateless JWT tokens from user sessions for backend calls.
  - `app/dashboard/actions.ts`: Server actions for organization creation and listing.
  - `app/dashboard/create-org-form.tsx`: Interactive organization creation form with error feedback.
  - `app/dashboard/page.tsx`: Displays authenticated user's organizations with their assigned roles and creation UI.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (82 tests: 15 domain, 6 web, 61 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F003-review.md`.

---

## 2026-09-26 — F002 — Authentication

Status: COMPLETE

Implemented:
- Architecture decision DEC-007: Auth.js (NextAuth v5) selected with credentials provider and stateless JWT session strategy using shared `AUTH_SECRET`. Zero external cloud SaaS dependencies for clean local development and CI testing.
- Domain types (`packages/domain`): Added `usr_` id prefix, `User`, `AuthSessionUser`, and `AuthTokenPayload` interfaces.
- Web authentication (`apps/web`):
  - NextAuth v5 configuration (`auth.config.ts`, `auth.ts`, `app/api/auth/[...nextauth]/route.ts`).
  - Next.js edge route protection `middleware.ts` redirecting unauthenticated requests from `/dashboard` to `/login?callbackUrl=...`.
  - Accessible, autofill-compliant `/login` form (`LoginForm`).
  - Protected `/dashboard` view with active user session display and sign-out action.
  - Dedicated unit tests in `apps/web/auth.spec.ts`.
- API authentication (`apps/api`):
  - `AuthModule`, `AuthService`, `AuthGuard`, `@CurrentUser()`, `@Public()` decorators.
  - `POST /auth/token` endpoint for token exchange with structured 401 error envelope on invalid credentials.
  - `GET /auth/me` endpoint verifying Bearer JWT tokens and injecting authenticated user claims into controller handler.
  - Unit tests for `AuthService` (5 tests) and `AuthGuard` (5 tests).
  - End-to-end integration tests in `auth.e2e.spec.ts` (6 tests) exercising the real HTTP pipeline and NestJS DI container.
- Config: Updated `packages/config/eslint-preset.js` to preserve NestJS DI decorator metadata across guards, filters, pipes, and interceptors.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (57 tests: 15 domain, 5 web, 37 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F002-review.md`.

---

## 2026-09-26 — F007 — API foundation

Status: COMPLETE

Implemented:
- Global `ValidationPipe` (`apps/api/src/common/validation.ts`): whitelist + reject-unknown + transform, wired in `main.ts`.
- Global `AllExceptionsFilter` (`apps/api/src/common/http-exception.filter.ts`): every thrown error becomes `{ error: { code, message, details? } }`; unknown errors collapse to a generic 500 with no stack trace or internal detail reaching the client (logged server-side only).
- `/health` enhanced to check Postgres connectivity via `PrismaService.$queryRaw` (`apps/api/src/health/health.service.ts`); reports `ok`/`degraded` plus `checks.database`.
- `apps/api/src/app.e2e.spec.ts`: a real HTTP-level integration suite (`@nestjs/testing` + `supertest`) exercising the actual app — health, a 404's error envelope, and a throwaway DTO-validated route (not a permanent endpoint; domain CRUD lands in F003/F004) proving the ValidationPipe rejects/accepts through the real pipeline, not just in isolation.
- `apps/api/vitest.config.ts` + `unplugin-swc`: needed because Vitest's default esbuild transform doesn't emit `design:paramtypes` metadata, which silently broke NestJS DI and DTO-metatype detection — caught by the new integration test, not by the unit tests of each class in isolation.

Verification:
- TypeScript: PASS (`pnpm typecheck` green across all workspace projects)
- Lint: PASS (`pnpm lint` green, 0 errors/warnings)
- Tests: PASS (51 tests: 15 domain, 36 api — up from 6; +30 tests for F007 including integration, cache/dedup, timeout, and logger suites)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` green)
- Live smoke test: real compiled server against the running Postgres container — `GET /health` -> 200 `{"status":"ok",...,"checks":{"database":"up"}}`; `GET /does-not-exist` -> 404 `{"error":{"code":"NOT_FOUND",...}}`.
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F007-review.md`.
- PR Review: pushed to PR #4 (`feat/F007-api-foundation` -> `main`), taken through 4 rounds of `loops/pr-review-loop.md` (code-review skill). 6 findings fixed in round 4 (vitest monorepo root env loading, in-flight probe deduplication preventing thundering herds, cache unit tests, withTimeout unit tests, structured logger unit tests, headersSent guard, custom details extraction). GitHub Actions CI green. Verdict: CLEAN.

Notes: implementation was recovered from a concurrent (Antigravity/Cowork) session's uncommitted WIP, stashed mid-session and popped onto a fresh `feat/F007-api-foundation` branch (created from `main` after F006/harness-docs/agent-relay-cleanup all merged) rather than lost or discarded.

---

## 2026-09-26 — Agent relay keep-awake + runtime notes (harness tooling)

Status: COMPLETE (tooling; not a product feature)

Implemented:
- `scripts/agent-relay.sh`: keeps the Mac awake (`caffeinate -dimsu`) while the relay runs; cleans it up on INT/TERM/HUP/EXIT (was INT-only) and now also kills the backgrounded `claude`/`agy` child on signal, not just the caffeinate helper.
- `.harness/RUNTIME-CONTINUITY.md`: documents a third environment (a cloud Cowork Linux VM that has touched this repo between relay sessions) — explicitly not part of `agent-relay.sh`'s two-runtime rotation — plus the cross-platform `node_modules`/Prisma-engine gotcha and the division of labor when a Cowork session is involved.

Verification: `bash -n scripts/agent-relay.sh` clean; smoke-tested the background+wait+signal pattern in isolation (SIGTERM to the wrapper kills the backgrounded child, confirmed via `ps` before/after). No product code touched.

Review: `code-review` skill via PR #3 (`loops/pr-review-loop.md`). Log: `.harness/reviews/agent-relay-cleanup-and-runtime-notes-review.md`.

---

## 2026-09-26 — F006 — Database foundation

Status: COMPLETE

Implemented:
- PostgreSQL + Prisma ORM in `apps/api` with full data model schema per `DATA_MODEL.md` (organizations, workspaces, architectures, versions, model_objects, model_connections, tags, technologies, views, view_objects, flows, decisions, environments, phases, members).
- Initial SQL migration `20260926000000_init` applied cleanly to live PostgreSQL 16 instance.
- `packages/domain` pure invariants (`canConnect`, `validateConnection`, `hasParentCycle`, `validateViewObject`, `assertTenantAccess`) with branded types and comprehensive unit test coverage.
- Query-layer tenant isolation via `TenantContext` in `apps/api/src/database/tenant.context.ts` guaranteeing strict organization boundary enforcement.
- Local dev seed script (`apps/api/prisma/seed.ts`) populating organization, workspace, architecture, 4 model objects, 2 connections, and 1 view.
- Architectural boundary enforcement via `scripts/check-architecture.sh` wired into `init.sh` and `pnpm verify`.

Verification:
- TypeScript: PASS (`pnpm typecheck` green across all 5 workspace projects)
- Lint: PASS (`pnpm lint` green, 0 errors/warnings)
- Tests: PASS (20 tests passed: 15 domain invariant tests, 5 API tests including entity round-trip, cross-tenant denial, and connection invariant tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` green)
- Database: PASS (migration applied to PostgreSQL 16 container, seed script executed successfully)
- Evaluator Rubric Score: 5.0 / 5.0 (acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5) -> PASS. Log: `.harness/reviews/F006-review.md`.

PR Review: pushed to PR #1 (`feat/F006-database-foundation` -> `main`), taken through 3 rounds of the new `loops/pr-review-loop.md` (code-review skill). 22 correctness/efficiency findings fixed across the 3 rounds (build ordering, layer-boundary regex gaps, cross-tenant/cross-architecture/cross-version integrity gaps on `versionId`/`parentId`, a missing FK, unwired domain invariants (`hasParentCycle`, `validateViewObject`), CI gaps, stale docs); 2 structural findings (TenantContext's per-model isolation pattern, `architecture.create`'s non-transactional `defaultVersionId` set) logged as open decisions in `BLOCKERS.md` rather than fixed mid-PR. Stopped at round 3 by user decision (diminishing severity; not all `MAX_PR_ROUNDS`=4 exhausted). Re-verified after every round: 21 tests green, typecheck/lint/build/check-architecture clean. Log: `.harness/reviews/F006-review.md`. Merged to `main`.

---

## 2026-09-26 — Runtime continuity protocol (harness tooling)

Status: COMPLETE (tooling; not a product feature)

Added:
- `.harness/RUNTIME-CONTINUITY.md` — fail over between Claude Code (`claude`) and Antigravity (`agy`, Claude Sonnet) when a runtime hits its usage/session limit; resume from PROJECT_STATE.md.
- `.harness/RUNTIME-SWITCHES.md` — switch ledger.
- `scripts/agent-relay.sh` — optional relay that alternates the two runtimes across limits.
- AGENTS.md gained a "Usage / session limits" rule; README layout updated.

Notes: `agy` model id for Sonnet is set via `AGY_SONNET_MODEL` / `agy` -> `/model` (list includes Claude Sonnet). Relay switches on any runtime exit; tune to a limit-message grep if you want limit-only switching.

---

## 2026-09-26 — F001 — Project architecture

Status: COMPLETE

Implemented:
- pnpm monorepo: apps/web (Next.js 14 standalone), apps/api (NestJS 10 + health endpoint), packages/domain (framework-free: branded ids + a connection invariant + tests), packages/config (shared ESLint preset).
- Strict TypeScript base; ESLint + Prettier + Vitest; scripts/init.sh baseline; .harness/CLAUDE.md command table filled in.
- Docker: multi-stage Dockerfiles (api via `pnpm deploy`, web via Next standalone) + docker-compose (web/api/postgres/redis) + GitHub Actions CI.

Files: 42. Commits: 1e817c4 (impl) + review-fix commit on feat/F001-project-architecture.

Verification: TypeScript PASS · Lint PASS · Unit tests PASS (4) · Build PASS · Docker build NOT RUN (no Docker in sandbox — validate with `docker compose build`).

Review: independent subagent — REQUEST CHANGES -> resolved (deploy dist inclusion, docker caching, Next outputFileTracingRoot, CI pnpm cache, typed metadata) -> APPROVE. Log: .harness/reviews/F001-review.md.

Notes: domain is source-exported (ESM/CJS interop with the CommonJS api deferred to F018); ids are a scaffold placeholder (not collision-safe across processes); Tailwind/shadcn deferred to the UI/canvas phases.

---

## 2026-09-25 — Tracking system established

Status: COMPLETE (tracking setup; not a product feature)

Implemented:
- Persistent implementation tracking system inside `.harness/`: PROJECT_STATE.md (master), ROADMAP.md (135 features across 13 phases, permanent F-IDs), CURRENT_TASK.md, CHANGELOG.md, DECISIONS.md, BLOCKERS.md, and phases/PHASE-01..13.md.
- Adopted the 13-phase F001–F108 taxonomy (+ F109–F135 for master-spec items not in the reference list); carried the acceptance criteria + tests from the retired feature_list.json into the phase files.
- Made the Markdown tracking system the single source of truth; archived the superseded feature_list.json, session-handoff.md, FEATURE_MATRIX.md, and claude-progress.md under `_archive/`.

Files: `.harness/PROJECT_STATE.md`, `ROADMAP.md`, `CURRENT_TASK.md`, `DECISIONS.md`, `BLOCKERS.md`, `phases/*` (+ repointed AGENTS.md/CLAUDE.md/README.md/scope-guard.md/PRODUCT.md and scripts/SCRIPTS.md).

Verification:
- Structure: 6 master files + 13 phase files present.
- ROADMAP counts: 135 features, 0 complete, progress 0.0%.
- No application code in the repo (all features correctly NOT STARTED).

Notes: No product feature implemented — this was the tracking-system task. Product build begins at F001.

---

## 2026-09-25 — Harness bootstrap (history)

Status: COMPLETE

Implemented (before the tracking system):
- Created the `.harness/` rules + spec system from the 8 Learn-Harness-Engineering projects: entry points, product/, architecture/ (+ 3 ADRs), rules/, verification/, loops/, graph/, scripts/.
- Wrote the DiagramHQ product spec and the initial 6-phase feature checklist (later restructured into the 13-phase ROADMAP above).

Verification: harness tree present; no application code.

Notes: Retained for history. The 6-phase feature_list.json from this work is archived under `_archive/`.
