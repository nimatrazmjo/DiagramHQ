# Phase 03 — Architecture Model

Status: IN PROGRESS

## Description
The model-first core: C4 objects, the extensible object-type catalog, first-class connections, metadata, and lifecycle. The model is authoritative; diagrams (Phase 04) are projections of it (DEC-001 / ADR-0001).

## Dependencies
Phase 01, Phase 02

## Features

### F018 — Architecture model

Status: COMPLETE

Description: The model entity: objects + connections persisted independently of any diagram.

Dependencies: F006

Acceptance Criteria:

- Architecture holds objects + connections independent of diagrams
- CRUD via API; save/load; reload yields an identical model
- Optimistic writes with rollback on error

Files:

- packages/domain
- apps/api
- apps/web

Test: create -> reload -> identical model; a simulated API error rolls back.

Notes: This is the heart of the product. Never store objects inside a diagram (DEC-001).

### F019 — C4 Context

Status: COMPLETE

Description: Level 1: person/actor/system/external-system and their relationships.

Dependencies: F018, F009

Requirements:

- Create person, system, external system
- Connect and edit
- Drill-down toward containers

Acceptance Criteria:

- User can create a Person, a System, and an External System
- User can connect Person -> System
- Objects persist after reload; render correctly; can be edited and deleted
- Drill from a system to its containers
- Tests exist; no regression

Files:

- apps/web/.../architecture
- apps/api

Test: create person+system, connect, reload persists, drill to container.

### F020 — C4 Container

Status: COMPLETE

Description: Level 2: containers inside a system.

Dependencies: F019

Acceptance Criteria:

- Create containers (apps/services/stores/queues) inside a system
- Drill from a system into its container view

Test: containers render under a system; drill works.

### F021 — C4 Component

Status: COMPLETE

Description: Level 3 (+ L4 code stub).

Dependencies: F020

Acceptance Criteria:

- Create components inside a container
- Drill from a container into its components; L4 code mapping is a stub here (real in Phase 09)

Test: components render under a container; drill works.

### F022 — Person

Status: COMPLETE

Description: Object type: person.

Acceptance Criteria:

- Create/edit/delete/render a person

Test: person CRUD + render.

### F023 — System

Status: COMPLETE

Description: Object type: system.

Acceptance Criteria:

- Create/edit/delete/render a system; internal vs external

Test: system CRUD + render.

### F024 — Application

Status: COMPLETE

Description: Object type: application/service.

Acceptance Criteria:

- Create/edit/delete/render an application or service

Test: application CRUD + render.

### F025 — Component

Status: COMPLETE

Description: Object type: component.

Acceptance Criteria:

- Create/edit/delete/render a component

Test: component CRUD + render.

### F026 — Database

Status: COMPLETE

Description: Object type: store/database.

Acceptance Criteria:

- Create/edit/delete/render a database/store

Test: database CRUD + render.

### F027 — Queue

Status: COMPLETE

Description: Object type: queue/topic.

Acceptance Criteria:

- Create/edit/delete/render a queue or topic

Test: queue CRUD + render.

### F028 — Group

Status: COMPLETE

Description: Object type: group/boundary + nesting.

Acceptance Criteria:

- Group/ungroup; nesting via parent_id; cycle prevention (no group contains its ancestor)

Test: group/ungroup; a nesting cycle is rejected.

### F029 — Connections

Status: COMPLETE

Description: First-class connections with rich properties.

Dependencies: F018

Acceptance Criteria:

- Connection is an entity with source/dest/protocol/technology/direction/data-type/auth/encryption/status/owner/tags/api/port/frequency/latency/error-behavior
- Connection types: HTTP, HTTPS, REST, GraphQL, gRPC, WebSocket, TCP, UDP, Kafka, Event, Queue, Database, File, Internal, External
- Source and target validated to exist in the same architecture + version

Files:

- apps/api
- packages/domain

Test: integration: create a connection with properties; an invalid endpoint is rejected.

### F030 — Object metadata

Status: NOT STARTED

Description: The inspector + the full metadata set.

Dependencies: F019

Acceptance Criteria:

- Inspector shows/edits: name, description, caption, type, owner, team, technology, status, environment, domain, tags, links, repository, documentation, criticality, data-classification, compliance, cost-center, SLA, RTO, RPO, version, created, updated
- Edits persist via the object API and reflect on canvas
- Inspector sections come from the object-type registry

Files:

- apps/web/.../inspector

Test: edit a field; it persists and reflects on canvas.

### F031 — Object lifecycle

Status: NOT STARTED

Description: Lifecycle states.

Dependencies: F030

Acceptance Criteria:

- States: future -> live -> deprecated -> removed
- Transitions recorded; lifecycle visible on the object and filterable

Test: a lifecycle transition is recorded and shown.

### F112 — Object type catalog

Status: NOT STARTED

Description: The full extensible object-type registry.

Dependencies: F018

Acceptance Criteria:

- Registry seeded with: person, actor, system, external-system, application, service, component, database, cache, queue, topic, bucket, api, function, server, container, k8s-workload, cloud-resource, load-balancer, gateway, group, boundary
- Each type declares icon, allowed parents, allowed connection kinds, metadata schema, inspector section
- Adding a new type is a registration, not a core edit (MODULES.md §1)

Files:

- packages/domain
- apps/web

Test: unit: each built-in type registered; a new type added via the registry appears with no core change.

### F113 — Domains / bounded contexts

Status: NOT STARTED

Description: DDD domains group objects.

Acceptance Criteria:

- Create domains; nest domains; assign objects to a domain
- Filter by domain

Test: assign an object to a domain; filter returns it.

---

## Phase Completion Criteria

This phase is COMPLETE only when:

- Every feature above is COMPLETE with recorded evidence
- All acceptance criteria pass; tests pass (typecheck, lint, unit, integration as applicable)
- No critical blockers remain (BLOCKERS.md)
- Documentation exists; existing functionality still works (no regressions)
- check-architecture is clean (layer boundaries)
- PROJECT_STATE.md, ROADMAP.md, and CHANGELOG.md are updated
