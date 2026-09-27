# Phase 04 — Diagrams and Views

Status: IN PROGRESS

## Description
Diagrams as saved views over the model, plus dynamic filtered views and persona modes. A view stores a filter + layout, never objects.

## Dependencies
Phase 03

## Features

### F032 — Context diagrams

Status: COMPLETE

Description: Diagram = saved view (L1).

Acceptance Criteria:

- Context diagram type; an object can appear in multiple diagrams
- Deleting from a diagram keeps the object in the model

Test: object in two diagrams; delete from one keeps it in the other.

### F033 — Container diagrams

Status: COMPLETE

Description: Container-level diagram.

Acceptance Criteria:

- Container diagram type as a saved view

Test: container diagram renders from the model.

### F034 — Component diagrams

Status: NOT STARTED

Description: Component-level diagram.

Acceptance Criteria:

- Component diagram type as a saved view

Test: component diagram renders from the model.

### F035 — Dynamic views

Status: NOT STARTED

Description: Live filtered projections.

Acceptance Criteria:

- Filter by team, technology, environment, domain, owner, status, tag, criticality, data-classification, cloud, region, repository
- A view stays live as the model changes

Test: filter by team returns matches; adding a matching object updates the view.

### F036 — Filters

Status: NOT STARTED

Description: Filter builder UI.

Acceptance Criteria:

- Compose multi-attribute filters; save as part of a view

Test: a composed filter resolves to the expected set.

### F037 — Saved views

Status: NOT STARTED

Description: Save + star named views.

Acceptance Criteria:

- Save/star named views (executive, security, payments, AWS, data, production...)

Test: save a view; reopen restores filter + layout.

### F038 — Security views

Status: NOT STARTED

Description: Security overlay.

Acceptance Criteria:

- Overlay trust boundaries, public endpoints, auth, encryption, secrets, PII/PCI/HIPAA/SOC2

Test: security view renders boundaries + flags public endpoints.

### F039 — Data views

Status: NOT STARTED

Description: Data-flow / classification perspective.

Acceptance Criteria:

- Perspective by data classification and data movement

Test: data view highlights classified data + flows.

### F040 — Ownership views

Status: NOT STARTED

Description: Color by team/owner.

Acceptance Criteria:

- Color objects by team/owner; filter by owner

Test: ownership view colors by team correctly.

### F114 — Technology catalog

Status: NOT STARTED

Description: Technology library + tech view.

Acceptance Criteria:

- Library: name, category, version, vendor, lifecycle, security-status, owner, docs
- 'Find systems using unsupported technology'; filter-by-technology view

Test: tag with a tech; query unsupported returns them.

### F115 — Persona modes

Status: NOT STARTED

Description: Same model, different lens.

Acceptance Criteria:

- Modes: architect, developer, security, SRE, data, product, executive, auditor
- A persona re-scopes the render without changing the model

Test: switching persona re-scopes the render.

### F135 — Architecture templates

Status: NOT STARTED

Description: Starter templates.

Acceptance Criteria:

- Templates: SaaS, e-commerce, fintech, healthcare, microservices, monolith, serverless, event-driven, data-platform, Kubernetes, AWS/Azure/GCP
- Instantiate a template into a new architecture

Test: instantiate a template -> expected objects/connections created.

---

## Phase Completion Criteria

This phase is COMPLETE only when:

- Every feature above is COMPLETE with recorded evidence
- All acceptance criteria pass; tests pass (typecheck, lint, unit, integration as applicable)
- No critical blockers remain (BLOCKERS.md)
- Documentation exists; existing functionality still works (no regressions)
- check-architecture is clean (layer boundaries)
- PROJECT_STATE.md, ROADMAP.md, and CHANGELOG.md are updated
