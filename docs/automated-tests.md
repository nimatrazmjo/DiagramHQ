# Automated tests

Automated testing in DiagramHQ combines **Vitest** for fast unit and integration tests, alongside **Playwright** for complete browser end-to-end (E2E) testing with automated WebM video recording.

| Package / Layer | Path / Files | Kind | Needs a database / server |
|---|---|---|:-:|
| `packages/domain` | `src/*.test.ts` | Pure unit tests: model, invariants, layouts, projections, filters, templates, lifecycle | No |
| `apps/api` | `src/**/*.spec.ts` | Unit tests plus HTTP e2e (`*.e2e.spec.ts`) booting the real NestJS app with supertest | **Yes** (Postgres) |
| `apps/web` (unit) | `apps/web/*.spec.ts(x)` | Feature integration specs: canvas, commands, undo/redo, views, badges, templates, auth | No |
| `apps/web` (E2E) | `apps/web/e2e/*.spec.ts` | **Playwright E2E**: auth redirects, canvas drag-and-drop, React Flow C4 navigation, visual regression, WebM videos | **Yes** (Next.js server) |

> 📊 **E2E Status & Backlog Matrix**: See [`docs/e2e-testing-matrix.md`](e2e-testing-matrix.md) for detailed test breakdowns, video logs, and upcoming test areas.

## Run

```bash
# Vitest test suites
pnpm test                                    # all Vitest suites
pnpm --filter @diagramhq/domain test         # domain unit tests
pnpm --filter @diagramhq/web test            # web integration tests
pnpm --filter @diagramhq/api test            # api HTTP tests

# Playwright E2E test suites (with WebM video recording)
pnpm test:e2e                                # headless Playwright (auto boots Next.js)
pnpm --filter @diagramhq/web test:e2e:headed # headed Playwright browser mode
```

### API e2e prerequisites

The API suite hits a real Postgres through `DATABASE_URL`:

```bash
docker compose up -d postgres
pnpm prisma:generate
pnpm db:migrate
pnpm --filter @diagramhq/api test
```

Tests create their own orgs with unique slugs, so they can run against a seeded database without clashing. API files run serially (`singleFork`) to keep DB state predictable.

## The full gate

Run this before opening a PR — it's what CI runs, minus the Docker build:

```bash
pnpm verify     # prisma generate → build domain → typecheck → lint → test → check-architecture
pnpm build
```

`check-architecture` fails if layer rules are broken, e.g. React/Prisma imports in `packages/domain`, or Prisma/Nest imports in `apps/web`.

## Smoke test (running stack)

`scripts/smoke-test.sh` checks a live, seeded stack over HTTP. It only reads data, and covers health, login, 401s, tenant isolation, the seeded model, all 9 view kinds, dynamic filtering and viewer 403s.

```bash
pnpm db:seed
./scripts/smoke-test.sh                       # or: pnpm smoke
./scripts/smoke-test.sh http://staging:4000   # another host
```

It exits non-zero on any failure, so it can gate deploys.

## CI

`.github/workflows/ci.yml` runs on every PR and on pushes to `main`, using a Postgres 16 service container:

```
pnpm install --frozen-lockfile
pnpm build:domain
prisma generate
prisma migrate deploy      ← fresh DB: a schema change without a migration fails here/in e2e
pnpm lint
pnpm build
pnpm typecheck
pnpm test
pnpm check-architecture
```

## Writing tests

- **Domain logic** belongs in `packages/domain/src/<module>.test.ts`, with no framework imports.
- **API behaviour** (auth, roles, validation, persistence): add an `*.e2e.spec.ts` next to the controller. Copy the setup from `src/views/saved-views.e2e.spec.ts` (create org → member → workspace → architecture → version).
- **UI behaviour** goes in `apps/web/<feature>.spec.ts`.
- Every `schema.prisma` change needs a migration (`npx prisma migrate dev --name ...` in `apps/api`), or CI's e2e run fails.
