# Phase 07 — Versioning

Status: IN PROGRESS

## Description
Git-like history for architecture: snapshots, branches, diff, changes, pull requests, merge, plus ADRs, scenarios and roadmap items.

## Dependencies
Phase 03, Phase 06

## Features

### F055 — Version history

Status: COMPLETE

Description: Live + numbered versions.

Acceptance Criteria:

- Live editable version + immutable numbered snapshots

Test: snapshot stays immutable while live edits continue.

### F056 — Architecture snapshots

Status: COMPLETE

Description: Full-state capture.

Acceptance Criteria:

- A snapshot captures objects, connections, views, flows, metadata, documentation

Test: a snapshot restores to the captured state.

### F057 — Branches

Status: COMPLETE

Description: Branch off main.

Acceptance Criteria:

- Create branches carrying objects/connections/views/flows/metadata/ADRs/comments

Test: a branch is independent of main.

### F058 — Architecture diff

Status: NOT STARTED

Description: Visual diff.

Acceptance Criteria:

- Diff two versions: added/modified/removed/moved with colors

Test: diff matches seeded changes.

### F059 — Architecture changes

Status: NOT STARTED

Description: Change set.

Acceptance Criteria:

- A change lists added/modified/removed + affected counts (objects, flows, teams)

Test: a change reports the correct affected sets.

### F060 — Pull requests

Status: NOT STARTED

Description: Reviewable architecture PRs.

Acceptance Criteria:

- Titled PR with diff, risk, affected systems; review/comment/approve/reject

Test: a PR shows the correct diff and can be reviewed.

### F061 — Merge

Status: NOT STARTED

Description: Merge with conflict detection.

Acceptance Criteria:

- Merge a branch onto main; conflict detection on the same object id

Test: merge applies to main; a conflict is detected.

### F117 — ADR system

Status: NOT STARTED

Description: Decision records (non-AI).

Acceptance Criteria:

- ADR: title, status, context, decision, consequences, alternatives
- Attach to objects/connections/changes/versions; history on an object

Test: create an ADR, link it, see it in history.

### F118 — Scenarios

Status: NOT STARTED

Description: Hypothetical comparisons.

Acceptance Criteria:

- Current vs proposed scenarios without touching the real model

Test: create a scenario; compare without mutating main.

### F119 — Roadmap items

Status: NOT STARTED

Description: Roadmap linked to changes.

Acceptance Criteria:

- Roadmap items (Q1/Q2/...) linked to architecture changes

Test: a roadmap item links to a change.

---

## Phase Completion Criteria

This phase is COMPLETE only when:

- Every feature above is COMPLETE with recorded evidence
- All acceptance criteria pass; tests pass (typecheck, lint, unit, integration as applicable)
- No critical blockers remain (BLOCKERS.md)
- Documentation exists; existing functionality still works (no regressions)
- check-architecture is clean (layer boundaries)
- PROJECT_STATE.md, ROADMAP.md, and CHANGELOG.md are updated
