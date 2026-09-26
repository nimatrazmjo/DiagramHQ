# CURRENT TASK: F018 — Architecture model

## Status: IN PROGRESS

## Feature
**F018 — Architecture model** (Phase 03 — Architecture Model)

The model entity: objects + connections persisted independently of any diagram.
- Architecture holds objects + connections independent of diagrams (DEC-001 / ADR-0001).
- Full CRUD via API for architectures, model objects, and model connections; save/load; reload yields an identical model.
- Optimistic writes on client/command layer with automatic rollback on error.
- Domain invariants: no self-connection (`canConnect`), endpoint existence & same architecture/version (`validateConnection`), no parent cycle (`hasParentCycle`).

## Scope

### Domain Layer (`packages/domain/src/`)
- Define `ArchitectureModel` snapshot interface (`architecture`, `version`, `objects`, `connections`).
- Domain functions for pure model transformations: `createArchitectureModel`, `addModelObject`, `updateModelObject`, `removeModelObject` (with cascade connection removal), `addModelConnection`, `updateModelConnection`, `removeModelConnection`.
- Equality verification: `isModelIdentical(modelA, modelB): boolean`.
- Model-level invariant validation: `validateArchitectureModel`.

### API Layer (`apps/api/src/architectures/`)
- Create `ArchitecturesModule`, `ArchitecturesService`, `ArchitecturesController`, and DTOs:
  - `POST /workspaces/:workspaceId/architectures`: create architecture + default main version.
  - `GET /architectures/:id`: get architecture with default version.
  - `PATCH /architectures/:id`: update architecture metadata.
  - `DELETE /architectures/:id`: delete architecture (cascades).
  - `GET /architectures/:id/model`: load full model snapshot (`{ architecture, version, objects, connections }`).
  - `GET /architectures/:id/objects`: list model objects in architecture.
  - `POST /architectures/:id/objects`: create model object.
  - `GET /objects/:id`: get single object.
  - `PATCH /objects/:id`: update model object.
  - `DELETE /objects/:id`: delete model object (cascades to connections).
  - `GET /architectures/:id/connections`: list model connections.
  - `POST /architectures/:id/connections`: create model connection (enforcing domain invariants).
  - `GET /connections/:id`: get connection.
  - `PATCH /connections/:id`: update connection.
  - `DELETE /connections/:id`: delete connection.
- RBAC and Tenant authorization: checks workspace membership and `canWrite` role.
- Register `ArchitecturesModule` in `AppModule`.
- Comprehensive E2E tests in `apps/api/src/architectures/architectures.e2e.spec.ts`.

### Web Client Layer (`apps/web/lib/model/`)
- `architecture-model-client.ts`:
  - `ArchitectureModelClient` or state manager managing in-memory model snapshots.
  - CRUD operations with optimistic mutation and rollback on simulated or network failure.
  - Projection to canvas nodes/edges via `projectViewModelToCanvas`.
- Unit tests in `apps/web/architecture-model.spec.ts` proving:
  - Create -> reload -> identical model.
  - Simulated API error rolls back optimistic mutation cleanly.

## Verification
- Monorepo checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check-architecture`, `pnpm build`.

## Owner
Control plane (this agent)

## Started
2026-09-26

## Next Task
F019 — C4 Context.
