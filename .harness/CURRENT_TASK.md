# CURRENT TASK: F023 — System

## Status: IN PROGRESS

## Feature
**F023 — System** (Phase 03 — Architecture Model)

Object type: System.
- User can create, edit, delete, and render a System in the architecture model.
- Internal vs external systems (internal systems support drill-down into containers; external systems represent third-party/partner systems).
- System-specific properties: domain/boundary, systemType, criticality, description.
- Renders with dedicated System card styling (solid vs dashed external borders, domain tags, criticality badges).
- Inter-system and person-to-system connections.
- Full CRUD operations persist in the architecture model independently of any diagram, reload accurately, and can be edited and deleted.

## Scope

### Domain Layer (`packages/domain/src/`)
- `system.ts`:
  - `SystemMetadata`: interface with external, systemType, domain, critical.
  - `SystemNodeData`: interface with label, external, systemType, domain, critical, description, canDrillDown.
  - Helpers: `createSystem`, `isSystem`, `isExternalSystem`, `isInternalSystem`.
  - Projection: `projectSystemToCanvas`.
- `system.test.ts`: unit tests for internal vs external systems, metadata, and canvas projection.

### API Layer (`apps/api/src/`)
- `system.e2e.spec.ts`:
  - Create internal system.
  - Create external system.
  - Update system (name, domain, criticality).
  - Delete system (cascades connections).
  - Connect systems (sync/async).
  - Snapshot reload identity (`isModelIdentical`).

### Web Client Layer (`apps/web/`)
- Custom System Node Component:
  - `components/canvas/system-node.tsx`: custom React Flow node with internal vs external system styling, domain badges, criticality tags, and drill-down controls.
- Register node type in `components/canvas/custom-nodes.tsx` (`system`).
- Tests in `apps/web/system.spec.ts`:
  - Rendering internal system with domain and drill-down.
  - Rendering external system with dashed border and external badge.
  - Client model CRUD operations and reload identity.
  - Canvas mounting.

## Verification
- Monorepo checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check-architecture`, `pnpm build`.
- 8-angle code review (`.harness/reviews/F023-review.md`).
- PR creation and merge into main.
