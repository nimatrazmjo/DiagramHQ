# Phase 01 — Foundation

Status: IN PROGRESS

## Description
Tenant-isolated foundation: auth, organizations, workspaces, roles, the database + API foundation, and the application shell. Everything else is built on this.

## Dependencies
None

## Features

### F001 — Project architecture

Status: NOT STARTED

Description: pnpm monorepo scaffold + a clean, reproducible baseline.

Requirements:

- Decide and lock repo shape per architecture/ARCHITECTURE.md

Acceptance Criteria:

- pnpm workspace: apps/web (Next.js App Router), apps/api (NestJS), packages/domain (framework-free), packages/config
- typecheck, lint, and a trivial test pass across the workspace
- init runs green from a clean clone
- CLAUDE.md command table updated with the real install/dev/typecheck/lint/test commands

Files:

- (root) package.json, pnpm-workspace.yaml, tsconfig base
- apps/web, apps/api, packages/domain, packages/config skeletons

Test: init + pnpm typecheck/lint/test green from a clean clone; check-architecture runs.

Notes: This is the current task. See CURRENT_TASK.md.

### F002 — Authentication

Status: NOT STARTED

Description: A single auth provider gates the app.

Dependencies: F001, F006

Requirements:

- Choose Auth.js / Clerk / WorkOS and record the decision (DECISIONS.md)

Acceptance Criteria:

- Login, logout, session handling
- Protected routes redirect when unauthenticated
- No SSO/SCIM (Phase 13)

Test: e2e: unauthenticated request is denied; login establishes a session.

### F003 — Organizations

Status: NOT STARTED

Description: Organization entity, the top of the tenancy tree.

Dependencies: F006

Acceptance Criteria:

- Create an organization; a user belongs to one or more orgs
- All data is scoped to an org

Test: integration: org CRUD; data of another org is not visible.

### F004 — Workspaces

Status: NOT STARTED

Description: Workspace under an organization; contains architectures.

Dependencies: F003

Acceptance Criteria:

- Create a workspace within an org
- A workspace contains architectures
- Scoped to org membership

Test: integration: workspace CRUD scoped to org.

### F005 — User roles

Status: NOT STARTED

Description: Basic role model (owner/editor/viewer here; full RBAC is F104).

Dependencies: F003

Acceptance Criteria:

- Role stored per member
- A basic role check gates writes
- Full role catalog deferred to Phase 13

Test: unit: a viewer cannot write; an editor can.

### F006 — Database foundation

Status: NOT STARTED

Description: Postgres + Prisma + migrations; the model schema with tenant isolation.

Dependencies: F001

Acceptance Criteria:

- Prisma schema: organizations, workspaces, architectures, versions (live + numbered), model_objects, model_connections, tags, technologies, views, view_objects (see architecture/DATA_MODEL.md)
- Migration applies cleanly to a fresh Postgres
- Tenant isolation enforced at the query layer
- Domain invariants live in packages/domain as pure functions

Files:

- packages/domain (types + invariants)
- apps/api (prisma schema + migrations)

Test: migration applies to a fresh Postgres; a test round-trips an entity; a cross-tenant read is denied.

### F007 — API foundation

Status: NOT STARTED

Description: NestJS API skeleton: validation, typed error envelope, health.

Dependencies: F001, F006

Acceptance Criteria:

- API boots; module-per-domain-area structure
- Request validation at the edge; domain invariants in domain
- Typed error envelope { error: { code, message, details } }; no stack traces past the edge
- Health endpoint

Files:

- apps/api

Test: integration: health returns ok; a bad request returns a typed error.

### F008 — Application shell

Status: NOT STARTED

Description: Next.js shell: left navigator, top bar, inspector slot.

Dependencies: F001, F002

Acceptance Criteria:

- Left navigator (Overview, Systems, Apps, Data, Flows, Views, Decisions)
- Top bar (search, AI, user)
- Right inspector slot
- Routing + responsive to phone width

Files:

- apps/web

Test: e2e: shell renders; navigation routes; layout holds at narrow width.

---

## Phase Completion Criteria

This phase is COMPLETE only when:

- Every feature above is COMPLETE with recorded evidence
- All acceptance criteria pass; tests pass (typecheck, lint, unit, integration as applicable)
- No critical blockers remain (BLOCKERS.md)
- Documentation exists; existing functionality still works (no regressions)
- check-architecture is clean (layer boundaries)
- PROJECT_STATE.md, ROADMAP.md, and CHANGELOG.md are updated
