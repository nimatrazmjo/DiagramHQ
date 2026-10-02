# Phase 06 — Collaboration

Status: IN PROGRESS

## Description
Turn the single-player model into a team tool: real-time editing, presence, comments, mentions, share links, permissions, team management, notifications.

## Dependencies
Phase 01

## Features

### F048 — Real-time collaboration

Status: COMPLETE

Description: Live multi-user editing.

Acceptance Criteria:

- Multiple users edit live; conflict resolution (CRDT/OT)

Test: two clients: an edit in one appears in the other.

### F049 — Presence

Status: COMPLETE

Description: Cursors + presence.

Acceptance Criteria:

- Cursors, selection, current-object, presence indicators

Test: presence shows both users + cursors.

### F050 — Comments

Status: COMPLETE

Description: Threaded comments.

Acceptance Criteria:

- Comments on objects, connections, diagrams, flows, docs, changes
- Reply + resolve

Test: comment CRUD + resolve on the right entity.

### F051 — Mentions

Status: COMPLETE

Description: @mentions + tasks.

Dependencies: F050, F116

Acceptance Criteria:

- @mention notifies; convert a comment to a task

Test: a mention creates a notification.

### F052 — Share links

Status: NOT STARTED

Description: Read-only links.

Acceptance Criteria:

- Read-only link preserves viewer position + selection; no account required

Test: anonymous open preserves state.

### F053 — Permissions

Status: NOT STARTED

Description: Full role catalog.

Acceptance Criteria:

- Roles: organization-owner, admin, architect, engineer, reviewer, viewer, guest
- Permission checks on every mutation; engineer scoped to assigned systems

Test: role permission matrix enforced.

### F054 — Team management

Status: NOT STARTED

Description: Teams + ownership.

Acceptance Criteria:

- Teams; object ownership (owner + backup team); 'show everything owned by X'

Test: assign owner; filter by owner returns the set.

### F116 — Notifications

Status: NOT STARTED

Description: Multi-channel notifications.

Acceptance Criteria:

- In-app notifications for changes, comments, mentions, reviews
- Email + Slack + Microsoft Teams channels

Test: an event produces a notification; channel dispatch tested (stub transport).

---

## Phase Completion Criteria

This phase is COMPLETE only when:

- Every feature above is COMPLETE with recorded evidence
- All acceptance criteria pass; tests pass (typecheck, lint, unit, integration as applicable)
- No critical blockers remain (BLOCKERS.md)
- Documentation exists; existing functionality still works (no regressions)
- check-architecture is clean (layer boundaries)
- PROJECT_STATE.md, ROADMAP.md, and CHANGELOG.md are updated
