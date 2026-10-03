# Current Task: F095 — Architecture portal

**Status**: COMPLETE

## Description
Public architecture portal and explorer viewable without an account (Phase 12 — Documentation):
- Read-only public architecture explorer site:
  - Interactive multi-level C4 hierarchy navigation and drill-down:
    - Level 1: System Context (overall landscape, external actors, systems)
    - Level 2: Container (drill into systems to explore applications, web apps, databases, queues)
    - Level 3: Component (drill into containers to view modular components and internal services)
    - Hierarchical breadcrumbs (`Context / System / Container`) with direct click-to-ascend navigation.
  - Interactive canvas & camera control:
    - Pan, zoom controls (zoom in, zoom out, fit to screen / reset camera).
  - Object selection & inspector drawer:
    - Metadata, technology stack, governance/owner, lifecycle status.
    - Direct inbound callers (upstream dependencies) and outbound dependencies (downstream services/stores).
    - Subcomponents list with click-to-drill down.
    - Connected documentation preview and ADR decision records.
  - Execution flow playback & step exploration:
    - Browse sequence, data, and API flows with step-by-step navigation highlighting active edges and participants.
  - Global full-text search:
    - Search across objects, views, flows, and ADRs with direct focus and drill-down jump targets.
  - View switcher:
    - Switch between Context, Container, Component, and Dynamic views.
  - Anonymous visitor guarantee:
    - Fully functional read-only explorer viewable without an account, session, or login prompt.
- Acceptance criteria:
  - Read-only site: search, zoom, navigate, drill-down, flows, docs, objects, dependencies; no account
  - Test: an anonymous visitor can browse and drill down.

- Feature ID: F095
- Phase: 12 — Documentation
- Dependencies: Phase 03, Phase 04, F052

## Next Feature
- **F096 — Export**
