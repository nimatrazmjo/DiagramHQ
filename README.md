# DiagramHQ

> The living architecture platform for modern engineering teams.
> From code to architecture in minutes. From architecture to decisions in seconds.

DiagramHQ is a **model-first architecture intelligence platform** — an "Architecture OS". The architecture **model** (objects + connections) is the product; diagrams are **projections** of that model, never the source of truth.

Most architecture tools are drawing tools: you draw boxes, they rot, and six months later the diagram lies. DiagramHQ inverts that. Objects (systems, applications, stores, components, actors) exist independently of any diagram and are reused across many views. A view is a saved query over the model plus layout — deleting an object from a view never deletes the object.

---

## Table of contents

- [Docs](docs/README.md)
- [Status](#status)
- [Core concepts](#core-concepts)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Database](#database)
- [Scripts](#scripts)
- [Testing & verification](#testing--verification)
- [API reference](#api-reference)
- [Web app](#web-app)
- [CI](#ci)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Project harness](#project-harness)

---

## Status

Active development. **Phases 01–04 are complete** (foundation, canvas, architecture model, diagrams & views); Phase 05 (Flows) is next. Progress is tracked across **135 features in 13 phases** — see [`.harness/ROADMAP.md`](.harness/ROADMAP.md).

> ⚠️ Authentication is currently a **development stub**: any well-formed email with a password of 6+ characters signs in. Do not deploy as-is.

---

## Core concepts

```
Organization
 └── Workspace
      └── Architecture (model)
           ├── Versions
           ├── Objects       system · application · store · component · actor · group
           ├── Connections   sync · async · data · dependency · deploys_to  (typed, directional, with metadata)
           ├── Tags, Technologies
           ├── Views         filtered projections onto objects (selection + layout only)
           ├── Flows         ordered paths through connections
           ├── Decisions     ADRs linked to objects
           ├── Environments, Phases
           └── Members       owner · admin · editor · viewer
```

Rules that fall out of this:

- **One object, many views.** Removing an object from a view keeps it in the model.
- **Connections are first-class** — they carry their own metadata, not just a line on a canvas.
- **Views/flows/diagrams are projections.** They store selection + layout, never objects.
- **Stable IDs everywhere** — the canvas, API, AI agents and model-as-code all point at the same entities.

The modeling backbone is **C4**: Landscape → System Context → Container → Component → Code (a DiagramHQ extension mapping components to repos/files/classes). Drilling down is navigation over the same model, not opening a different file.

---

## Features

### Shipped

| Area | Features |
|---|---|
| **Foundation** | Monorepo, authentication (JWT + NextAuth credentials), organizations, workspaces, roles (owner/admin/editor/viewer), Postgres + Prisma with tenant isolation, API edge (validation, typed error envelope, `/health`), application shell |
| **Canvas** | Infinite canvas (React Flow), pan/zoom, selection, drag & drop, multi-select, alignment toolbar, auto-layout (layered, grid, radial, force-directed via a layout registry), undo/redo (command pattern), minimap / fullscreen / focus |
| **Architecture model** | Model core + invariants, C4 Context / Container / Component, Person, System, Application, Component, Database, Queue, Group, rich connections, object metadata schema + inspector panel, object lifecycle states with transition auditing |
| **Diagrams & views** | Context / Container / Component diagrams, dynamic (live filtered) views, filter builder, saved & starred views, security views, data views, ownership views, technology catalog, persona modes (8 personas), 13 architecture templates |

### Next up

Flows (F041–F047), collaboration, versioning & branches, AI copilot + MCP, code & infrastructure integrations, drift & governance, documentation, enterprise. Full list in the [roadmap](#roadmap).

---

## Tech stack

| Layer | Technology |
|---|---|
| Language | TypeScript (Node ≥ 20; `.nvmrc` pins 22) |
| Monorepo | pnpm 9 workspaces |
| Web | Next.js 14 (App Router), React 18, React Flow (`@xyflow/react`), Zustand, NextAuth v5 |
| API | NestJS 10, class-validator, JWT |
| Domain | Pure TypeScript package (`@diagramhq/domain`) — no framework imports |
| Data | PostgreSQL 16 via Prisma 5, Redis 7 |
| Testing | Vitest, `@nestjs/testing` + supertest for HTTP e2e |
| Tooling | ESLint, Prettier, Docker / Docker Compose, GitHub Actions |

---

## Repository layout

```
DiagramHQ/
├── apps/
│   ├── api/                     NestJS HTTP API
│   │   ├── prisma/              schema.prisma, migrations/, seed.ts
│   │   └── src/
│   │       ├── auth/            token issue, guard, @CurrentUser, @Public
│   │       ├── organizations/   orgs + members
│   │       ├── workspaces/      workspaces
│   │       ├── architectures/   architectures, objects, connections
│   │       ├── views/           views, view objects, positions, projections
│   │       ├── roles/           role guard
│   │       ├── health/          /health (DB check with timeout)
│   │       ├── database/        PrismaService, TenantContext
│   │       └── common/          exception filter, validation pipe, logger
│   └── web/                     Next.js app
│       ├── app/                 routes: /, /login, /dashboard, /workspace/[workspaceId]/…
│       ├── components/canvas/   infinite canvas, node types, badges/overlays, layout menu, templates
│       ├── components/shell/    app shell, top bar, navigator, inspector, filter builder
│       ├── lib/                 canvas store (Zustand), commands (undo/redo), client model
│       └── *.spec.ts(x)         feature integration specs
├── packages/
│   ├── domain/                  pure model: objects, connections, views, projections,
│   │                            invariants, layout engines, templates, filters
│   └── config/                  shared ESLint preset
├── scripts/                     init.sh, check-architecture.sh, scheduler
├── .harness/                    product spec, architecture, roadmap, phases, ADRs
├── .github/workflows/ci.yml     CI pipeline
├── docker-compose.yml           postgres, redis, api, web
└── Makefile                     shortcuts
```

---

## Architecture

The backend model is authoritative. The canvas, API, model-as-code and AI agents are all **clients** of the same model.

```
┌──────────────────────────────────────────────────┐
│  Presentation   Next.js pages, shell, panels     │
├──────────────────────────────────────────────────┤
│  Canvas         React Flow view, layout, interactions
├──────────────────────────────────────────────────┤
│  UI State       Zustand: selection, viewport, tool
├──────────────────────────────────────────────────┤
│  Client Model   typed model + commands            │
├──────────────────────────────────────────────────┤
│  API            NestJS controllers                │
├──────────────────────────────────────────────────┤
│  Domain         pure model logic (@diagramhq/domain)
├──────────────────────────────────────────────────┤
│  Persistence    Prisma + PostgreSQL, Redis        │
└──────────────────────────────────────────────────┘
          dependencies point downward only
```

Hard boundaries (enforced by `pnpm check-architecture`, which fails the build on violation):

1. `packages/domain` imports nothing framework-specific (no React, Next, NestJS, Prisma, HTTP clients).
2. The web app never imports `@prisma/client` or `@nestjs/*`.
3. The canvas mutates only via commands — never touches persistence directly.
4. UI state (Zustand) holds no domain data.
5. Only the API server talks to the database.
6. Model invariants live in the domain, not in controllers or components.
7. Registries, not switches, for object kinds / view kinds / layouts.

Key decisions (ADRs in [`.harness/architecture/decisions/`](.harness/architecture/decisions/)):

- **ADR-0001** — Model-first: diagrams never store objects.
- **ADR-0002** — React Flow for the MVP canvas, isolated behind a `CanvasRenderer` interface so PixiJS/WebGL can replace it at scale.
- **ADR-0003** — PostgreSQL adjacency tables (`model_objects` + `model_connections`) now; a graph DB only if forced.

Deeper docs: [`ARCHITECTURE.md`](.harness/architecture/ARCHITECTURE.md), [`DATA_MODEL.md`](.harness/architecture/DATA_MODEL.md), [`API_SURFACE.md`](.harness/architecture/API_SURFACE.md), [`MODULES.md`](.harness/architecture/MODULES.md).

---

## Getting started

### Prerequisites

- Node.js 22 (`nvm use`) — minimum 20
- pnpm 9.12 (`corepack enable`)
- Docker (for PostgreSQL and Redis)

### Option A — local dev (recommended)

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env

# 3. Start Postgres + Redis
docker compose up -d postgres redis

# 4. Generate Prisma client, apply migrations, load demo data
pnpm prisma:generate
pnpm db:migrate
pnpm db:seed

# 5. Run web + api in watch mode (builds the domain package first)
pnpm dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:4000> (health: <http://localhost:4000/health>)

Sign in at `/login` as `admin@diagramhq.com` / `adminpassword` (more demo accounts in [docs/authentication.md](docs/authentication.md)), then run `./scripts/smoke-test.sh`.

📘 **Full testing guide:** [`docs/`](docs/README.md) — setup, login & registration, seed data, manual test scenarios, automated tests, troubleshooting.

### Option B — everything in Docker

```bash
docker compose up --build     # or: make up
make down                     # stop
```

This starts `postgres`, `redis`, `api` (port 4000) and `web` (port 3000). Run migrations against the container database before first use.

### One-shot baseline check

```bash
./scripts/init.sh     # install + prisma generate + build domain + typecheck + lint + test + check-architecture
```

---

## Configuration

Environment variables (see [`.env.example`](.env.example)):

| Variable | Default | Used by | Purpose |
|---|---|---|---|
| `API_PORT` | `4000` | api | HTTP port |
| `WEB_PORT` | `3000` | web | HTTP port |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | web | API base URL |
| `POSTGRES_PORT` | `5432` | compose | Host port mapped to Postgres |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `diagramhq` | compose | Postgres credentials |
| `DATABASE_URL` | `postgresql://diagramhq:diagramhq@localhost:5432/diagramhq` | api, prisma | Connection string |
| `REDIS_URL` | `redis://localhost:6379` | api | Redis connection |
| `AUTH_SECRET` | dev value | api, web | JWT / NextAuth signing secret (**change outside dev**, ≥ 32 chars) |
| `NEXTAUTH_URL` | `http://localhost:3000` | web | NextAuth callback base |

> If you change `POSTGRES_PORT`, update the port in `DATABASE_URL` to match.

---

## Database

- Schema: [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma)
- Migrations: `apps/api/prisma/migrations/`
- Main models: `Organization`, `Member`, `Workspace`, `Architecture`, `Version`, `ModelObject`, `ModelConnection`, `Tag`, `Technology`, `View`, `ViewObject`, `Flow`, `FlowStep`, `Decision`, `Environment`, `Phase`, `Repository`.
- Tenant isolation is enforced through `TenantContext` (`apps/api/src/database/tenant.context.ts`).

Workflow for schema changes:

```bash
# edit schema.prisma, then create a migration against your local DB
cd apps/api && npx prisma migrate dev --name <change_name>

# apply existing migrations (CI / other environments)
pnpm --filter @diagramhq/api prisma:migrate:deploy
```

> Every `schema.prisma` change **must** ship with a migration. CI runs `migrate deploy` on a fresh database, so a schema change without a migration breaks the API e2e suite.

---

## Scripts

Root `package.json`:

| Command | What it does |
|---|---|
| `pnpm dev` | Build domain, then run all apps in watch mode |
| `pnpm build` | Build every package |
| `pnpm build:domain` | Build `@diagramhq/domain` only |
| `pnpm prisma:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Apply Prisma migrations |
| `pnpm db:seed` | Load / reset demo data (see [docs/seed-data.md](docs/seed-data.md)) |
| `pnpm smoke` | API smoke test against a running, seeded stack |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm test` | Vitest in every package |
| `pnpm test:e2e` | Playwright E2E tests (auth, canvas, drag-and-drop, visual regression) with video recording |
| `pnpm check-architecture` | Enforce layer boundaries |
| `pnpm verify` | prisma generate → build domain → typecheck → lint → test → check-architecture |

Per package: `pnpm --filter @diagramhq/<api|web|domain> <script>`.

`Makefile` shortcuts: `make install | dev | build | test | lint | typecheck | fmt | up | down`.

---

## Testing & verification

- **Domain** (`packages/domain`) — pure unit tests for the model, invariants, layouts, projections, filters, templates.
- **API** (`apps/api`) — unit tests plus HTTP-level e2e suites (`*.e2e.spec.ts`) booting the real Nest app against PostgreSQL.
- **Web** (`apps/web`) — feature integration specs (`*.spec.ts(x)`) for canvas, commands, views and components.
- **Playwright E2E** (`apps/web/e2e`) — End-to-end browser test suites covering authentication flows, React Flow canvas navigation & C4 hierarchy, node drag-and-drop & Quick Connect, and visual regression with automatic WebM video recordings.

```bash
pnpm test                                   # everything (vitest)
pnpm test:e2e                               # Playwright E2E test suite (spins up web server)
pnpm --filter @diagramhq/web test:e2e:headed # Playwright E2E in headed browser mode
pnpm --filter @diagramhq/api test           # api only (needs Postgres + migrations)
pnpm --filter @diagramhq/domain test        # domain only
pnpm verify                                 # the full gate — run before opening a PR
```

---

## API reference

All routes require `Authorization: Bearer <token>` except `POST /auth/token` and `GET /health`. Errors use a typed envelope; request bodies are validated with class-validator.

<details>
<summary><strong>Auth & health</strong></summary>

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/token` | Exchange email + password for a JWT (7-day expiry) |
| `GET` | `/auth/me` | Current user |
| `GET` | `/health` | Liveness + DB check (503 when degraded) |

</details>

<details>
<summary><strong>Organizations & workspaces</strong></summary>

| Method | Path | Description |
|---|---|---|
| `POST` | `/organizations` | Create organization |
| `GET` | `/organizations` | List my organizations |
| `GET` / `PATCH` / `DELETE` | `/organizations/:id` | Read / update / delete |
| `GET` | `/organizations/:id/members` | List members |
| `PATCH` | `/organizations/:id/members/:memberId` | Change member role |
| `POST` / `GET` | `/organizations/:orgId/workspaces` | Create / list workspaces |
| `GET` / `PATCH` / `DELETE` | `/workspaces/:id` | Read / update / delete |
| `GET` | `/workspaces/:id/architectures` | List architectures |

</details>

<details>
<summary><strong>Architectures, objects & connections</strong></summary>

| Method | Path | Description |
|---|---|---|
| `POST` | `/workspaces/:workspaceId/architectures` | Create architecture |
| `GET` / `PATCH` / `DELETE` | `/architectures/:id` | Read / update / delete |
| `GET` | `/architectures/:id/model` | Full model (objects + connections) |
| `GET` / `POST` | `/architectures/:id/objects` | List / create objects |
| `GET` / `PATCH` / `DELETE` | `/objects/:id` | Read / update / delete object |
| `GET` / `POST` | `/architectures/:id/connections` | List / create connections |
| `GET` / `PATCH` / `DELETE` | `/connections/:id` | Read / update / delete connection |

</details>

<details>
<summary><strong>Views</strong></summary>

| Method | Path | Description |
|---|---|---|
| `POST` / `GET` | `/architectures/:architectureId/views` | Create / list views (`kind`: context, container, component, security, data, ownership, technology, persona, custom) |
| `GET` / `PATCH` / `DELETE` | `/views/:viewId` | Read / update (name, kind, filter, `isStarred`) / delete |
| `GET` / `POST` | `/views/:viewId/objects` | List / add object to view |
| `DELETE` | `/views/:viewId/objects/:objectId` | Remove from view (object stays in model) |
| `PATCH` | `/views/:viewId/objects/:objectId/position` | Move one object |
| `PATCH` | `/views/:viewId/objects/positions` | Batch move |
| `GET` | `/views/:viewId/projection` | Resolved projection (view + filtered objects) |

</details>

Quick try:

```bash
TOKEN=$(curl -s -X POST localhost:4000/auth/token \
  -H 'content-type: application/json' \
  -d '{"email":"me@example.com","password":"secret123"}' | jq -r .token)

curl -s localhost:4000/organizations -H "Authorization: Bearer $TOKEN"
```

---

## Web app

| Route | Purpose |
|---|---|
| `/login` | Sign in (NextAuth credentials) |
| `/dashboard` | Organizations, workspaces, members & roles |
| `/workspace/[workspaceId]` | Workspace shell with canvas |
| `/workspace/[workspaceId]/systems` · `apps` · `data` · `flows` · `views` · `decisions` | Workspace sections |

Canvas highlights: custom node types per object kind (C4, person, system, app, component, database, queue, group), overlay badges for security / data / ownership / technology / persona views, layout menu, alignment toolbar, template panel, inspector panel and filter builder.

---

## CI

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs on every PR and on pushes to `main`, with a Postgres 16 service:

`install → build domain → prisma generate → migrate deploy → lint → build → typecheck → test → check-architecture`

---

## Contributing

1. Branch from `main`: `feat/<FID>-<slug>`, `fix/<slug>`, `docs/<slug>`, `chore/<slug>`.
2. Work **one feature at a time**; acceptance criteria live in the phase file under [`.harness/phases/`](.harness/phases/).
3. Run `pnpm verify` and `pnpm build` locally.
4. Commit with [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
   ```
   feat(views): add persona view projection
   fix(api): add missing is_starred migration
   ```
5. Open a PR, get it reviewed, keep CI green, merge.

Ground rules: domain stays pure, schema changes ship with migrations, views never store objects.

---

## Roadmap

| Phase | Name | Status |
|---|---|---|
| 01 | Foundation | ✅ Complete |
| 02 | Canvas | ✅ Core complete (command palette, global search, shortcuts pending) |
| 03 | Architecture model | ✅ Core complete (object type catalog, bounded contexts pending) |
| 04 | Diagrams & views | ✅ Complete |
| 05 | Flows | ⏳ Next |
| 06 | Collaboration | Planned |
| 07 | Versioning (history, branches, diff, PRs, ADRs) | Planned |
| 08 | AI copilot (chat, generation, impact analysis, MCP) | Planned |
| 09 | Code integrations (GitHub/GitLab, OpenAPI, model-as-code + CLI `dhq`) | Planned |
| 10 | Infrastructure integrations | Planned |
| 11 | Drift & governance | Planned |
| 12 | Documentation | Planned |
| 13 | Enterprise | Planned |

Detailed feature list and live progress: [`.harness/ROADMAP.md`](.harness/ROADMAP.md).

---

## Project harness

`.harness/` holds the engineering operating system for this repo — product spec, personas, architecture, ADRs, phased roadmap, verification rubric, and session state for human and AI contributors.

| I need… | Read |
|---|---|
| Where the project is now | [`PROJECT_STATE.md`](.harness/PROJECT_STATE.md) |
| What to do next | [`CURRENT_TASK.md`](.harness/CURRENT_TASK.md) |
| Why / for whom | [`product/PRODUCT.md`](.harness/product/PRODUCT.md), [`product/PERSONAS.md`](.harness/product/PERSONAS.md) |
| Structure & data shape | [`architecture/`](.harness/architecture/) |
| Import rules | [`rules/layer-boundaries.md`](.harness/rules/layer-boundaries.md) |
| What's decided | [`DECISIONS.md`](.harness/DECISIONS.md) |
| What shipped | [`CHANGELOG.md`](.harness/CHANGELOG.md) |
| Contributor contract | [`AGENTS.md`](.harness/AGENTS.md), [`CLAUDE.md`](.harness/CLAUDE.md) |

`scripts/scheduler.sh` can drive features sequentially with AI coding agents (with model failover); see the script header for options.
