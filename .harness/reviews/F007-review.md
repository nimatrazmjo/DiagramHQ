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

## PR Review — round 2 (code-review skill, PR #4)
4 findings: round 1's `Promise.race` timeout fix never cleared its `setTimeout`, leaking a pending timer on every health check (probes poll frequently) and delaying graceful shutdown; the global `ValidationPipe`'s `enableImplicitConversion: true` coerces any boolean field via `Boolean(value)`, so the string `"false"` silently becomes `true` — a known class-transformer footgun baked into every future DTO; `extractMessage`/`extractDetails` in the exception filter assumed `exception.getResponse()` is never null, which would throw inside the filter itself (an unhandled crash from the last line of error handling); `CODE_BY_STATUS` had no 5xx entries, so a deliberately-thrown 503 etc. fell back to the generic `'ERROR'` code instead of a stable one.

All 4 fixed in `12c754e`: the timer is captured and `clearTimeout`'d in a `finally`; `enableImplicitConversion` removed (a DTO needing coercion opts in per-field); the filter's extractors guard for null/non-object; `CODE_BY_STATUS` gained 500-504 entries with unmapped 5xx falling back to `INTERNAL` rather than `ERROR`. Added regression tests for all four: a fake-timers assertion that no timer leaks past a fast check (`vi.getTimerCount()`), a boolean-coercion test against the pipe, and filter tests for a 5xx code and a null response body. Re-verified: 38 tests green, typecheck/lint/build/check-architecture clean.

## PR Review — round 3 (code-review skill, PR #4)
10 findings across 8 finder angles run in parallel. Fixed 8: (1) a non-HttpException error with a legitimate status (e.g. body-parser's 413) was flattened into a generic 500 — now honored; (2) every 5xx message was forwarded verbatim for an HttpException, contradicting the filter's own "no leak" doc comment — now masked for all 5xx regardless of source, since the filter can't distinguish a deliberately-safe static string from an accidentally-interpolated internal detail; (3) `CODE_BY_STATUS`'s hand-maintained 12-entry table silently fell back to `'ERROR'` for anything not in it — replaced with `HttpStatus`'s own reverse mapping; (4) hand-rolled `HttpResponseLike`/`HttpRequestLike` duplicated express's real types, now available via round 1's `@types/express`; (5) `extractMessage`/`extractDetails` re-derived the same null/typeof guard independently — merged into one path; (6) the hand-rolled setTimeout/`Promise.race`/`clearTimeout` pattern risked being copy-pasted (bugs and all) by the next dependency check — extracted `common/with-timeout.ts`; (7) new `Logger` calls used plain interpolated strings, not the structured JSON `.harness/scripts/SCRIPTS.md`'s logger contract requires (this is the first API code to add logging, so it sets the precedent) — added `common/logger.ts`; (8) `/health` triggered an independent live DB round trip on every poll, adding load exactly when a struggling DB has the least spare capacity — added a 2s result cache, confirmed live (two rapid curls returned the identical cached `timestamp`).

2 addressed by decision, not code: the suggestion to route the degraded health response through `AllExceptionsFilter` (reusing its status-mapping) was considered and rejected — throwing would replace the diagnostic body with the filter's generic envelope, losing exactly the per-check detail a probe/operator needs; documented in `health.controller.ts` instead. The `Promise.race` timeout doesn't cancel the losing DB query (a slow-not-dead DB keeps holding a pool connection past the timeout) — accepted as the standard client-side-timeout tradeoff, logged in `BLOCKERS.md` alongside the still-missing request-level `correlationId` propagation (bigger than this feature's scope; needs a request-scoped context spanning the whole app).

Fixed in `6a72c4b`. Re-verified: typecheck/lint/build/check-architecture clean, 24 tests green, live smoke test confirming both the 503 path and the new 2s cache against the real server.

## PR Review — round 4 (code-review skill, PR #4) — last round per MAX_PR_ROUNDS=4
6 findings:
1. `apps/api/vitest.config.ts`: Did not load the workspace root `.env`, causing test suites like `database.spec.ts` (relying on `DATABASE_URL` pointed to Docker port 5433) to fail on fallback port 5432 in any shell without manually exported env vars. Fixed by loading root `.env` via `loadEnv` from `vite`.
2. `apps/api/src/health/health.service.ts`: The 2s cache had a thundering herd race condition — concurrent probes arriving while the cache was cold or expired all missed simultaneously and executed separate live `$queryRaw` queries. Fixed by adding `inFlight?: Promise<HealthStatus>` deduplication.
3. `apps/api/src/health/health.service.spec.ts`: Lacked automated unit tests for round 3's cache and TTL behavior. Added unit tests asserting cached result reuse within TTL, TTL expiration, and concurrent in-flight deduplication.
4. `apps/api/src/common/with-timeout.spec.ts`: Shared helper `withTimeout` lacked direct unit tests. Added unit test coverage for success resolution, error propagation, timeout expiration, and timer cleanup.
5. `apps/api/src/common/logger.spec.ts`: Structured logger lacked direct unit tests verifying JSON formatting, levels, and fields. Added unit tests for `logInfo`, `logWarn`, and `logError`.
6. `apps/api/src/common/http-exception.filter.ts`: Lacked a guard against writing to already-committed responses (`response?.headersSent`), risking `ERR_HTTP_HEADERS_SENT` crashes, and dropped custom structured `details` when provided on an `HttpException` response body. Fixed with `headersSent` early-exit and preserving custom `details`. Added regression tests for both.

All 6 addressed in `feat/F007-api-foundation`. Re-verified: 51 tests green (15 domain, 36 api — up from 24; +12 tests across filter, health, with-timeout, and logger), typecheck/lint/build/check-architecture clean, live smoke test against the compiled server + real Postgres verified.

**Verdict**: CLEAN. Exiting PR review loop.
