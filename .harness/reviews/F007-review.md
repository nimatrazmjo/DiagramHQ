# Code Review — F007 (API foundation)

Reviewer: Evaluator (Rubric-based). Date: 2026-09-26.
Branch: `feat/F007-api-foundation`.
Target: NestJS edge foundation — global ValidationPipe, typed error envelope, health/DB check.

## Evaluator Rubric Scores
- **Acceptance completeness**: 5/5 (all 4 acceptance criteria in `phases/PHASE-01-FOUNDATION.md` met: module-per-domain-area structure, edge validation, typed error envelope with no stack-trace leak, health endpoint)
- **Correctness**: 5/5 (verified two ways: 16 tests including a real HTTP-level integration suite exercising the actual NestJS DI container, and a live smoke test against the running server + real Postgres)
- **Boundary & scope compliance**: 5/5 (check-architecture clean; no domain CRUD endpoints or auth guards added, per "Do Not" in `CURRENT_TASK.md`; validation pipe and exception filter live under `apps/api/src/common/`, a cross-cutting concern, not a domain module)
- **Modularity**: 5/5 (pipe/filter are standalone, globally-applied, reusable across future modules; health stays a thin controller delegating to a testable service)
- **Evidence & handoff quality**: 5/5 (typecheck/lint/test/build/check-architecture all green; live curl evidence below; a real integration-test gap was found and fixed along the way, not just asserted away)

**Average Score**: 5.0 / 5.0
**Verdict**: PASS

## Verification Summary
- `pnpm typecheck`: Clean across all packages and apps.
- `pnpm lint`: Clean, 0 errors/warnings.
- `pnpm test`: 31 tests passed (15 domain, 16 api — up from 6; +10 for F007: filter, validation pipe, and a new 4-test HTTP integration suite).
- `check-architecture`: Clean.
- `pnpm build`: Clean across all apps and packages.
- Live smoke test: started the real compiled server against the running Postgres container —
  - `curl http://localhost:4000/health` → `{"status":"ok","service":"diagramhq-api","timestamp":"...","checks":{"database":"up"}}`, HTTP 200.
  - `curl http://localhost:4000/does-not-exist` → `{"error":{"code":"NOT_FOUND","message":"Cannot GET /does-not-exist"}}`, HTTP 404 (typed envelope, not a raw framework error page).

## A real bug the integration test caught
The initial implementation (recovered from a concurrent session's WIP, see `CHANGELOG.md`) had solid unit tests for each piece in isolation, but nothing exercised NestJS's actual dependency-injection container or the global pipe/filter through a real HTTP request. Adding that (`apps/api/src/app.e2e.spec.ts`) immediately surfaced that Vitest's default esbuild transform doesn't emit the `design:paramtypes` metadata NestJS's constructor injection and `ValidationPipe`'s DTO-metatype detection both depend on (`emitDecoratorMetadata` has no esbuild equivalent) — so `HealthController`'s injected service was `undefined` and invalid payloads silently passed validation. Fixed by adding `unplugin-swc` + `apps/api/vitest.config.ts` (SWC does emit the metadata). This is exactly the class of bug unit tests of isolated classes can't catch — the DI wiring itself was broken, not any one class's logic.

## PR Review — round 1 (code-review skill, PR #4)
2 findings, both CONFIRMED: `GET /health` always returned HTTP 200 even when `body.status` was `'degraded'` — a readiness/liveness probe keying off HTTP status rather than body content would never notice a down database; `checkDatabase()` awaited `$queryRaw` with no timeout, so a network partition (not a clean connection-refused) could hang the check indefinitely instead of failing fast.

Both fixed in `2b2ca88`: the controller now sets 503 via `@Res({ passthrough: true })` when degraded, while still returning the diagnostic body (not the error envelope, which would lose the per-check detail); `checkDatabase()` races the query against a 3s timeout. Added a fake-timers unit test for the timeout path and a second `app.e2e.spec.ts` suite (separate `TestingModule` overriding `PrismaService` to reject) proving the real HTTP response is 503, not just that the body says degraded. Re-verified: 33 tests green (15 domain, 18 api), typecheck/lint/build/check-architecture clean, live smoke test of the healthy path against the real server unaffected.
