# Feature Matrix

Phase overview. `../state/feature_list.json` is the authoritative master checklist — 83 tracked features across 6 phases, each with acceptance criteria, a specific test, a spec-section reference, and an evidence slot. This file is the map; the JSON is the territory.

Six phases, **gated**: each phase is fully implemented AND tested (its `testGate`) before the next begins. Phases build in order because every later phase renders into the Phase-1 model + canvas.

| Phase | Name | Headline capabilities | Features |
|---|---|---|---|
| **P1** | Core product | Tenant-isolated versioned model; C4 objects + full type catalog; first-class connections; infinite canvas + interactions; diagrams-as-views; C4 drill-down; metadata inspector + lifecycle; search; save/load; undo/redo; auto-layout; export | 21 |
| **P2** | Collaboration | Users, teams, roles/permissions (RBAC); comments; mentions; real-time editing + presence; share links; version history + snapshots; notifications | 8 |
| **P3** | Architecture intelligence | Dynamic views + personas; flows + playback; domains; technology catalog; ADRs; dependency graph; circular-dep / SPOF / blast-radius; impact analysis; failure simulation; security view + data classification; data lineage; rules + linting; health + analytics; API/event/db catalogs; branches/PRs/diff; scenarios/roadmap; templates; documentation | 21 |
| **P4** | AI | Grounded Copilot; AI command set; NL generation; NL editing (proposed changes); AI evidence + confidence; AI documentation; review agent; AI analysis; MCP tool server; specialized agents | 10 |
| **P5** | Code & infrastructure intelligence | GitHub/GitLab; OpenAPI; Terraform; Kubernetes; AWS/Azure/GCP import (with evidence); code mapping; drift detection; cost; model-as-code + `dhq` CLI; webhooks; SDK; public portal | 13 |
| **P6** | Enterprise | SSO; SCIM; advanced RBAC + org policies; audit log; compliance packs; governance; private deployment; billing; marketplace; mobile | 10 |

## The differentiators (why this beats a generic diagram tool)
The rows that justify the product, spread across the phases above: model-first reuse (P1), evidence-backed generation and code mapping (P4/P5), architecture drift (P5), architecture PRs + AI review (P3/P4), failure simulation + blast radius (P3), data lineage + security view (P3), impact analysis (P3), and the MCP surface that makes the model agent-editable (P4). If a feature does not serve one of these, it is table stakes and lower priority within its phase.

## The killer product loop (the north star)
```
CODE -> DISCOVER -> ARCHITECTURE MODEL -> { DIAGRAMS | FLOWS | DOCS }
     -> AI COPILOT -> { ANALYZE | PROPOSE | REVIEW } -> ARCHITECTURE CHANGE
     -> APPROVAL -> MERGE -> CODE -> PRODUCTION -> DRIFT DETECTION -> (back to model)
```
P1–P3 build the model and make it useful; P4 adds the AI reasoning layer; P5 closes the loop with code, infra, and drift; P6 makes it enterprise-safe. That loop, not prettier diagrams, is the bet.
