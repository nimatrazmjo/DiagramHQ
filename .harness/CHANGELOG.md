# Implementation Changelog

Every completed feature and every meaningful state change is recorded here, newest first. Each entry names a feature ID (or the tracking system). No vague entries. A feature appears here as COMPLETE only after verification. (Supersedes the earlier `state/claude-progress.md`, archived under `_archive/`.)

## 2026-09-27 — F115 — Persona modes

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `persona-view.ts`: Implemented `projectPersonaViewToCanvas()` — wraps the base canvas projection and stamps `personaMode` + `personaView: true` onto all node and edge data objects. Supports all 8 modes: architect, developer, security, sre, data, product, executive, auditor. Default mode: `architect`.
  - `persona-view.test.ts`: Unit test — verifies `personaMode: 'security'` and `personaView: true` are stamped on nodes after projection.
  - `index.ts`: `projectPersonaViewToCanvas` and `PersonaMode` already exported (no change needed).
- UI components (`apps/web/components/canvas/`):
  - `persona-badges.tsx`: `<PersonaBadges />` renders an icon + label badge for the active persona mode. 8 distinct colours and SVG icons, one per persona. Only renders when `personaView: true`.
  - `app-node.tsx`, `system-node.tsx` (external + internal), `database-node.tsx`, `component-node.tsx`: integrated `<PersonaBadges />` after `<TechnologyBadges />`.
- Tests (`apps/web/persona-modes.spec.ts`):
  - All 8 personas produce `personaView=true` + correct `personaMode` on nodes and edges.
  - Switching persona re-scopes the render without mutating the underlying model.
  - Default persona (no mode specified) is `architect`.

Verification evidence:
```
pnpm verify  →  exit 0 (typecheck clean, lint clean, 280 web + 256 API tests passed, check-architecture: clean)
pnpm build   →  exit 0 (Next.js routes all compiled)
branch: feat/F115-persona-modes  commit: 35c4621
```

Evaluator scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5 => avg 5.0 — PASS

## 2026-09-27 — F114 — Technology catalog


Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `types.ts`: Extended `Technology` interface with `version`, `vendor`, `lifecycle`, `securityStatus`, `owner`, and `docs`.
  - `technology-view.ts`: Implemented `projectTechnologyViewToCanvas` to inject `technologies` metadata into nodes.
  - `view-filter.ts`: Enhanced `matchesViewFilter` to evaluate `meta.technologies` array and added the `technologyLifecycle` criterion to support finding systems with unsupported technologies.
  - `view-filter.test.ts`: Added unit tests verifying F114 technology lifecycle filtering ("unsupported").
- API layer (`apps/api/prisma/schema.prisma`):
  - Added new fields `version`, `vendor`, `lifecycle`, `securityStatus`, `owner`, and `docs` to the `Technology` model.
- UI components (`apps/web/components/canvas/`):
  - `technology-badges.tsx`: Implemented standalone SVG badges for rendering technologies and color-coding by lifecycle.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `<TechnologyBadges />`.


## 2026-09-27 — F038 — Security views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-view.ts`: Implemented `projectSecurityViewToCanvas` to inject security data properties into model objects and dynamically project them into `GroupNode` elements representing `trustZone` boundaries.
  - `view.ts`: Registered `security` ViewKind labeling support.
- UI components (`apps/web/components/canvas/`):
  - `security-badges.tsx`: Implemented a standalone overlay rendering SVG badges for public endpoints, auth, secrets, encryption, and compliance.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `SecurityBadges` conditional on `securityView` metadata.
- Validation (`apps/web/security-views.spec.ts`):
  - Unit tests verifying the proper mapping of the model into group boundary wrappers and extraction of the correct security flags to the canvas node props.


## 2026-09-27 — F035 — Dynamic views
Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `view-filter.ts`: Defined `ViewFilter` interface supporting 12 filter criteria (team, technology, environment, domain, owner, status/lifecycle, tag/tags, criticality, data-classification, cloud, region, repository), normalized case-insensitive multi-value evaluation `matchesViewFilter`, and pure model array projection `evaluateDynamicView`.
  - `view.ts`: Added dynamic view factory `createDynamicViewOptions` and discriminator `isDynamicView`.
  - `view-filter.test.ts` & `view.test.ts`: Added unit tests verifying individual and multi-criteria filters, and dynamic view options.
  - `index.ts`: Exported `view-filter` module.
- API layer (`apps/api/src/views/`):
  - `views.service.ts`: Updated `getViewObjects` to dynamically project matching model objects when `view.filter` is populated, preserving saved layout positions, and added `getViewProjection` returning view plus projected model objects.
  - `views.controller.ts`: Added `GET /views/:viewId/projection` endpoint.
  - `dynamic-views.e2e.spec.ts`: 4 E2E integration tests verifying dynamic view creation, live projection without static records, immediate entry and exit of objects upon metadata PATCH, and layout position persistence.
- Web client layer (`apps/web/`):
  - `dynamic-views.spec.ts`: Unit tests verifying dynamic view options creation and multi-criteria model object filtering.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 254 tests in API across 35 test files, 271 tests in web across 30 test files, 144 tests in domain across 22 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: APPROVED. Full log: `.harness/reviews/F035-review.md`.


## 2026-09-27 — F038 — Security views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-view.ts`: Implemented `projectSecurityViewToCanvas` to inject security data properties into model objects and dynamically project them into `GroupNode` elements representing `trustZone` boundaries.
  - `view.ts`: Registered `security` ViewKind labeling support.
- UI components (`apps/web/components/canvas/`):
  - `security-badges.tsx`: Implemented a standalone overlay rendering SVG badges for public endpoints, auth, secrets, encryption, and compliance.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `SecurityBadges` conditional on `securityView` metadata.
- Validation (`apps/web/security-views.spec.ts`):
  - Unit tests verifying the proper mapping of the model into group boundary wrappers and extraction of the correct security flags to the canvas node props.
## 2026-09-27 — F034 — Component diagrams
Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `view.ts`: Added `createComponentViewOptions`, `isComponentView`, and Level 3 component label handling in `getViewLevelLabel`.
  - `view.test.ts`: Added unit tests for component view options creation, level 3 label mapping, and type discrimination.
- API layer (`apps/api/src/views/`):
  - `component-diagram.e2e.spec.ts`: 4 E2E integration tests verifying component diagram creation (kind: component), layout rendering of components with positions, updating positions via endpoint, and deletion isolation preserving all underlying model entities.
- Web client layer (`apps/web/`):
  - `component-diagram.spec.ts`: 3 unit tests verifying component view options creation, level 3 labelling, and kind detection.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 250 tests in API across 34 test files, 269 tests in web across 29 test files, 140 tests in domain across 21 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: APPROVED. Full log: `.harness/reviews/F034-review.md`.


## 2026-09-27 — F038 — Security views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-view.ts`: Implemented `projectSecurityViewToCanvas` to inject security data properties into model objects and dynamically project them into `GroupNode` elements representing `trustZone` boundaries.
  - `view.ts`: Registered `security` ViewKind labeling support.
- UI components (`apps/web/components/canvas/`):
  - `security-badges.tsx`: Implemented a standalone overlay rendering SVG badges for public endpoints, auth, secrets, encryption, and compliance.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `SecurityBadges` conditional on `securityView` metadata.
- Validation (`apps/web/security-views.spec.ts`):
  - Unit tests verifying the proper mapping of the model into group boundary wrappers and extraction of the correct security flags to the canvas node props.
## 2026-09-27 — F033 — Container diagrams
Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `view.ts`: Container diagram helpers (`createContainerViewOptions`, `isContainerView`, `getViewLevelLabel` Level 2 formatting).
- API layer (`apps/api/src/views/`):
  - `container-diagram.e2e.spec.ts`: 4 E2E integration tests verifying container diagram creation (kind: container), layout rendering for applications, stores, and queues with coordinate persistence, position updates via `PATCH /views/:viewId/objects/:objectId/position`, and diagram deletion isolation without affecting the underlying architecture model entities.
- Web client layer (`apps/web/`):
  - `container-diagram.spec.ts`: 3 unit tests verifying container view options creation, level 2 labelling, and kind detection.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 246 tests in API across 33 test files, 266 tests in web across 28 test files, 139 tests in domain across 21 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: APPROVED. Full log: `.harness/reviews/F033-review.md`.


## 2026-09-27 — F038 — Security views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-view.ts`: Implemented `projectSecurityViewToCanvas` to inject security data properties into model objects and dynamically project them into `GroupNode` elements representing `trustZone` boundaries.
  - `view.ts`: Registered `security` ViewKind labeling support.
- UI components (`apps/web/components/canvas/`):
  - `security-badges.tsx`: Implemented a standalone overlay rendering SVG badges for public endpoints, auth, secrets, encryption, and compliance.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `SecurityBadges` conditional on `securityView` metadata.
- Validation (`apps/web/security-views.spec.ts`):
  - Unit tests verifying the proper mapping of the model into group boundary wrappers and extraction of the correct security flags to the canvas node props.
## 2026-09-27 — F032 — Context diagrams
Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `view.ts`: Defined `CreateViewOptions` interface, helper `createContextViewOptions`, kind predicate `isContextView`, and level description helper `getViewLevelLabel`.
  - `view.test.ts`: 4 unit tests verifying context view options creation, kind detection, and label formatting.
  - `index.ts`: exported view module.
- API layer (`apps/api/src/views/`):
  - `views.dto.ts`: Added DTOs for view management (`CreateViewDto`, `UpdateViewDto`, `AddViewObjectDto`, `ViewKindDto`).
  - `views.controller.ts` & `views.service.ts`: Implemented saved view endpoints (`POST/GET /architectures/:id/views`, `GET/DELETE /views/:id`, `POST /views/:id/objects`, `DELETE /views/:id/objects/:objectId`, `GET /views/:id/objects`).
  - `context-diagram.e2e.spec.ts`: 6 E2E integration tests verifying context diagram creation (kind: context), RBAC write protection, multi-diagram object assignment, object deletion isolation (removing object from diagram keeps it in other diagrams and in the model), and view listing.
- Web client layer (`apps/web/`):
  - `context-diagram.spec.ts`: 3 unit tests verifying domain view helpers within the web package.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 242 tests in API across 32 test files, 263 tests in web across 27 test files, 139 tests in domain across 21 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: APPROVED. Full log: `.harness/reviews/F032-review.md`.


## 2026-09-27 — F038 — Security views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-view.ts`: Implemented `projectSecurityViewToCanvas` to inject security data properties into model objects and dynamically project them into `GroupNode` elements representing `trustZone` boundaries.
  - `view.ts`: Registered `security` ViewKind labeling support.
- UI components (`apps/web/components/canvas/`):
  - `security-badges.tsx`: Implemented a standalone overlay rendering SVG badges for public endpoints, auth, secrets, encryption, and compliance.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `SecurityBadges` conditional on `securityView` metadata.
- Validation (`apps/web/security-views.spec.ts`):
  - Unit tests verifying the proper mapping of the model into group boundary wrappers and extraction of the correct security flags to the canvas node props.
## 2026-09-27 — F031 — Object lifecycle
Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `lifecycle.ts`: Defined `LifecycleState` ('future' | 'live' | 'deprecated' | 'removed'), `LifecycleTransition` interface (from, to, at, by, reason), state machine transition table and validator `isValidLifecycleTransition`, transition factory `createLifecycleTransition` with error throwing on invalid transition, semantic UI styling `getLifecycleBadgeColor`, and array `LIFECYCLE_STATES`.
  - `lifecycle.test.ts`: 4 unit tests verifying transition rules, invalid transition throwing, badge color mappings, and states array.
  - `index.ts`: exported lifecycle module.
- API layer (`apps/api/src/`):
  - `vitest.config.ts`: configured `poolOptions: { forks: { singleFork: true } }` ensuring robust, contention-free sequential integration test execution across database suites.
  - `architectures/lifecycle.e2e.spec.ts`: 4 E2E integration tests verifying lifecycle state assignment (`future`) via `PATCH /objects/:id`, transition recording (`future` -> `live`) in `metadata.lifecycleTransitions`, persistence verification on `GET /objects/:id`, and architecture model snapshot reload verification on `GET /architectures/:id/model`.
- Web client layer (`apps/web/`):
  - `lifecycle.spec.ts`: 3 unit tests verifying badge color, valid/invalid state transitions, and transition creation within the web application environment.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 236 tests in API across 31 test files, 260 tests in web across 26 test files, 135 tests in domain across 20 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: APPROVED. Full log: `.harness/reviews/F031-review.md`.

## 2026-09-26 — F030 — Object metadata

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `object-metadata.ts`: Full metadata schema `ObjectMetadataSchema` (identity, ownership, technical, classification, risk & compliance, SLA/RTO/RPO, documentation/repository, lifecycle transitions), option constants (`OBJECT_STATUS_OPTIONS`, `OBJECT_ENVIRONMENT_OPTIONS`, `OBJECT_CRITICALITY_OPTIONS`, `OBJECT_DATA_CLASSIFICATION_OPTIONS`), and `mergeObjectMetadata` helper.
  - `object-metadata.test.ts`: 6 unit tests verifying schema definitions, metadata merging, empty fallback, and options arrays.
- Web client layer (`apps/web/`):
  - `InspectorPanel` (`components/shell/inspector-panel.tsx`): interactive object inspector panel with collapsed strip, tab headers, item header with kind badge, and comprehensive grouped inputs (Identity, Ownership, Technical, Classification, Risk & Compliance, SLA, Documentation).
  - `inspector-panel.spec.tsx`: 4 unit tests verifying collapsed state toggle, field inputs, active object header, and `onMetadataChange` dispatching.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 232 tests in API, 261 in web, 131 in domain)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: APPROVED. Full log: `.harness/reviews/F030-review.md`.

## 2026-09-26 — F029 — Connections

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `connection.ts`: Rich connection metadata types (`ConnectionProtocol`, `ConnectionDirection`, `ConnectionStatus`, `ConnectionAuth`, `ConnectionEncryption`, `RichConnectionMetadata`), constant `RICH_CONNECTION_PROTOCOLS`, predicate `isRichConnection`, and helper `createRichConnectionMetadata`.
  - `connection.test.ts`: Unit tests verifying metadata construction, protocol lists, and rich connection discrimination.
- API layer (`apps/api/src/architectures/`):
  - `connection.e2e.spec.ts`: 5 E2E tests verifying connection creation with rich metadata (protocol, auth, encryption, port), strict endpoint validation (cross-architecture / cross-version pairs rejected with HTTP 400), self-connection rejection (HTTP 400), metadata patching (latency, errorBehavior), and model snapshot reload verification.
  - `apps/api/vitest.config.ts`: disabled `fileParallelism` to eliminate PostgreSQL connection contention during concurrent E2E test runs.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 232 tests in API, 253 in web, 125 in domain)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F029-review.md`.

## 2026-09-26 — F028 — Group

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `group.ts`: Group domain model, `GroupKind` ('group' | 'boundary' | 'zone' | 'team' | 'domain' | 'namespace'), `GroupMetadata` interface (groupKind, color, collapsed), `GroupNodeData` interface, helper `createGroup`, predicate `isGroup`, and canvas projection `projectGroupToCanvas`.
  - `group.test.ts`: 4 unit tests verifying group creation, kind, color, childCount, standalone and parent linkage, and canvas projection.
- API layer (`apps/api/src/architectures/`):
  - `group.e2e.spec.ts`: 5 E2E tests verifying top-level boundary group creation, nested team group creation (`parentId: boundaryId`), cycle prevention enforcement (HTTP 400 when setting ancestor cycle), model snapshot reload verification, and parent deletion with child survival via `SetNull` cascade.
- Web client layer (`apps/web/`):
  - `GroupNode` component (`components/canvas/group-node.tsx`) rendering dashed boundary styling, kind badge (`[Group: ...]`), child count badge, and 4-way handles.
  - Registration in `components/canvas/custom-nodes.tsx` for `group`.
  - `group.spec.ts`: 4 tests covering SSR node rendering, team variant styling, and canvas projection.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 227 tests passing across 29 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F028-review.md`.

## 2026-09-26 — F027 — Queue

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `queue.ts`: Queue domain model, `QueueKind` ('kafka' | 'rabbitmq' | 'sqs' | 'eventbridge' | 'pubsub' | 'nats' | 'queue'), `QueueMetadata` interface (storeKind: 'queue', queueKind, technology, topics, partitions, retentionPolicy), `QueueNodeData` interface, helper `createQueue`, predicate `isQueue`, and canvas projection `projectQueueToCanvas`.
  - `queue.test.ts`: 4 unit tests verifying queue creation, topics list, technology metadata, standalone and parent linkage, and canvas projection.
- API layer (`apps/api/src/architectures/`):
  - `queue.e2e.spec.ts`: 6 E2E tests verifying creation of Queue under a parent Application (`parentId`), standalone Kafka cluster creation, async connection between Application and Queue, metadata PATCH update, model snapshot reload verification, and cascade deletion.
- Web client layer (`apps/web/`):
  - `QueueNode` component (`components/canvas/queue-node.tsx`) rendering queue icon, theme gradient styling, kind badge (`[Queue: ...]`), technology tag, topic chips, and 4-way handles.
  - Registration in `components/canvas/custom-nodes.tsx` for `queue`.
  - `queue.spec.ts`: 4 tests covering SSR node rendering, kafka variant styling, and canvas projection.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 222 tests passing across 28 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F027-review.md`.

## 2026-09-26 — F026 — Database

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `database.ts`: Database domain model, `DatabaseKind` ('postgresql' | 'mysql' | 'mongodb' | 'redis' | 'elasticsearch' | 'dynamodb' | 'sqlite' | 'cassandra' | 'store'), `DatabaseMetadata` interface (databaseKind, technology, schema, version, host, replication), `DatabaseNodeData` interface, helper `createDatabase`, predicate `isDatabase`, and canvas projection `projectDatabaseToCanvas`.
  - `database.test.ts`: 4 unit tests verifying database creation, technology/schema/version metadata, standalone and parent linkage, and canvas projection.
- API layer (`apps/api/src/architectures/`):
  - `database.e2e.spec.ts`: 6 E2E tests verifying creation of Database under a parent Application (`parentId`), standalone Redis cache creation, data connection between Application and Database, metadata PATCH update, model snapshot reload verification, and cascade deletion.
- Web client layer (`apps/web/`):
  - `DatabaseNode` component (`components/canvas/database-node.tsx`) rendering cylinder icon, theme gradient styling, kind badge (`[Database: ...]`), technology tag, schema badge, and 4-way handles.
  - Registration in `components/canvas/custom-nodes.tsx` for `database`.
  - `database.spec.ts`: 5 tests covering SSR node rendering, redis variant styling, selection ring, and canvas projection.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 216 tests passing across 27 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F026-review.md`.

## 2026-09-26 — F025 — Component

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `component.ts`: Component domain model, `ComponentKind`, `ComponentMetadata` interface (componentKind, technology, interfaces, codeRef), `ComponentNodeData` interface, helper `createComponent`, predicate `isComponent`, and canvas projection `projectComponentToCanvas`.
  - `component.test.ts`: 4 unit tests verifying component creation, technology/interfaces metadata, parent application linkage (`parentId`), and canvas projection.
  - `c4-component.ts`: refactored options to `CreateC4ComponentOptions` and shared predicate to resolve barrel export collisions.
- API layer (`apps/api/src/architectures/`):
  - `component.e2e.spec.ts`: 6 E2E tests verifying creation of Component under a parent Application (`parentId`), creation of Repository Component, inter-component connections (Service -> Repository), metadata PATCH update, model snapshot reload identity, and cascade deletion.
- Web client layer (`apps/web/`):
  - `ComponentNode` component (`components/canvas/component-node.tsx`) rendering component kind icons, kind badge (`[Component: ...]`), technology badge (`[...]`), interfaces list, code reference link and inspect button, and 4-way handles.
  - Registration in `components/canvas/custom-nodes.tsx` for `component`.
  - `component.spec.ts`: 7 tests covering SSR node rendering, code reference inspect callback invocation, canvas mounting with `InfiniteCanvas`, and `ArchitectureModelClient` reload identity.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 210 API tests, 113 domain tests, 240 web tests. Total: 563 tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F025-review.md`.

## 2026-09-26 — F024 — Application

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `application.ts`: Application domain model, `ApplicationType`, `ApplicationMetadata` interface (technology, runtime, status, port, canDrillDown), `ApplicationNodeData` interface, helper `createApplication`, predicate `isApplication`, and canvas projection `projectApplicationToCanvas`.
  - `application.test.ts`: 4 unit tests verifying application creation, technology/runtime metadata, parent system linkage (`parentId`), and canvas projection.
- API layer (`apps/api/src/architectures/`):
  - `application.e2e.spec.ts`: 6 E2E tests verifying creation of Application under a parent System (`parentId`), standalone Application service creation (`parentId: null`), inter-application connections, metadata PATCH update, model snapshot reload identity, and cascade deletion.
- Web client layer (`apps/web/`):
  - `AppNode` component (`components/canvas/app-node.tsx`) rendering app icon, application type tag (`[Type: ...]`), technology badge (`[...]`), runtime indicator, status badge (`Active`), port badge (`[:port]`), component drill-down button, and 4-way handles.
  - Registration in `components/canvas/custom-nodes.tsx` for `application`.
  - `application.spec.ts`: 5 tests covering SSR node rendering, drill-down callback invocation, canvas mounting with `InfiniteCanvas`, and `ArchitectureModelClient` reload identity.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 204 API tests, 109 domain tests, 228 web tests. Total: 541 tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F024-review.md`.

## 2026-09-26 — F023 — System

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `system.ts`: System domain model, `SystemMetadata` interface (external flag, domain, systemType, critical), `SystemNodeData` interface, helper `createSystem`, predicates `isSystem`, `isExternalSystem`, `isInternalSystem`, and canvas projection `projectSystemToCanvas`.
  - `system.test.ts`: 5 unit tests verifying internal vs external system classification, metadata properties, and canvas projection.
  - `c4-context.ts`: re-exported `isExternalSystem` and `isInternalSystem` from `./system` to eliminate duplication.
- API layer (`apps/api/src/architectures/`):
  - `system.e2e.spec.ts`: 6 E2E tests verifying creation of internal System (domain, systemType, critical), external System (third-party SaaS integration), system-to-system connections, metadata PATCH update, model snapshot reload identity, and cascade deletion.
- Web client layer (`apps/web/`):
  - `SystemNode` component (`components/canvas/system-node.tsx`) rendering internal systems (solid blue theme, domain badge `[Domain: ...]`, system type tag `[Type: ...]`, criticality badge `[Tier 0]`, container drill-down button) vs external systems (dashed slate border, external SaaS badge, no drill-down button), and 4-way handles.
  - Registration in `components/canvas/custom-nodes.tsx` for `system` and `default`.
  - `system.spec.ts`: 6 tests covering SSR node rendering, external system styling, drill-down callback invocation, canvas mounting with `InfiniteCanvas`, and `ArchitectureModelClient` reload identity.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 198 API tests, 105 domain tests, 228 web tests. Total: 531 tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F023-review.md`.

## 2026-09-26 — F022 — Person

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `person.ts`: Person / Actor domain model, `PersonMetadata` interface (role, department, external flag, email), `PersonNodeData` interface, helper `createPerson`, predicates `isPerson`, `isExternalPerson`, and canvas projection `projectPersonToCanvas`.
  - `person.test.ts`: 4 unit tests verifying classification, internal/external persona options, and canvas projection.
  - `c4-context.ts`: re-exported `isPerson` from `./person` to maintain clean modular dependencies.
- API layer (`apps/api/src/architectures/`):
  - `person.e2e.spec.ts`: 7 E2E tests verifying creation of internal Person (with role, department, email), external Person (customer/external actor), connection to software system, metadata PATCH update, model snapshot reload identity, and cascade deletion.
- Web client layer (`apps/web/`):
  - `PersonNode` component (`components/canvas/person-node.tsx`) rendering avatar icon, role badge (`[Role: ...]`), department tag (`[Dept: ...]`), external vs internal actor badges, contact email with icon, and 4-way connection handles.
  - Registration in `components/canvas/custom-nodes.tsx` for `person` and `actor`.
  - `person.spec.ts`: 5 tests covering SSR node rendering, external persona badge, selected ring, canvas mounting with `InfiniteCanvas`, and `ArchitectureModelClient` reload identity.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 192 API tests, 100 domain tests, 221 web tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F022-review.md`.

## 2026-09-26 — F021 — C4 Component

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `c4-component.ts`: C4 Level 3 component domain types (`C4ComponentKind`: 'component' | 'controller' | 'service' | 'repository' | 'middleware' | 'handler', `C4CodeMappingStub`, `C4ComponentNodeData`, `C4ContainerBoundaryNodeData`).
  - Helper functions: `createC4Component`, `createC4Controller`, `createC4DomainService`, `createC4Repository`.
  - Predicates and invariant helpers: `isComponent`, `isComponentOfContainer`, `getContainerComponents`, `getC4ComponentKind`.
  - Canvas projection: `projectC4ComponentToCanvas` mapping enclosing container boundary, component nodes with technology tags and L4 code mapping stubs, and inter-component edges.
  - `c4-component.test.ts`: 4 unit tests verifying classification, filtering, and canvas projection.
- API layer (`apps/api/src/architectures/`):
  - Model verification for C4 Component elements inside a container (`parentId = container.id`).
  - `c4-component.e2e.spec.ts`: 7 E2E tests verifying creation of components (controllers, services, repositories) inside parent container, L4 code mapping metadata persistence, inter-component connections, model snapshot reload identity, and cascade deletion.
- Web client layer (`apps/web/`):
  - `C4ComponentNode` component (`components/canvas/c4-component-node.tsx`) rendering:
    - Dedicated visual themes and icons for Controllers, Services, Repositories, Middlewares, and Handlers.
    - Technology tag `[Technology]` (e.g. `[NestJS Controller]`, `[Prisma ORM]`).
    - L4 Code mapping stub indicator with file path and inspect action `data-testid="c4-code-mapping-btn"`.
  - `C4ContainerBoundaryNode` component (`components/canvas/c4-container-boundary-node.tsx`) rendering enclosing parent container boundary with `[Container Boundary: Container Name]` and technology.
  - Registration in `components/canvas/custom-nodes.tsx` for `c4Component`, `c4ContainerBoundary`, and `component`.
  - `c4-component.spec.ts`: 7 tests covering SSR node rendering, code mapping stub callback invocation, container boundary rendering, canvas mounting, and ArchitectureModelClient reload identity.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 185 API tests, 96 domain tests, 216 web tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F021-review.md`.

## 2026-09-26 — F020 — C4 Container

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `c4-container.ts`: C4 Level 2 container domain types (`C4ContainerKind`: 'web_app' | 'mobile_app' | 'api' | 'service' | 'database' | 'queue' | 'store', `C4ContainerNodeData`, `C4SystemBoundaryNodeData`).
  - Helper functions: `createC4Container`, `createC4WebApp`, `createC4MobileApp`, `createC4Service`, `createC4Database`, `createC4Queue`.
  - Predicates and invariant helpers: `isContainer`, `isContainerOfSystem`, `getSystemContainers`, `canDrillToComponents`.
  - Canvas projection: `projectC4ContainerToCanvas` projecting enclosing system boundary, container nodes with technology tags, and inter-container connections.
  - `canvas.ts`: added optional `zIndex?: number;` to `CanvasNode`.
  - `c4-container.test.ts`: 4 unit tests verifying classification, filtering, component drill eligibility, and canvas projection.
- API layer (`apps/api/src/architectures/`):
  - Model verification for C4 Container elements inside a system (`parentId = system.id`).
  - `c4-container.e2e.spec.ts`: 8 E2E tests verifying creation of containers (web app, api service, database, queue) inside parent system, inter-container sync & async connections, model snapshot reload identity, and cascade/unlink handling.
- Web client layer (`apps/web/`):
  - `C4ContainerNode` component (`components/canvas/c4-container-node.tsx`) rendering:
    - Distinct visual themes and icons for Web Apps, Mobile Apps, API Services, Databases, and Message Queues.
    - Technology tag `[Technology]` (e.g. `[TypeScript / React]`, `[PostgreSQL 16]`).
    - Drill-to-components button `data-testid="drill-to-components-btn"` invoking `onDrillToComponents`.
  - `C4SystemBoundaryNode` component (`components/canvas/c4-system-boundary-node.tsx`) rendering enclosing parent system boundary with `[System Boundary: System Name]`.
  - Registration in `components/canvas/custom-nodes.tsx` for `c4Container` and `c4SystemBoundary`.
  - `c4-container.spec.ts`: 8 tests covering SSR node rendering, drill-to-components callback invocation, system boundary rendering, canvas mounting, and ArchitectureModelClient reload identity.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 178 API tests, 92 domain tests, 209 web tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F020-review.md`.

## 2026-09-26 — F019 — C4 Context

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `c4-context.ts`: C4 Context domain types and node data structures (`C4ContextElementKind`: 'person' | 'system' | 'external_system', `C4ContextNodeData`).
  - Helper functions: `createC4Person`, `createC4System`, `createC4ExternalSystem`, `isPerson`, `isExternalSystem`, `canDrillToContainers`.
  - Canvas projection bridge: `projectC4ContextToCanvas` mapping C4 model objects and connections to canvas nodes and edges with distinct handles, badges, dimensions, and type indicators.
  - `c4-context.test.ts`: 4 unit tests verifying node data extraction, drilling eligibility, and canvas projection.
- API layer (`apps/api/src/architectures/`):
  - Model verification for C4 Context elements: Person, internal System, external System, and relationships.
  - `c4-context.e2e.spec.ts`: 7 E2E tests verifying creation of Person, System, External System, connecting Person -> System and System -> External System, model reload identity, and cascade deletion.
- Web client layer (`apps/web/`):
  - `C4ContextNode` component (`components/canvas/c4-context-node.tsx`) rendering:
    - Persona card for People/Actors with avatar badge and description.
    - Solid branded container for internal Systems with `data-testid="drill-down-btn"` providing container drill-down action.
    - Muted dashed-border container for external / third-party Systems.
  - Registration in `components/canvas/custom-nodes.tsx` for `c4Context`, `person`, and `actor`.
  - `c4-context.spec.ts`: 6 tests covering SSR node rendering, drill-down callback invocation, canvas mounting, and ArchitectureModelClient reload identity.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 170 API tests, 88 domain tests, 201 web tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F019-review.md`.

## 2026-09-26 — F018 — Architecture model

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `types.ts`: added `ArchitectureModel` snapshot interface capturing architecture, default version, model objects, and connections.
  - `architecture-model.ts`: immutable domain model functions (`createArchitectureModel`, `addModelObject`, `updateModelObject`, `removeModelObject` with Invariant 4 connection cascading, `addModelConnection`, `updateModelConnection`, `removeModelConnection`), snapshot integrity validation (`validateArchitectureModel`), and deep model equivalence checking (`isModelIdentical`).
  - `architecture-model.test.ts`: 14 unit tests covering domain model creation, invariant violations (self-connection, cyclic parents, duplicate IDs, foreign endpoints), and identity equivalence.
- API layer (`apps/api/src/architectures/`):
  - `ArchitecturesModule`: REST endpoints conforming to `API_SURFACE.md`.
  - Architecture CRUD (`POST /workspaces/:workspaceId/architectures`, `GET /architectures/:id`, `PATCH /architectures/:id`, `DELETE /architectures/:id`).
  - Architecture model snapshot (`GET /architectures/:id/model`) loading objects + connections independent of any diagram.
  - Model objects CRUD (`POST /architectures/:id/objects`, `GET /architectures/:id/objects`, `GET /objects/:id`, `PATCH /objects/:id`, `DELETE /objects/:id`).
  - Model connections CRUD (`POST /architectures/:id/connections`, `GET /architectures/:id/connections`, `GET /connections/:id`, `PATCH /connections/:id`, `DELETE /connections/:id`).
  - Invariant enforcement: rejects self-connection (`canConnect`), rejects foreign endpoints (`validateConnection`), rejects cyclic parent hierarchy (`hasParentCycle`).
  - RBAC and multi-tenancy enforcement: checks workspace membership and restricts mutations to `canWrite(role)`.
  - `architectures.e2e.spec.ts`: 18 tests covering complete lifecycle, save/load/reload identity, and role authorization.
- Web client layer (`apps/web/lib/model/`):
  - `ArchitectureModelClient`: client-side model manager maintaining domain models independent of diagrams and Zustand (Layer Boundary Rule 4).
  - Optimistic mutations (`createObject`, `updateObject`, `deleteObject`, `createConnection`, `updateConnection`, `deleteConnection`) with guaranteed rollback to previous snapshot on error.
  - Model subscriptions for reactive UI updates without placing entities in Zustand.
  - Canvas projection bridge (`toCanvasProjection`) projecting model entities to canvas nodes and edges.
  - `architecture-model.spec.ts`: 8 tests verifying client-side model management, reload identity, and optimistic rollback on rejection.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 163 API tests, 84 domain tests, 195 web tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F018-review.md`.
- PR: https://github.com/nimatrazmjo/DiagramHQ/pull/19

## 2026-09-26 — F017 — Minimap

Status: COMPLETE

Implemented:
- Web layer canvas store (`apps/web/lib/canvas-store.ts`):
  - Added transient UI state: `isMinimapVisible`, `isFullscreen`, `isFocusMode` with corresponding toggle and setter actions.
  - Whitelist updated in `apps/web/canvas.spec.ts` guaranteeing strict compliance with Layer Boundary Rule 4 (zero domain entities in Zustand).
- Canvas UI components (`apps/web/components/canvas/infinite-canvas.tsx`):
  - Embedded `<MiniMap>` from `@xyflow/react` with `pannable`, `zoomable`, custom mask styling, and conditional rendering.
  - `getMiniMapNodeColor` function styling nodes by architectural category (system, app/container, store/database, component, person) with blue accent for selected nodes.
  - HTML5 Fullscreen API container integration with `fullscreenchange` synchronization and graceful exception fallback.
  - Focus Mode isolating selected nodes with visual dimming (opacity 0.15, grayscale 100%) and edge isolation, plus top-left status badge indicator.
  - Toolbar buttons for Focus Mode, Toggle Minimap, and Fullscreen.
  - Keyboard shortcuts: <kbd>M</kbd> (toggle minimap), <kbd>Shift</kbd>+<kbd>F</kbd> (fullscreen), <kbd>Alt</kbd>+<kbd>F</kbd> (focus mode), <kbd>Escape</kbd> (clear selection / exit focus mode).
- Tests (`apps/web/minimap-fullscreen-focus.spec.ts`):
  - 11 unit & integration tests covering store state, Layer Boundary Rule 4 zero-entity compliance, node category coloring, toolbar buttons, minimap conditional rendering, and focus mode badges.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F017-review.md`.
- PR: https://github.com/nimatrazmjo/DiagramHQ/pull/18

## 2026-09-26 — F016 — Undo/redo

Status: COMPLETE

Implemented:
- Web layer command infrastructure (`apps/web/lib/commands/`):
  - `command.ts`: `StateSetFn<T>`, `applyCanvasUpdate(setNodes, setEdges, mode)` hook on `Command<T>` typed with `@xyflow/react`.
  - `dispatcher.ts`: reactive listener subscription (`subscribe`, `notify`), stack inspectors (`canUndo`, `canRedo`, `peekUndo`, `peekRedo`, `getUndone`), and error-recovery rollback ensuring failed async operations do not corrupt history or undone stacks.
  - Reversible command implementations:
    - `create-node-command.ts`: `CreateNodeCommand` (creates node, undo removes it).
    - `delete-node-command.ts`: `DeleteNodeCommand` (removes node + connected edges, undo restores both).
    - `connect-nodes-command.ts`: `ConnectNodesCommand` (creates edge, undo removes it).
    - `update-metadata-command.ts`: `UpdateNodeMetadataCommand` (updates node metadata, undo reverts to prior data).
    - `move-node-command.ts`, `move-nodes-command.ts`, `align-nodes-command.ts`, `apply-layout-command.ts`: wired with `applyCanvasUpdate` for bidirectional visual position synchronization.
- Canvas UI and keyboard integration (`apps/web/components/canvas/infinite-canvas.tsx`):
  - Real-time dispatcher subscription updating undo/redo enabled states.
  - Undo (↶, `data-testid="undo-btn"`) and Redo (↷, `data-testid="redo-btn"`) toolbar buttons with disabled styling when stacks are empty or graph mutations are in flight.
  - Global keyboard listener for <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>Z</kbd> and <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> (plus <kbd>Ctrl</kbd>+<kbd>Y</kbd>), suppressed while typing in text inputs.
  - Concurrency guard preventing rapid successive keystrokes/clicks from racing during async network persistence.
- Tests (`apps/web/undo-redo.spec.ts`):
  - 25 tests covering dispatcher history, subscriber notifications, undo/redo across all 5 domain operations (create, delete, connect, move, metadata edit), canvas state synchronization, error stack restoration, and toolbar SSR rendering.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 identified stack corruption on failed undo/redo execution and race-guard omission; both fixed with regression tests. Verdict: CLEAN. Full log: `.harness/reviews/F016-review.md`.
- PR: https://github.com/nimatrazmjo/DiagramHQ/pull/17

## 2026-09-26 — F015 — Auto-layout

Status: COMPLETE

Implemented:
- Domain layer, layout-engine registry (MODULES.md §6 — new capabilities register(); core never switches on names):
  - `layout-registry.ts`: `LayoutNode`, `LayoutEdge`, `LayoutOptions`, `LayoutEngineName`, `LayoutEngine`, `registerLayoutEngine`, `getLayoutEngine`, `listLayoutEngines`, `applyLayout` (throws a descriptive error for an unregistered name; `[]` short-circuit for zero nodes).
  - `layout-engine-grid.ts`: row-major grid, default spacing derived from the largest node's width/height so it never overlaps.
  - `layout-engine-layered.ts`: `computeLayers` (Kahn's-algorithm longest-path-from-root layering; cycle members fall back to layer 0 instead of hanging), backing `hierarchical`, `tree`, `layered`, `TB` (all identical — a tree is just a DAG with no cross-branching) and `LR` (same algorithm, axes swapped).
  - `layout-engine-radial.ts`: concentric rings from the same layering; each ring's radius is the larger of "clear of the previous ring" and "enough circumference for its own node count," so same-ring nodes can't collide even with many siblings.
  - `layout-engine-force-directed.ts`: deterministic force simulation (circular index-seeded, no RNG; repulsion + spring-to-ideal-distance attraction over 150 iterations) followed by a deterministic overlap-resolution pass that guarantees zero bbox overlap even if the simulation didn't fully converge.
  - `layout-builtins.ts`: side-effect barrel registering all 4 built-ins; a third-party engine registers the same way without touching this file.
  - Tests: `layout-registry.test.ts` (4, registry mechanics + a test-only engine registering without core edits) + `layout-builtins.test.ts` (10: the acceptance-criteria bbox-non-overlap test across all 8 registered names on a sample graph with a deliberate cycle, plus per-engine correctness checks).
- Web layer:
  - `lib/commands/apply-layout-command.ts`: `ApplyLayoutCommand` — same `Command<...>` shape as `AlignNodesCommand` (batch persist, undo restores prior positions).
  - `components/canvas/layout-menu.tsx`: dropdown listing every `listLayoutEngines()` entry.
  - `components/canvas/infinite-canvas.tsx`: `handleApplyLayout` mirrors F014's `dispatchAlignOperation` exactly (in-flight ref+state guard, synchronous optimistic update via the pure domain function, background persist with rollback-on-failure) — reuses the review-hardened pattern instead of reintroducing the bugs F014 already found and fixed. Menu mounted bottom-left, shown whenever `nodes.length > 1` (whole-graph action, not gated by selection — "manual positions preserved unless re-applied" means this only ever runs on explicit click).
  - Tests: `auto-layout.spec.ts` — 11 tests (command execute/undo/persist/no-persist/all-8-engines, dispatcher history+undo, `LayoutMenu` SSR markup).

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (366 tests: 70 domain, 151 web, 145 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review, round 1: `code-review` skill found 1 high (align and apply-layout used independent busy-guards, so the two whole-graph mutations could race and clobber each other) + 2 medium (`ApplyLayoutCommand` recomputed the layout a second time on persist, doubling cost for `forceDirected`; `resolveOverlaps`' fixed pass count wasn't guaranteed to converge for larger graphs) + 1 low (`LayoutNode` duplicated `AlignableNode`'s shape); all fixed in a follow-up commit.
- PR Review, round 2: found 1 high (the round-1 guard had no try/catch around its synchronous compute, so a throw could brick both toolbars permanently), 2 medium (rollback could clobber an unrelated successful edit made mid-persist; `computeLayers` collapsed nodes downstream of a cycle to the same fallback layer as the cycle itself), 4 low (missing engine-output length validation, a `columns: 0` footgun in grid layout, `LayoutMenu`'s option buttons not disabled, duplicated persist logic across commands) — all fixed with a proper DFS back-edge-removal rewrite of `computeLayers` plus the rest; 2 more low findings addressed via documentation (softened an overclaiming docstring; clarified `MODULES.md`'s built-in-location rule rather than moving correctly-layered pure-math code).
- PR Review, round 3: found 1 medium (gridLayout fractional column counts in (0, 1) producing NaN/Infinity) + 3 low (applyLayout coordinate validation, forceDirected integer coordinate rounding, LayoutMenu outside pointerdown/Escape dismissal); all fixed with regression tests. Verdict: CLEAN. Full log: `.harness/reviews/F015-review.md`.
- PR: https://github.com/nimatrazmjo/DiagramHQ/pull/16

## 2026-09-26 — F014 — Alignment

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/alignment.ts`):
  - `snapToGrid(position, gridSize = 20)`: rounds a position to the nearest grid point.
  - `alignNodes(nodes, axis)`: pure alignment for `'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV'`, treating missing width/height as zero-dimension.
  - `distributeNodes(nodes, axis)`: even-gap distribution along `'horizontal' | 'vertical'`, no-op below 3 nodes, returns positions in original input order.
  - 14 unit tests with exact coordinate assertions in `alignment.test.ts`.
- Web command layer (`apps/web/lib/commands/align-nodes-command.ts`):
  - `AlignNodesCommand` implements `Command<AlignedNodeResult[]>`, wrapping the domain `alignNodes`/`distributeNodes` functions; captures prev positions at construction for `undo()`; calls `batchPersistFn` when `viewId` is set (same batch-persist contract as `MoveNodesCommand`, Layer Boundary Rule 3).
- Web canvas UI (`apps/web/components/canvas/`):
  - `alignment-toolbar.tsx`: new `AlignmentToolbar` component — 6 align buttons + 2 distribute buttons (disabled below 3 selected nodes) + a snap-to-grid toggle.
  - `infinite-canvas.tsx`: mounts the toolbar in a bottom-center `Panel` when `selectedNodeIds.length > 1`; `handleAlign`/`handleDistribute` build `AlignableNode[]` from the current React Flow node state and dispatch `AlignNodesCommand` through `defaultCommandDispatcher`, then sync local node positions from the result.
  - Snap-to-grid wired into both single-node (`createNodeDragStopHandler`, new optional `snapToGridEnabled`/`gridSize` params, default off — existing callers unaffected) and group (`handleSelectionDragStop`) drag-stop paths, applying `snapToGrid` to the final position before the move command is built.
  - `canvas-store.ts`: added transient `isSnapToGridEnabled` + `toggleSnapToGrid`/`setSnapToGrid` (Layer Boundary Rule 4 — boolean UI flag, no domain entities).
- Tests: `apps/web/alignment.spec.ts` — 15 tests covering `AlignNodesCommand` (execute/undo/persist/no-persist/distribute), `CommandDispatcher` history + undo, snap-to-grid store state, and `AlignmentToolbar` SSR-rendered markup (button test-ids, disabled distribute state, snap-enabled styling). Updated `canvas.spec.ts`'s Layer-Boundary-Rule-4 allowlist for the 3 new store keys.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (333 tests: 49 domain, 139 web, 145 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review, round 1: `code-review` skill found 1 high + 2 medium + 2 low findings (React Flow `measured` vs top-level `width`/`height`, an async optimistic-update race, a missing `.catch`, duplicated handlers, O(n·m) lookups); all fixed in a follow-up commit.
- PR Review, round 2: found 1 high (per-node snap-to-grid distorting group-drag relative offsets — fixed with a shared-delta `snapGroupPositions` helper), 1 medium (no rollback on persist failure — fixed), 1 low (reintroduced O(n·m) lookup — fixed), 1 low deferred with rationale (closure-staleness on back-to-back clicks, pre-existing pattern, no realistic single-user trigger).
- PR Review, round 3: 1 finding investigated and not reproduced (single-node snap does correctly update, per direct code walkthrough), 2 medium fixed (group-drag move had no failure rollback unlike the align path added in the same diff; overlapping align/distribute calls could stomp each other's rollback — fixed with an in-flight guard that also disables the toolbar buttons), 1 low fixed (`Math.min`/`Math.max` argument-spread would `RangeError` on very large selections — replaced with `reduce`). Verdict: CLEAN. Full history: `.harness/reviews/F014-review.md`.
- PR: https://github.com/nimatrazmjo/DiagramHQ/pull/15

## 2026-09-26 — F013 — Multi-select

Status: COMPLETE (backfilled — merged as PR #14 / commit `c8f1ac1`, entry omitted by prior session before it hit quota)

Implemented:
- Web canvas multi-select (`apps/web`):
  - Shift-click toggles individual objects into/out of multi-selection; toggleable Box Select mode (`data-testid="box-select-btn"`) enables marquee drag-selection via `selectionOnDrag`.
  - Multi-select badge (`data-testid="multi-select-badge"`) shown when >1 node selected.
  - `MoveNodesCommand` (`apps/web/lib/commands/move-nodes-command.ts`) with `execute()`/`undo()` for group moves; `onSelectionDragStop` in `InfiniteCanvas` builds per-node prev/new positions and dispatches through `defaultCommandDispatcher` (Layer Boundary Rule 3 — no direct fetch in canvas components).
  - `canvas-store.ts`: added `isBoxSelectMode`, `toggleBoxSelectMode`, `setBoxSelectMode`, `toggleNodeSelection`, `toggleEdgeSelection`.
  - 18 new tests in `apps/web/multi-select.spec.ts`.
- API batch layout persistence (`apps/api`):
  - `PATCH /views/:viewId/objects/positions` atomically upserts multiple object positions in one Prisma `$transaction`, with multi-tenant auth + `canWrite` role guard.
  - `updateMultipleObjectPositions` in `views.service.ts` + 4 new unit tests in `views.service.spec.ts`.

Verification (from PR #14 description):
- Tests: PASS (295 tests: 34 domain, 116 web, 145 api)
- TypeScript: PASS (0 errors)
- Lint: PASS (0 errors, 0 warnings)
- Architecture: PASS
- Build: PASS (Next.js + NestJS)
- PR: https://github.com/nimatrazmjo/DiagramHQ/pull/14 (squash-merged to `main`)

Notes: No `.harness/reviews/F013-*.md` was written before merge — the session that built this feature was interrupted by a quota limit immediately after merging and branching to F014, before it could backfill this entry or the review log. Recorded now for an accurate history; no functional gap.

## 2026-09-26 — F012 — Drag and Drop

Status: COMPLETE

Implemented:
- API view layout persistence (`apps/api`):
  - Created `ViewsModule`, `ViewsService`, and `ViewsController` in `apps/api/src/views/`.
  - Added `PATCH /views/:viewId/objects/:objectId/position` to persist and upsert per-view object coordinates (`{ x, y }`) to the `view_objects` table in PostgreSQL.
  - Added `GET /views/:viewId/objects` to retrieve layout positions for a view.
  - Enforced multi-tenancy and role checks using `canWrite` from `@diagramhq/domain`; viewer roles receive 403 Forbidden, cross-tenant requests receive 404 Not Found.
  - Added 7 unit tests in `views.service.spec.ts` and 4 integration tests in `views.e2e.spec.ts`.
- Web command layer & drag-and-drop (`apps/web`):
  - Created client-model command layer in `apps/web/lib/commands/` (`Command<T>`, `MoveNodeCommand`, `CommandDispatcher`, `defaultCommandDispatcher`).
  - Integrated `MoveNodeCommand` with `execute()` and `undo()` capabilities, maintaining undo/redo stacks.
  - Integrated `onNodeDragStop` in `InfiniteCanvas` to capture start and finish coordinates and dispatch `MoveNodeCommand` to the command dispatcher, strictly adhering to Layer Boundaries Rule 3 (no direct HTTP requests in canvas components).
  - Added 17 unit and component tests in `apps/web/drag-drop.spec.ts` verifying command execution, undo/redo, command history, and canvas drag events.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (273 tests: 34 domain, 98 web, 141 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F012-review.md`.



## 2026-09-27 — F038 — Security views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-view.ts`: Implemented `projectSecurityViewToCanvas` to inject security data properties into model objects and dynamically project them into `GroupNode` elements representing `trustZone` boundaries.
  - `view.ts`: Registered `security` ViewKind labeling support.
- UI components (`apps/web/components/canvas/`):
  - `security-badges.tsx`: Implemented a standalone overlay rendering SVG badges for public endpoints, auth, secrets, encryption, and compliance.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `SecurityBadges` conditional on `securityView` metadata.
- Validation (`apps/web/security-views.spec.ts`):
  - Unit tests verifying the proper mapping of the model into group boundary wrappers and extraction of the correct security flags to the canvas node props.
## 2026-09-27 — F036 — Filters
Status: COMPLETE

Implemented:
- `FilterBuilder` React component in `apps/web/components/shell/filter-builder.tsx` for building dynamic view filters.
- Supports 13 predefined filter keys: team, technology, environment, domain, owner, status, tag, criticality, dataClassification, cloud, region, repository, kind.
- Allows user input to build a multi-attribute `ViewFilter` payload and emit it via `onFilterChange` and `onSaveView` hooks.
- Tested filter UI state updates and structure in `apps/web/filter-builder.spec.tsx` via `renderToString`.
- Validated that the constructed multi-attribute payload correctly filters domain objects via `evaluateDynamicView` from `@diagramhq/domain`.

Verification:
- pnpm typecheck, pnpm lint, pnpm check-architecture, and tests passed (254 web/api/domain tests, including 3 new FilterBuilder UI tests).
- pnpm build successfully created the Next.js standalone app build.
- PR reviewed, accepted, and squash merged to main as commit `106a94d`.

---


## 2026-09-26 — F011 — Object Selection

Status: COMPLETE

Implemented:
- Web canvas object selection (`apps/web`):
  - Added transient selection helpers in `apps/web/lib/canvas-store.ts`: `selectNode`, `selectEdge`, `isNodeSelected`, `isEdgeSelected`, and `clearSelection` adhering strictly to Layer Boundaries Rule 4.
  - Connected `onSelectionChange` and `onPaneClick` in `InfiniteCanvas` to update store selection and deselect on background click.
  - Implemented window `Escape` key listener outside text inputs to clear selection (`useCanvasStore.getState().clearSelection()`).
  - Added visual selection count badge (`data-testid="selection-badge"`) and toolbar `Clear` button (`data-testid="clear-selection-btn"`) on canvas.
  - Verified active selection ring styling across custom nodes (`SystemNode`, `AppNode`, `StoreNode`).
  - Added 10 automated unit and component tests in `apps/web/selection.spec.ts` covering store selection toggling, node selection styling, and UI badge/button rendering.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (245 tests: 34 domain, 81 web, 130 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F011-review.md`.

---

## 2026-09-26 — F010 — Pan and Zoom

Status: COMPLETE

Implemented:
- Web canvas pan & zoom controls (`apps/web`):
  - Added wheel zoom clamping (`clampZoom`, `MIN_ZOOM` = 0.1, `MAX_ZOOM` = 4.0, `DEFAULT_ZOOM` = 1.0) and transient zoom action helpers (`zoomIn`, `zoomOut`, `resetZoom`) in `apps/web/lib/canvas-store.ts`.
  - Configured React Flow canvas with `minZoom={0.1}`, `maxZoom={4.0}`, `zoomOnScroll={true}`, and `panActivationKeyCode="Space"`.
  - Wrapped `InfiniteCanvas` with `ReactFlowProvider` and implemented `pan-zoom-toolbar` with Zoom In (+), Zoom Out (−), 100% Reset, and Fit to Content (F) buttons.
  - Implemented keyboard shortcut handler for Space-bar pan activation (updating `isSpacePanning`, toggling grab/grabbing cursor, rendering `PAN MODE (SPACE)` status badge) and 'F' key fit-to-content triggering `fitView({ padding: 0.2, duration: 250 })`.
  - Guarded keyboard shortcuts against text inputs (`input`, `textarea`, `select`, `contentEditable`).
  - Added 10 automated unit and component tests in `apps/web/pan-zoom.spec.ts` covering store zoom clamping, space pan toggling, CanvasRenderer viewport contract, toolbar rendering, and pan mode indicators.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (235 tests: 34 domain, 71 web, 130 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F010-review.md`.

---

## 2026-09-26 — F009 — Infinite Canvas

Status: COMPLETE

Implemented:
- Domain canvas primitives & abstraction (`packages/domain/src/canvas.ts`):
  - Defined framework-agnostic types: `CanvasNode`, `CanvasEdge`, `CanvasViewport`, `CanvasDimensions`, `CanvasInteractionHandler`.
  - Defined `CanvasRenderer<TContainer>` interface isolating renderer from core model (ADR-0002, MODULES.md §7).
  - Implemented pure model projection function `projectViewModelToCanvas` mapping objects and connections to canvas nodes and edges with deterministic fallback grid.
  - Added unit tests in `packages/domain/src/canvas.test.ts` (11 tests).
  - Hardened monotonic ID generation in `packages/domain/src/ids.ts` with random entropy suffix to eliminate concurrent test ID collisions.
- Web canvas implementation (`apps/web`):
  - Created transient UI store `useCanvasStore` (`apps/web/lib/canvas-store.ts`) adhering strictly to Layer Boundaries Rule 4 (zero domain entity models stored in Zustand; handles only viewport, selection IDs, and hover states).
  - Implemented `ReactFlowCanvasRenderer` in `apps/web/components/canvas/canvas-renderer.ts` satisfying `CanvasRenderer<HTMLElement>`.
  - Created custom architectural nodes (`SystemNode`, `AppNode`, `StoreNode`) with handles, semantic styling, badges, and icons in `apps/web/components/canvas/custom-nodes.tsx`.
  - Implemented `InfiniteCanvas` component in `apps/web/components/canvas/infinite-canvas.tsx` integrating React Flow, MiniMap, Controls, Background grid, and selection callbacks.
  - Integrated `InfiniteCanvas` into `/workspace/[workspaceId]` studio overview with sample projected architecture.
  - Added comprehensive test suite in `apps/web/canvas.spec.ts` (17 tests).

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (225 tests: 34 domain, 61 web, 130 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F009-review.md`.

---

## 2026-09-26 — F008 — Application Shell

Status: COMPLETE

Implemented:
- Shell components (`apps/web/components/shell/`):
  - `LeftNavigator`: Renders all 7 required navigation sections (Overview, Systems, Apps, Data, Flows, Views, Decisions) with active pathname styling, SVG icons, and mobile overlay drawer.
  - `TopBar`: Header bar featuring workspace breadcrumbs, search input with `⌘K` shortcut badge, "Ask AI" assistant trigger button, user session info, sign-out button, and inspector toggle.
  - `InspectorPanel`: Collapsible right-hand inspector slot with tabs for Properties, Hierarchy, and Metadata, empty selection state, and custom children slot.
  - `AppShell`: Master responsive 3-pane layout holding at narrow phone viewports with collapsible panels.
  - `index.ts`: Unified export of shell components and types.
- Studio Routes (`apps/web/app/workspace/`):
  - `[workspaceId]/layout.tsx`: Layout wrapping pages in `<AppShell>`.
  - `page.tsx`: Workspace Overview page with model statistics and quick access links.
  - Subroute pages for `systems`, `apps`, `data`, `flows`, `views`, `decisions`.
- Route protection & integration:
  - Updated `middleware.ts` to protect `/workspace/*` routes.
  - Added "Open Studio →" link in `workspace-list.tsx`.
- Automated test suite (`apps/web/shell.spec.ts`, 11 tests) verifying navigator sections, top bar controls, inspector slot, responsive attributes, and middleware routing.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (197 tests: 23 domain, 44 web, 130 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F008-review.md`.

---

## 2026-09-26 — F005 — User Roles

Status: COMPLETE

Implemented:
- Domain invariants (`packages/domain`):
  - Pure role gating functions in `invariants.ts`: `canWrite`, `canAdmin`, `canDeleteOrg`, `assertRoleCanWrite`, and `RolePermissionDeniedError`.
  - Unit tests verifying viewers cannot write and editors can write (`invariants.test.ts`).
- API role gating & management (`apps/api`):
  - `RolesGuard` and `@RequireRoles` decorator (`apps/api/src/roles/`).
  - `PATCH /organizations/:id/members/:memberId` endpoint with `UpdateMemberRoleDto` and `updateMemberRole` service logic.
  - Owner demotion protection and role privilege hierarchy.
  - Unit tests in `roles.guard.spec.ts` (7 tests).
  - Integration tests in `roles.e2e.spec.ts` (8 tests) against live PostgreSQL testing write gating, workspace creation denial for viewers, editor write permissions, and role promotion transitions.
- Web application (`apps/web`):
  - `RoleBadge` component and `canRoleWrite` helper.
  - Server action `updateMemberRoleAction`.
  - Read-only UI gating in `CreateWorkspaceForm` for viewers.
  - Unit tests in `roles.spec.ts` (6 tests).

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (176 tests: 23 domain, 23 web, 130 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F005-review.md`.

---

## 2026-09-26 — F004 — Workspaces

Status: COMPLETE

Implemented:
- API workspace capabilities (`apps/api`):
  - `WorkspacesModule`, `WorkspacesService`, and `WorkspacesController` composed into `AppModule`.
  - Input validation: `CreateWorkspaceDto` and `UpdateWorkspaceDto`.
  - Scoped workspace creation (`POST /organizations/:orgId/workspaces`): Creates workspace scoped to `orgId`; validates organization membership; rejects `viewer` role; enforces per-org unique slug (`@@unique([orgId, slug])`).
  - Workspace retrieval & containment (`GET /organizations/:orgId/workspaces`, `GET /workspaces/:id`, `GET /workspaces/:id/architectures`): Verifies caller's membership in parent org (returns 404 for unassociated callers); returns workspace with architecture count and contained architecture summaries.
  - Workspace update & cascade deletion (`PATCH /workspaces/:id`, `DELETE /workspaces/:id`): Verifies role permissions (`owner`/`admin`/`editor` for update, `owner`/`admin` for delete); deletes workspace and cascades to contained architectures.
  - Unit test suite (`workspaces.service.spec.ts`, 25 tests) and e2e integration test suite (`workspaces.e2e.spec.ts`, 14 tests) verifying multi-tenant isolation, cross-org access prevention, and architecture containment against live PostgreSQL.
- Web application (`apps/web`):
  - `app/dashboard/workspace-actions.ts`: Server actions for creating and fetching workspaces.
  - `app/dashboard/create-workspace-form.tsx`: Interactive workspace creation form with error feedback.
  - `app/dashboard/workspace-list.tsx`: Workspace list with architecture count badges.
  - `app/dashboard/page.tsx`: Displays workspaces under each organization.
  - Unit test suite (`workspaces.spec.ts`, 11 tests) verifying actions and validation.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (147 tests: 15 domain, 17 web, 115 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F004-review.md`.

---

## 2026-09-26 — F003 — Organizations

Status: COMPLETE

Implemented:
- Domain types (`packages/domain`): Registered `mem` prefix in `IdPrefix`, typed `MemberId`, and updated `Member` interface.
- API organization capabilities (`apps/api`):
  - `OrganizationsModule`, `OrganizationsService`, and `OrganizationsController` composed into `AppModule`.
  - Input validation: `CreateOrganizationDto` and `UpdateOrganizationDto`.
  - Transactional creation (`POST /organizations`): Creates organization and initial `owner` membership for the authenticated caller; auto-generates slug or validates custom slug with collision resolution.
  - Multi-tenant boundary enforcement: `GET /organizations` only lists organizations where caller is a member; `GET /organizations/:id`, `PATCH /organizations/:id`, `DELETE /organizations/:id` return 404 for unassociated callers (complete cross-tenant invisibility).
  - Role-guarded mutations: `PATCH` guarded to `owner` and `admin` roles; `DELETE` guarded strictly to `owner`.
  - Membership querying: `GET /organizations/:id/members`.
  - Unit test suite (`organizations.service.spec.ts`, 15 tests) and e2e integration test suite (`organizations.e2e.spec.ts`, 9 tests).
- Web application (`apps/web`):
  - `lib/api-token.ts`: Signs stateless JWT tokens from user sessions for backend calls.
  - `app/dashboard/actions.ts`: Server actions for organization creation and listing.
  - `app/dashboard/create-org-form.tsx`: Interactive organization creation form with error feedback.
  - `app/dashboard/page.tsx`: Displays authenticated user's organizations with their assigned roles and creation UI.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (82 tests: 15 domain, 6 web, 61 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F003-review.md`.

---

## 2026-09-26 — F002 — Authentication

Status: COMPLETE

Implemented:
- Architecture decision DEC-007: Auth.js (NextAuth v5) selected with credentials provider and stateless JWT session strategy using shared `AUTH_SECRET`. Zero external cloud SaaS dependencies for clean local development and CI testing.
- Domain types (`packages/domain`): Added `usr_` id prefix, `User`, `AuthSessionUser`, and `AuthTokenPayload` interfaces.
- Web authentication (`apps/web`):
  - NextAuth v5 configuration (`auth.config.ts`, `auth.ts`, `app/api/auth/[...nextauth]/route.ts`).
  - Next.js edge route protection `middleware.ts` redirecting unauthenticated requests from `/dashboard` to `/login?callbackUrl=...`.
  - Accessible, autofill-compliant `/login` form (`LoginForm`).
  - Protected `/dashboard` view with active user session display and sign-out action.
  - Dedicated unit tests in `apps/web/auth.spec.ts`.
- API authentication (`apps/api`):
  - `AuthModule`, `AuthService`, `AuthGuard`, `@CurrentUser()`, `@Public()` decorators.
  - `POST /auth/token` endpoint for token exchange with structured 401 error envelope on invalid credentials.
  - `GET /auth/me` endpoint verifying Bearer JWT tokens and injecting authenticated user claims into controller handler.
  - Unit tests for `AuthService` (5 tests) and `AuthGuard` (5 tests).
  - End-to-end integration tests in `auth.e2e.spec.ts` (6 tests) exercising the real HTTP pipeline and NestJS DI container.
- Config: Updated `packages/config/eslint-preset.js` to preserve NestJS DI decorator metadata across guards, filters, pipes, and interceptors.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (57 tests: 15 domain, 5 web, 37 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F002-review.md`.

---

## 2026-09-26 — F007 — API foundation

Status: COMPLETE

Implemented:
- Global `ValidationPipe` (`apps/api/src/common/validation.ts`): whitelist + reject-unknown + transform, wired in `main.ts`.
- Global `AllExceptionsFilter` (`apps/api/src/common/http-exception.filter.ts`): every thrown error becomes `{ error: { code, message, details? } }`; unknown errors collapse to a generic 500 with no stack trace or internal detail reaching the client (logged server-side only).
- `/health` enhanced to check Postgres connectivity via `PrismaService.$queryRaw` (`apps/api/src/health/health.service.ts`); reports `ok`/`degraded` plus `checks.database`.
- `apps/api/src/app.e2e.spec.ts`: a real HTTP-level integration suite (`@nestjs/testing` + `supertest`) exercising the actual app — health, a 404's error envelope, and a throwaway DTO-validated route (not a permanent endpoint; domain CRUD lands in F003/F004) proving the ValidationPipe rejects/accepts through the real pipeline, not just in isolation.
- `apps/api/vitest.config.ts` + `unplugin-swc`: needed because Vitest's default esbuild transform doesn't emit `design:paramtypes` metadata, which silently broke NestJS DI and DTO-metatype detection — caught by the new integration test, not by the unit tests of each class in isolation.

Verification:
- TypeScript: PASS (`pnpm typecheck` green across all workspace projects)
- Lint: PASS (`pnpm lint` green, 0 errors/warnings)
- Tests: PASS (51 tests: 15 domain, 36 api — up from 6; +30 tests for F007 including integration, cache/dedup, timeout, and logger suites)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` green)
- Live smoke test: real compiled server against the running Postgres container — `GET /health` -> 200 `{"status":"ok",...,"checks":{"database":"up"}}`; `GET /does-not-exist` -> 404 `{"error":{"code":"NOT_FOUND",...}}`.
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F007-review.md`.
- PR Review: pushed to PR #4 (`feat/F007-api-foundation` -> `main`), taken through 4 rounds of `loops/pr-review-loop.md` (code-review skill). 6 findings fixed in round 4 (vitest monorepo root env loading, in-flight probe deduplication preventing thundering herds, cache unit tests, withTimeout unit tests, structured logger unit tests, headersSent guard, custom details extraction). GitHub Actions CI green. Verdict: CLEAN.

Notes: implementation was recovered from a concurrent (Antigravity/Cowork) session's uncommitted WIP, stashed mid-session and popped onto a fresh `feat/F007-api-foundation` branch (created from `main` after F006/harness-docs/agent-relay-cleanup all merged) rather than lost or discarded.

---

## 2026-09-26 — Agent relay keep-awake + runtime notes (harness tooling)

Status: COMPLETE (tooling; not a product feature)

Implemented:
- `scripts/agent-relay.sh`: keeps the Mac awake (`caffeinate -dimsu`) while the relay runs; cleans it up on INT/TERM/HUP/EXIT (was INT-only) and now also kills the backgrounded `claude`/`agy` child on signal, not just the caffeinate helper.
- `.harness/RUNTIME-CONTINUITY.md`: documents a third environment (a cloud Cowork Linux VM that has touched this repo between relay sessions) — explicitly not part of `agent-relay.sh`'s two-runtime rotation — plus the cross-platform `node_modules`/Prisma-engine gotcha and the division of labor when a Cowork session is involved.

Verification: `bash -n scripts/agent-relay.sh` clean; smoke-tested the background+wait+signal pattern in isolation (SIGTERM to the wrapper kills the backgrounded child, confirmed via `ps` before/after). No product code touched.

Review: `code-review` skill via PR #3 (`loops/pr-review-loop.md`). Log: `.harness/reviews/agent-relay-cleanup-and-runtime-notes-review.md`.

---

## 2026-09-26 — F006 — Database foundation

Status: COMPLETE

Implemented:
- PostgreSQL + Prisma ORM in `apps/api` with full data model schema per `DATA_MODEL.md` (organizations, workspaces, architectures, versions, model_objects, model_connections, tags, technologies, views, view_objects, flows, decisions, environments, phases, members).
- Initial SQL migration `20260926000000_init` applied cleanly to live PostgreSQL 16 instance.
- `packages/domain` pure invariants (`canConnect`, `validateConnection`, `hasParentCycle`, `validateViewObject`, `assertTenantAccess`) with branded types and comprehensive unit test coverage.
- Query-layer tenant isolation via `TenantContext` in `apps/api/src/database/tenant.context.ts` guaranteeing strict organization boundary enforcement.
- Local dev seed script (`apps/api/prisma/seed.ts`) populating organization, workspace, architecture, 4 model objects, 2 connections, and 1 view.
- Architectural boundary enforcement via `scripts/check-architecture.sh` wired into `init.sh` and `pnpm verify`.

Verification:
- TypeScript: PASS (`pnpm typecheck` green across all 5 workspace projects)
- Lint: PASS (`pnpm lint` green, 0 errors/warnings)
- Tests: PASS (20 tests passed: 15 domain invariant tests, 5 API tests including entity round-trip, cross-tenant denial, and connection invariant tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` green)
- Database: PASS (migration applied to PostgreSQL 16 container, seed script executed successfully)
- Evaluator Rubric Score: 5.0 / 5.0 (acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5) -> PASS. Log: `.harness/reviews/F006-review.md`.

PR Review: pushed to PR #1 (`feat/F006-database-foundation` -> `main`), taken through 3 rounds of the new `loops/pr-review-loop.md` (code-review skill). 22 correctness/efficiency findings fixed across the 3 rounds (build ordering, layer-boundary regex gaps, cross-tenant/cross-architecture/cross-version integrity gaps on `versionId`/`parentId`, a missing FK, unwired domain invariants (`hasParentCycle`, `validateViewObject`), CI gaps, stale docs); 2 structural findings (TenantContext's per-model isolation pattern, `architecture.create`'s non-transactional `defaultVersionId` set) logged as open decisions in `BLOCKERS.md` rather than fixed mid-PR. Stopped at round 3 by user decision (diminishing severity; not all `MAX_PR_ROUNDS`=4 exhausted). Re-verified after every round: 21 tests green, typecheck/lint/build/check-architecture clean. Log: `.harness/reviews/F006-review.md`. Merged to `main`.

---

## 2026-09-26 — Runtime continuity protocol (harness tooling)

Status: COMPLETE (tooling; not a product feature)

Added:
- `.harness/RUNTIME-CONTINUITY.md` — fail over between Claude Code (`claude`) and Antigravity (`agy`, Claude Sonnet) when a runtime hits its usage/session limit; resume from PROJECT_STATE.md.
- `.harness/RUNTIME-SWITCHES.md` — switch ledger.
- `scripts/agent-relay.sh` — optional relay that alternates the two runtimes across limits.
- AGENTS.md gained a "Usage / session limits" rule; README layout updated.

Notes: `agy` model id for Sonnet is set via `AGY_SONNET_MODEL` / `agy` -> `/model` (list includes Claude Sonnet). Relay switches on any runtime exit; tune to a limit-message grep if you want limit-only switching.

---

## 2026-09-26 — F001 — Project architecture

Status: COMPLETE

Implemented:
- pnpm monorepo: apps/web (Next.js 14 standalone), apps/api (NestJS 10 + health endpoint), packages/domain (framework-free: branded ids + a connection invariant + tests), packages/config (shared ESLint preset).
- Strict TypeScript base; ESLint + Prettier + Vitest; scripts/init.sh baseline; .harness/CLAUDE.md command table filled in.
- Docker: multi-stage Dockerfiles (api via `pnpm deploy`, web via Next standalone) + docker-compose (web/api/postgres/redis) + GitHub Actions CI.

Files: 42. Commits: 1e817c4 (impl) + review-fix commit on feat/F001-project-architecture.

Verification: TypeScript PASS · Lint PASS · Unit tests PASS (4) · Build PASS · Docker build NOT RUN (no Docker in sandbox — validate with `docker compose build`).

Review: independent subagent — REQUEST CHANGES -> resolved (deploy dist inclusion, docker caching, Next outputFileTracingRoot, CI pnpm cache, typed metadata) -> APPROVE. Log: .harness/reviews/F001-review.md.

Notes: domain is source-exported (ESM/CJS interop with the CommonJS api deferred to F018); ids are a scaffold placeholder (not collision-safe across processes); Tailwind/shadcn deferred to the UI/canvas phases.

---

## 2026-09-25 — Tracking system established

Status: COMPLETE (tracking setup; not a product feature)

Implemented:
- Persistent implementation tracking system inside `.harness/`: PROJECT_STATE.md (master), ROADMAP.md (135 features across 13 phases, permanent F-IDs), CURRENT_TASK.md, CHANGELOG.md, DECISIONS.md, BLOCKERS.md, and phases/PHASE-01..13.md.
- Adopted the 13-phase F001–F108 taxonomy (+ F109–F135 for master-spec items not in the reference list); carried the acceptance criteria + tests from the retired feature_list.json into the phase files.
- Made the Markdown tracking system the single source of truth; archived the superseded feature_list.json, session-handoff.md, FEATURE_MATRIX.md, and claude-progress.md under `_archive/`.

Files: `.harness/PROJECT_STATE.md`, `ROADMAP.md`, `CURRENT_TASK.md`, `DECISIONS.md`, `BLOCKERS.md`, `phases/*` (+ repointed AGENTS.md/CLAUDE.md/README.md/scope-guard.md/PRODUCT.md and scripts/SCRIPTS.md).

Verification:
- Structure: 6 master files + 13 phase files present.
- ROADMAP counts: 135 features, 0 complete, progress 0.0%.
- No application code in the repo (all features correctly NOT STARTED).

Notes: No product feature implemented — this was the tracking-system task. Product build begins at F001.

---

## 2026-09-25 — Harness bootstrap (history)

Status: COMPLETE

Implemented (before the tracking system):
- Created the `.harness/` rules + spec system from the 8 Learn-Harness-Engineering projects: entry points, product/, architecture/ (+ 3 ADRs), rules/, verification/, loops/, graph/, scripts/.
- Wrote the DiagramHQ product spec and the initial 6-phase feature checklist (later restructured into the 13-phase ROADMAP above).

Verification: harness tree present; no application code.

Notes: Retained for history. The 6-phase feature_list.json from this work is archived under `_archive/`.


## 2026-09-27 — F038 — Security views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-view.ts`: Implemented `projectSecurityViewToCanvas` to inject security data properties into model objects and dynamically project them into `GroupNode` elements representing `trustZone` boundaries.
  - `view.ts`: Registered `security` ViewKind labeling support.
- UI components (`apps/web/components/canvas/`):
  - `security-badges.tsx`: Implemented a standalone overlay rendering SVG badges for public endpoints, auth, secrets, encryption, and compliance.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `SecurityBadges` conditional on `securityView` metadata.
- Validation (`apps/web/security-views.spec.ts`):
  - Unit tests verifying the proper mapping of the model into group boundary wrappers and extraction of the correct security flags to the canvas node props.
### 2026-09-27- **F037** (Saved views): COMPLETE. Updated `View` Prisma model and domain type to include `isStarred: Boolean`. Modified `createView` and added `updateView` endpoint `PATCH /views/:viewId` to support starring/unstarring a view. Validated via `saved-views.e2e.spec.ts` tests `F037: should save and star a named view` and `F037: should update an existing view to star it`. Tests passed locally via `pnpm verify`.

## 2026-09-27 — F039 — Data views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `data-view.ts`: Implemented `projectDataViewToCanvas` to inject `dataClassification` into model objects and animate connections that represent data flow (`kind='data'` or possessing `dataClassification`).
  - Exported `projectDataViewToCanvas` in `index.ts`.
- UI components (`apps/web/components/canvas/`):
  - `data-badges.tsx`: Implemented an overlay rendering color-coded SVG badges for public/internal/confidential/restricted data classifications.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to render `DataBadges` conditionally based on `dataView` and `dataClassification` props.
- Validation (`apps/web/data-views.spec.ts`):
  - Unit tests verifying proper mapping of the model into canvas node properties and edge animation for data flows.
  - Tests successfully passed locally (`pnpm verify`).

## F040 — Ownership views
- **Status**: COMPLETE
- **Commit**: 684ec0f8983014ef6d40c08b5546f19af9369942
- **Evidence**: `pnpm verify` passed. Ownership view projection and badges are implemented correctly.
