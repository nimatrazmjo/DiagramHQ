# Phase 11 — Drift and Governance

Status: IN PROGRESS

## Description
Make the model trustworthy: drift detection, linting, rules, dependency + blast-radius analysis, failure simulation, security architecture, data lineage, health.

## Dependencies
Phase 03, Phase 09, Phase 10

## Features

### F084 — Architecture drift

Status: COMPLETE

Description: Documented vs actual.

Dependencies: F072, F057

Acceptance Criteria:

- Compare documented vs imported/actual; surface the delta
- Actions: Update Model / Ignore / Create Change Request

Test: seeded drift detected; create-change-request produces a PR.

### F085 — Architecture linting

Status: COMPLETE

Description: Lint the model.

Acceptance Criteria:

- Findings at error/warning/info against the rules

Test: seeded violations produce expected lint findings; a clean model is clean.

### F086 — Architecture rules

Status: NOT STARTED

Description: Org-defined rules.

Acceptance Criteria:

- Rules: owner required, external API auth, no cross-service DB access, PII flow restrictions

Test: a rule fires on a violating model.

### F087 — Dependency analysis

Status: NOT STARTED

Description: Dependency graph.

Acceptance Criteria:

- Dedicated graph; filters: direct/indirect/runtime/compile-time/data/external

Test: graph renders; filters narrow correctly.

### F088 — Blast-radius analysis

Status: NOT STARTED

Description: Impact of a node.

Dependencies: F087

Acceptance Criteria:

- Counts: services, flows, databases, teams, customer-facing features

Test: blast-radius counts are correct.

### F089 — Failure simulation

Status: NOT STARTED

Description: Simulate outages.

Dependencies: F088

Acceptance Criteria:

- Mark an object down; highlight the blast radius with severity; distinguish fallback vs no-fallback

Test: simulate a DB outage; downstream flagged; fallbacks distinguished.

### F090 — Security architecture

Status: NOT STARTED

Description: Deep security model.

Acceptance Criteria:

- Trust boundaries, public endpoints, auth/authz, encryption, secrets, PII/PCI/HIPAA, compliance zones

Test: security model renders boundaries + flags exposures.

### F091 — Data lineage

Status: NOT STARTED

Description: Trace data.

Dependencies: F046, F090

Acceptance Criteria:

- Trace a data element across objects/flows; 'where does <data> leave our infrastructure?'

Test: lineage returns the ordered path incl. the external exit.

### F129 — Architecture health

Status: NOT STARTED

Description: Scorecard + analytics.

Dependencies: F085

Acceptance Criteria:

- Categorized health (dependencies, documentation, security, ownership, drift) with findings
- Analytics counts + change analytics

Test: health computed on a sample matches seeded gaps.

### F130 — Circular + SPOF detection

Status: NOT STARTED

Description: Structural risks.

Dependencies: F087

Acceptance Criteria:

- Detect circular dependencies; detect single points of failure

Test: seeded cycle detected; SPOF flagged on a fan-in.

---

## Phase Completion Criteria

This phase is COMPLETE only when:

- Every feature above is COMPLETE with recorded evidence
- All acceptance criteria pass; tests pass (typecheck, lint, unit, integration as applicable)
- No critical blockers remain (BLOCKERS.md)
- Documentation exists; existing functionality still works (no regressions)
- check-architecture is clean (layer boundaries)
- PROJECT_STATE.md, ROADMAP.md, and CHANGELOG.md are updated
