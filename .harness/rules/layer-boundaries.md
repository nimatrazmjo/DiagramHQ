# Layer Boundaries

The enforceable rules behind `architecture/ARCHITECTURE.md`. `scripts/SCRIPTS.md` → check-architecture validates these; a violation fails the build and blocks "done." These are import-direction rules — dependencies point down only.

## Allowed dependency direction

```
presentation  ->  canvas  ->  ui-state  ->  client-model  ->  api-client
                                                                   |
domain  <-  api (server)  <-  (network boundary)  <----------------+
persistence  <-  domain
```

## The rules (each is checkable)

1. **`packages/domain` imports nothing framework-specific.** No `react`, no `next`, no `@prisma/client`, no `@nestjs/*`, no HTTP client. Violation = any such import inside `packages/domain`.
2. **Canvas may not import persistence or the API server.** `apps/web/**/canvas/**` may import ui-state and client-model only. It may not import `@prisma/client`, DB code, or NestJS server modules.
3. **Canvas mutates only via commands.** Canvas code may not call TanStack Query mutations or `fetch` directly; it dispatches to the client-model command layer, which owns server calls.
4. **UI state holds no domain data.** Zustand stores may hold viewport, selection, hovered id, active tool, transient drag state. They may not hold object metadata, connection lists, or anything that is server truth. Server truth lives in the query cache.
5. **API server is the only caller of persistence.** `@prisma/client` and raw SQL appear only under `apps/api` (and migrations). The frontend never imports Prisma types; it imports generated model-sdk types.
6. **Domain invariants live in domain.** Validation of model rules (DATA_MODEL.md §invariants) lives in `packages/domain`, not in controllers or React components. The API edge validates request shape; the domain validates model legality.
7. **No sideways store access.** A component/store may not import another feature's internal store. Shared state goes through client-model or an explicit shared store.
8. **Registries, not switches.** Core code that handles object kinds, view kinds, importers, exporters, or AI actions must iterate the relevant registry (MODULES.md). A `switch (kind)` in core over the built-in enum is a violation once a registry exists for it.

## Rationale

The one boundary that matters most: **domain is pure and shared.** It is the single definition of the model that the canvas, the API, model-as-code, and AI agents all agree on. Every leak into it (a React type, a Prisma type) forks the truth and is the beginning of the diagram-as-database rot ADR-0001 exists to prevent.

## How to check

Until the app exists, this file is the spec. Once `packages/` and `apps/` exist, implement check-architecture (contract in `scripts/SCRIPTS.md`) to grep import graphs for the violations above and exit non-zero on any. The check runs in `init` and before any feature is marked passed.
