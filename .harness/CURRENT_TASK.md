# CURRENT TASK: F020 — C4 Container

## Status: IN PROGRESS

## Feature
**F020 — C4 Container** (Phase 03 — Architecture Model)

Level 2 C4 Container diagram & model elements: containers (applications, services, stores, databases, queues) inside a system.
- User can create containers (apps, services, databases, queues) inside a parent Software System (`parentId = system.id`).
- Containers capture technology (e.g. "React / Next.js", "NestJS / TypeScript", "PostgreSQL", "Kafka"), description, and container kind.
- User can drill down from a System (Level 1) into its C4 Container view (Level 2).
- Container view renders the enclosing Software System boundary and internal container elements with technology badges.
- Containers support drilling down into Level 3 Components (`canDrillToComponents`).
- Containers and inter-container connections persist in the architecture model independently of any diagram, reload accurately, and can be edited and deleted.

## Scope

### Domain Layer (`packages/domain/src/`)
- `c4-container.ts`:
  - `C4ContainerKind`: 'web_app' | 'mobile_app' | 'api' | 'service' | 'database' | 'queue' | 'store'.
  - `C4ContainerNodeData`: interface with label, containerKind, technology, description, systemId, canDrillToComponents.
  - Helpers: `createC4Container`, `createC4WebApp`, `createC4Service`, `createC4Database`, `createC4Queue`.
  - Predicates: `isContainer`, `isContainerOfSystem`, `getSystemContainers`, `canDrillToComponents`.
  - Projection: `projectC4ContainerViewToCanvas` projecting parent system boundary and container nodes + edges.
- `c4-container.test.ts`: unit tests for domain helpers, predicates, and canvas projection.

### API Layer (`apps/api/src/`)
- `c4-container.e2e.spec.ts`:
  - Create parent System.
  - Create child containers (web app, api service, database, queue) with `parentId = system.id`.
  - Connect web app -> api, api -> database, api -> queue.
  - Query and reload identical model snapshot (`isModelIdentical`).
  - Verify cascade deletion of system removes child containers and their connections.

### Web Client Layer (`apps/web/`)
- Custom C4 Container Node Component:
  - `components/canvas/c4-container-node.tsx`: custom React Flow node with C4 styling for apps, services, databases, queues with technology tags and drill-to-components trigger.
  - `components/canvas/c4-system-boundary-node.tsx`: group/boundary node encasing system containers.
- Register node types in `components/canvas/custom-nodes.tsx` (`c4Container`, `c4SystemBoundary`, `application`, `store`).
- Drill-down & view level integration:
  - View navigation between Context (Level 1) and Container (Level 2) with system drill-down and breadcrumb back navigation.
- Tests in `apps/web/c4-container.spec.ts`:
  - Rendering containers with respective kind badges and technology tags.
  - Drill-to-components callback invocation.
  - System boundary rendering.
  - Level 1 -> Level 2 view switching.
  - Full client model integration and identical reload.

## Verification
- Monorepo checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check-architecture`, `pnpm build`.

## Owner
Control plane (this agent)
