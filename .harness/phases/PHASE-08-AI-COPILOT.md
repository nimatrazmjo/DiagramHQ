# Phase 08 — AI Copilot

Status: IN PROGRESS

## Description
AI as a first-class surface: grounded Copilot, generation, NL editing (with evidence), explanation, analysis, documentation, review, ADR generation, MCP, and specialized agents. Every AI mutation is a proposed change a human approves.

## Dependencies
Phase 03, Phase 04, Phase 05, Phase 07

## Features

### F062 — AI chat

Status: COMPLETE

Description: Grounded Copilot panel.

Acceptance Criteria:

- Persistent panel; grounded Q&A over the model; answers cite object ids

Test: 'why does X depend on Y' cites the real connection.

### F063 — Architecture generation

Status: COMPLETE

Description: NL -> model.

Acceptance Criteria:

- NL prompt -> objects/connections/descriptions/technologies/tags/flows/diagrams/docs as a proposed changeset

Test: a prompt yields a valid model on apply.

### F064 — Natural-language editing

Status: COMPLETE

Description: NL edits as proposals.

Acceptance Criteria:

- NL edit -> explicit added/modified/removed with Apply/Reject; never silent

Test: 'add Redis between A and B' proposes exactly that; Reject changes nothing.

### F065 — Architecture explanation

Status: COMPLETE

Description: Explain to an audience.

Acceptance Criteria:

- Explain a system/flow/decision at a chosen altitude (engineer -> CTO)

Test: explanation references real objects.

### F066 — Impact analysis

Status: COMPLETE

Description: AI over impact.

Dependencies: F087

Acceptance Criteria:

- Select an object -> direct/indirect deps, affected flows/teams/APIs, critical paths, narrated

Test: AI impact matches the computed set.

### F067 — Security analysis

Status: COMPLETE

Description: AI security review.

Dependencies: F090

Acceptance Criteria:

- Find PII paths, public endpoints, missing auth; narrate risks

Test: AI security findings match seeded issues.

### F068 — AI documentation

Status: COMPLETE

Description: Generate docs.

Dependencies: F092

Acceptance Criteria:

- Auto-generate object/architecture docs grounded in metadata + connections; keep current on change

Test: generated docs are grounded, not invented.

### F069 — AI architecture review

Status: COMPLETE

Description: Review agent.

Dependencies: F060, F085

Acceptance Criteria:

- Pre-merge checklist: no circular dep, owners present, no unapproved external dep, backup/DR, no PII to third parties
- Request-changes verdict

Test: seeded violations produce the expected verdict.

### F070 — ADR generation

Status: NOT STARTED

Description: AI-drafted ADRs.

Dependencies: F117

Acceptance Criteria:

- Draft an ADR from a change; human edits + accepts

Test: a generated ADR links to the change.

### F071 — MCP integration

Status: NOT STARTED

Description: MCP tool server.

Acceptance Criteria:

- Tools: search_architecture, get_object, create_object, update_object, delete_object, get_dependencies, get_dependents, analyze_impact, create_diagram, create_flow, compare_versions, create_change, review_change, create_adr
- Mutating tools return a proposal, never a silent commit

Test: each tool callable; create_object returns a proposal.

### F120 — AI evidence + confidence

Status: NOT STARTED

Description: Grounding on every claim.

Acceptance Criteria:

- Every AI assertion/edit carries evidence (repo/file/line where applicable) + a confidence score

Test: a generated dependency includes evidence; low confidence flagged.

### F121 — Specialized agents

Status: NOT STARTED

Description: Role agents on MCP.

Dependencies: F071

Acceptance Criteria:

- Analyst, Designer, Security, Cloud, Documentation, Migration, Code agents on the MCP surface

Test: each agent completes a scoped task.

---

## Phase Completion Criteria

This phase is COMPLETE only when:

- Every feature above is COMPLETE with recorded evidence
- All acceptance criteria pass; tests pass (typecheck, lint, unit, integration as applicable)
- No critical blockers remain (BLOCKERS.md)
- Documentation exists; existing functionality still works (no regressions)
- check-architecture is clean (layer boundaries)
- PROJECT_STATE.md, ROADMAP.md, and CHANGELOG.md are updated
