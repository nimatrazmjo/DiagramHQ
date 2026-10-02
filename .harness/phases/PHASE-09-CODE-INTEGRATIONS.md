# Phase 09 — Code Integrations

Status: IN PROGRESS

## Description
Close the code -> architecture loop: GitHub/GitLab discovery + code mapping, OpenAPI import, repo sync, catalogs, model-as-code + CLI, webhooks, SDK. Every detected object carries evidence.

## Dependencies
Phase 03, Phase 08

## Features

### F072 — GitHub

Status: COMPLETE

Description: Connect + scan repos.

Dependencies: F120

Acceptance Criteria:

- Connect a repo; detect services, APIs, databases, queues, deps, libs, frameworks, cloud SDKs; each with evidence

Test: scan a sample repo -> expected objects proposed with evidence.

### F073 — GitLab

Status: COMPLETE

Description: GitLab parity.

Dependencies: F072

Acceptance Criteria:

- Same detection + mapping for GitLab

Test: scan a sample GitLab repo -> parity with GitHub.

### F074 — Repository discovery

Status: COMPLETE

Description: Enumerate an org's repos.

Acceptance Criteria:

- Discover repos across an org/group; select which to model

Test: discovery lists repos; selection scopes the scan.

### F075 — Code-to-architecture mapping

Status: COMPLETE

Description: Component -> code.

Dependencies: F072

Acceptance Criteria:

- Map component -> repository -> folder -> file; open-in-GitHub

Test: a component links to its repo path.

### F076 — OpenAPI import

Status: COMPLETE

Description: Spec -> API catalog.

Dependencies: F122

Acceptance Criteria:

- Import an OpenAPI spec; endpoints populate the API catalog + link to a service

Test: import a spec -> endpoints in the catalog.

### F077 — Repository synchronization

Status: NOT STARTED

Description: Keep the model fresh.

Dependencies: F072

Acceptance Criteria:

- Re-scan on a schedule / webhook; update the model; feed drift (F084)

Test: a repo change triggers a model refresh.

### F122 — API catalog

Status: NOT STARTED

Description: Discoverable APIs.

Acceptance Criteria:

- Endpoints linked to service + repo; browsable

Test: create/browse API entries linked to objects.

### F123 — Event catalog

Status: NOT STARTED

Description: Events + schemas.

Acceptance Criteria:

- Producer, consumers, schema, topic, frequency

Test: create/browse event entries.

### F124 — Database catalog

Status: NOT STARTED

Description: DB structure.

Acceptance Criteria:

- Database -> schema -> table -> column

Test: create/browse database entries.

### F125 — Model-as-code + CLI

Status: NOT STARTED

Description: YAML + dhq CLI.

Dependencies: F007

Acceptance Criteria:

- YAML maps to objects+connections by slug -> stable id
- CLI: dhq login/init/pull/push/validate/diff/deploy/export/generate; push then pull round-trips

Test: push YAML -> model; pull -> equivalent YAML; validate catches errors.

### F126 — Webhooks

Status: NOT STARTED

Description: Outbound events.

Dependencies: F007

Acceptance Criteria:

- Emit object.*, connection.*, diagram.created, flow.created, architecture.updated, version.created, change.approved, change.merged

Test: an action fires the expected webhook (test sink).

### F127 — SDK

Status: NOT STARTED

Description: TypeScript SDK.

Dependencies: F007

Acceptance Criteria:

- Typed TS SDK over the REST API (Python/Go/Java/C# later)

Test: SDK CRUD round-trip against a test server.

---

## Phase Completion Criteria

This phase is COMPLETE only when:

- Every feature above is COMPLETE with recorded evidence
- All acceptance criteria pass; tests pass (typecheck, lint, unit, integration as applicable)
- No critical blockers remain (BLOCKERS.md)
- Documentation exists; existing functionality still works (no regressions)
- check-architecture is clean (layer boundaries)
- PROJECT_STATE.md, ROADMAP.md, and CHANGELOG.md are updated
