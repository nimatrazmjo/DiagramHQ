# Phase 05 — Flows

Status: IN PROGRESS

## Description
Flows: ordered sequences through existing connections, with playback. A flow is not a static line.

## Dependencies
Phase 03, Phase 04

## Features

### F041 — Flow model

Status: COMPLETE

Description: Ordered sequence of connections.

Acceptance Criteria:

- A flow is an ordered list of existing connections
- Flow persists independently of diagrams

Test: build a flow from connections; an invalid step is rejected.

### F042 — Flow steps

Status: NOT STARTED

Description: Ordered, annotated steps.

Acceptance Criteria:

- Add/reorder/annotate steps; each step references a connection

Test: steps stay ordered; notes persist.

### F043 — Flow visualization

Status: NOT STARTED

Description: Render the flow over the model.

Acceptance Criteria:

- Highlight the flow path over the existing architecture

Test: flow path renders over the model.

### F044 — Flow playback

Status: NOT STARTED

Description: Animated playback.

Acceptance Criteria:

- Controls: play, pause, next, previous, speed, restart
- Animates steps in order

Test: playback advances step index; controls work.

### F045 — User journeys

Status: NOT STARTED

Description: Flow type.

Acceptance Criteria:

- User-journey flow type

Test: a user-journey flow plays back.

### F046 — Data flows

Status: NOT STARTED

Description: Flow type (seeds lineage).

Acceptance Criteria:

- Data-flow type; feeds data lineage (F091)

Test: a data flow plays back.

### F047 — API flows

Status: NOT STARTED

Description: Flow type.

Acceptance Criteria:

- API-request flow type; export to Mermaid/PlantUML

Test: an API flow exports to Mermaid.

---

## Phase Completion Criteria

This phase is COMPLETE only when:

- Every feature above is COMPLETE with recorded evidence
- All acceptance criteria pass; tests pass (typecheck, lint, unit, integration as applicable)
- No critical blockers remain (BLOCKERS.md)
- Documentation exists; existing functionality still works (no regressions)
- check-architecture is clean (layer boundaries)
- PROJECT_STATE.md, ROADMAP.md, and CHANGELOG.md are updated
