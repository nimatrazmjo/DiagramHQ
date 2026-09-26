# CURRENT TASK: F024 — Application

## Status: IN PROGRESS

## Feature
**F024 — Application** (Phase 03 — Architecture Model)

Object type: Application / Service.
- User can create, edit, delete, and render an Application or Service in the architecture model.
- Model object with `kind = 'application'` and ID prefix `app_`.
- Application-specific properties: applicationType (web, mobile, api, service, worker), technology, runtime, status, port, description, and optional parent system linkage (`parentId`).
- Renders with dedicated Application/Service styling (emerald theme, technology tags, status indicator, runtime badge).
- Connections between applications and to systems/datastores.
- Drill-down support into internal C4 components.
- Full CRUD operations persist in the architecture model independently of any diagram, reload accurately, and can be edited and deleted.

## Scope

### Domain Layer (`packages/domain/src/`)
- `application.ts`:
  - `ApplicationMetadata`: interface with applicationType, technology, runtime, status, port.
  - `ApplicationNodeData`: interface with label, applicationType, technology, runtime, status, port, description, canDrillDown, parentId.
  - Helpers: `createApplication`, `isApplication`.
  - Projection: `projectApplicationToCanvas`.
- `application.test.ts`: unit tests for application creation, technology tagging, parent linkage, and canvas projection.

### API Layer (`apps/api/src/`)
- `application.e2e.spec.ts`:
  - Create application (standalone and under a parent system).
  - Update application (technology, runtime, status, port).
  - Connect applications (sync RPC / REST call).
  - Delete application (cascades connections).
  - Snapshot reload identity (`isModelIdentical`).

### Web Client Layer (`apps/web/`)
- Custom Application Node Component:
  - `components/canvas/app-node.tsx`: custom React Flow node with application styling, technology tags, status badge, runtime, and drill-down controls.
- Register node type in `components/canvas/custom-nodes.tsx` (`application`).
- Tests in `apps/web/application.spec.ts`:
  - Rendering application with technology, status, runtime.
  - Drill-down callback invocation.
  - Client model CRUD operations and reload identity.
  - Canvas mounting.

## Verification
- Monorepo checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check-architecture`, `pnpm build`.
- 8-angle code review (`.harness/reviews/F024-review.md`).
- PR creation and merge into main.
