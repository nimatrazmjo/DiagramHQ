# Code Review — F001 (Project architecture)

Reviewer: independent subagent (standard PR review). Date: 2026-09-26.
Branch: feat/F001-project-architecture. Commits: 1e817c4 (impl) + 6fc63c4 (review fixes).
Verified before review: pnpm typecheck / lint / test (4) / build — all green.

## Verdict
REQUEST CHANGES -> all actioned -> effectively APPROVE. Docker path could not be
built in the sandbox (Docker not installed); validate with `docker compose build`.

## Findings and resolutions
| # | Sev | Finding | Resolution |
|---|-----|---------|------------|
| 1 | MAJOR | `pnpm deploy` might omit gitignored `dist` (no `files`/`main` on api) | Added `files:["dist"]` + `main` to apps/api/package.json. Fixed. |
| 2 | MAJOR | Compose build context must be repo root | Confirmed already `context: .` in docker-compose.yml. No change. |
| 3 | MAJOR | `.gitignore` not seen in the diff | Confirmed it exists (first commit) and covers node_modules/dist/.next/coverage/.env. No change. |
| 4 | MINOR | Next standalone layout not deterministic | Set `outputFileTracingRoot`; inferred-root warning gone. Fixed. |
| 5 | MINOR | Docker layer caching (`COPY . .` before install) | Manifest-first COPY + `--filter <app>...` install. Fixed. |
| 6 | MINOR | CI has no pnpm store cache | Added pnpm/action-setup + `cache: pnpm`. Fixed. |
| 7 | MINOR | domain source-only ESM vs CommonJS api | Deferred to F018 (first consumer); noted in CHANGELOG + Phase 01. |
| 8 | MINOR | ids not collision-safe across processes | Accepted as scaffold placeholder; noted to revisit before persistence. |
| 9 | MINOR | weak default DB password (local only) | Accepted for local dev; must never reach shared/prod. |
| 10 | NIT | COPY as root while running as app | Added `--chown=app:app`. Fixed. |
| 11 | NIT | metadata not typed / engines vs .nvmrc / no-op domain build | Typed metadata (fixed); engines>=20 vs pin22 left (harmless). |

## Deferrals confirmed intentional
Auth/DB/model/canvas out of scope for F001; Tailwind/shadcn deferred to the UI/canvas phases; Redis is infra scaffold.
