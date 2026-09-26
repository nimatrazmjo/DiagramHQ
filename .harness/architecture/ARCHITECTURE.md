# Architecture

How DiagramHQ is built. This file defines layers and boundaries; `rules/layer-boundaries.md` enforces them; `DATA_MODEL.md` and `API_SURFACE.md` detail the model and its interface.

## Principle: the model is the source of truth

The backend model is authoritative. The canvas, the API, model-as-code, and AI agents are all **clients** of the same model. A diagram is a projection (stored selection + layout), never a store of objects. If you find yourself persisting objects inside a view, stop — that is the anti-pattern this product exists to kill.

## Layers (strict dependency direction)

Dependencies point downward only. A higher layer may depend on a lower one; never the reverse.

```
┌───────────────────────────────────────────────┐
│  Presentation   (Next.js pages, shell, panels)  │  depends on ▼
├───────────────────────────────────────────────┤
│  Canvas         (React Flow view, layout, interactions)
├───────────────────────────────────────────────┤
│  UI State       (Zustand stores: selection, viewport, tool)
├───────────────────────────────────────────────┤
│  Client Model   (typed model + commands + query cache via TanStack Query)
├───────────────────────────────────────────────┤
│  API            (REST/tRPC client  <->  NestJS controllers)
├───────────────────────────────────────────────┤
│  Domain         (model objects, connections, views, flows, versioning — pure)
├───────────────────────────────────────────────┤
│  Persistence    (Prisma + PostgreSQL, Redis cache/jobs)
└───────────────────────────────────────────────┘
```

Hard boundaries (see `rules/layer-boundaries.md` for the enforceable list):
- **Domain is pure.** No React, no Prisma types leaking out, no HTTP. It is the one layer an AI agent, the API, and the canvas all agree on.
- **Canvas renders, never mutates persistence.** The canvas dispatches commands to the client model; the client model calls the API; the API calls the domain. The canvas never touches Prisma or the DB.
- **UI state is not domain state.** Viewport, selection, hovered node, active tool live in Zustand and never get persisted as model data. Object metadata lives in the domain and is fetched, never mirrored into Zustand.
- **One-way data flow.** Commands go down, query results come up. No component reaches sideways into another component's store.

## Frontend

Next.js (App Router) + React + TypeScript. Tailwind + shadcn/ui for the shell. **Zustand** for canvas/UI state (viewport, selection, tool, transient interaction). **TanStack Query** for server state (objects, connections, views) with optimistic updates for canvas edits. Canvas via **React Flow** for MVP; the rendering layer is isolated behind a `CanvasRenderer` interface so PixiJS/WebGL can replace it at scale without touching interactions (ADR-0002).

## Backend

Node + **NestJS**, module-per-domain-area. **PostgreSQL** via **Prisma** for the model (objects, connections, views, flows, versions). **Redis** for caching hot model reads, pub/sub for realtime later, and BullMQ jobs (import, generation, drift scan). Object storage (S3) for exports and uploads. Auth via Auth.js/Clerk/WorkOS (decide at Phase 1 close); enterprise SSO/SCIM/RBAC in Phase 5.

## Deployment topology (target)

```
        ┌──────────┐      ┌──────────────┐      ┌────────────┐
Client ─▶│  Next.js │─────▶│ NestJS API   │─────▶│ PostgreSQL │
        └──────────┘      │  + BullMQ    │      └────────────┘
                          └──────┬───────┘
                                 │              ┌────────────┐
                                 ├─────────────▶│   Redis    │
                                 │              └────────────┘
                          ┌──────▼───────┐      ┌────────────┐
                          │  Workers     │─────▶│    S3      │
                          │ (import/AI/  │      └────────────┘
                          │  drift jobs) │
                          └──────────────┘
```

## Repository shape (to be created — this is the plan, not code)

```
apps/
  web/        # Next.js frontend
  api/        # NestJS backend
packages/
  domain/     # pure model: types, entities, commands, invariants (shared)
  model-sdk/  # generated TS client + MCP tool definitions
  ui/         # shared shadcn components
  config/     # tsconfig, eslint, tailwind presets
infra/        # docker-compose (dev), IaC (later)
```

`packages/domain` is deliberately framework-free so it is the shared contract between web, api, sdk, and AI. Keep it that way.

## Why this shape

- **Modular + expandable** is not a slogan; it is registries. Object types, view types, importers, exporters, and AI actions are registered against interfaces, so features are added without editing the core. See `MODULES.md`.
- **API-first** means the frontend has no privileged path to data. Everything the UI does, an API client (or agent) can do.
- **Postgres before graph DB.** Connections are an adjacency table with `parent_id` nesting. Introduce a graph engine only when query patterns actually demand it (ADR-0003).

## Cross-cutting concerns

- **Observability**: structured logging at startup, layer boundaries, and errors; correlation ids through API + workers. Contract in `scripts/SCRIPTS.md`.
- **Validation**: domain invariants enforced in `packages/domain`, request validation at the API edge (zod/class-validator). Never trust the client to keep the model valid.
- **Versioning**: every mutation is attributable to a version/branch; the model is diffable (DATA_MODEL.md §versioning).
- **Ids**: stable, opaque, prefixed (`sys_`, `app_`, `sto_`, `cmp_`, `act_`, `grp_`, `con_`, `vw_`, `flw_`) so logs, URLs, API, and AI all reference the same entity.
