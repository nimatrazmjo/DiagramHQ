# DiagramHQ — Product Roadmap

Single source of truth for scope and status (Markdown-first). Each feature has a permanent ID (F###) that never changes meaning. Detailed acceptance criteria live in the phase files under `phases/`.

Legend: `[ ]` Not Started · `[~]` In Progress / In Review · `[x]` Complete · `[!]` Blocked

Statuses (use ONLY these): NOT STARTED · IN PROGRESS · BLOCKED · IN REVIEW · COMPLETE · DEPRECATED

---

## Progress

_Computed from this file. Update on every status change. Contract for an auto-counter: `scripts/SCRIPTS.md` -> progress-counter._

- Total features: **135**
- Complete: 103
- In Progress: 0
- In Review: 0
- Blocked: 0
- Not Started: 32
- **Progress: 76.3%**


Feature IDs are permanent. Never reuse or repurpose an ID. Split a large feature into new IDs (e.g. F018 -> F018 + F135) and keep the history. F001–F108 follow the reference roadmap; F109+ cover master-spec items not in the reference list.

---

# Phase 01 — Foundation

Status: COMPLETE  ·  Depends on: None  ·  File: `phases/PHASE-01-FOUNDATION.md`

## Features

- [x] F001 — Project architecture
- [x] F002 — Authentication
- [x] F003 — Organizations
- [x] F004 — Workspaces
- [x] F005 — User roles
- [x] F006 — Database foundation
- [x] F007 — API foundation
- [x] F008 — Application shell

---

# Phase 02 — Canvas

Status: IN PROGRESS  ·  Depends on: Phase 01  ·  File: `phases/PHASE-02-CANVAS.md`

## Features

- [x] F009 — Infinite canvas
- [x] F010 — Pan and zoom
- [x] F011 — Object selection
- [x] F012 — Drag and drop
- [x] F013 — Multi-select
- [x] F014 — Alignment
- [x] F015 — Auto-layout
- [x] F016 — Undo/redo
- [x] F017 — Minimap
- [ ] F109 — Command palette
- [ ] F110 — Global search
- [ ] F111 — Keyboard shortcuts

---

# Phase 03 — Architecture Model

Status: IN PROGRESS  ·  Depends on: Phase 01, Phase 02  ·  File: `phases/PHASE-03-ARCHITECTURE-MODEL.md`

## Features

- [x] F018 — Architecture model
- [x] F019 — C4 Context
- [x] F020 — C4 Container
- [x] F021 — C4 Component
- [x] F022 — Person
- [x] F023 — System
- [x] F024 — Application
- [x] F025 — Component
- [x] F026 — Database
- [x] F027 — Queue
- [x] F028 — Group
- [x] F029 — Connections
- [x] F030 — Object metadata
- [x] F031 — Object lifecycle
- [ ] F112 — Object type catalog
- [ ] F113 — Domains / bounded contexts

---

# Phase 04 — Diagrams and Views

Status: IN PROGRESS  ·  Depends on: Phase 03  ·  File: `phases/PHASE-04-DIAGRAMS-AND-VIEWS.md`

## Features

- [x] F032 — Context diagrams
- [x] F033 — Container diagrams
- [x] F034 — Component diagrams
- [x] F035 — Dynamic views
- [x] F036 — Filters
- [x] F037 — Saved views
- [x] F038 — Security views
- [x] F039 — Data views
- [x] F040 — Ownership views
- [x] F114 — Technology catalog
- [x] F115 — Persona modes
- [x] F135 — Architecture templates

---

# Phase 05 — Flows

Status: COMPLETE  ·  Depends on: Phase 03, Phase 04  ·  File: `phases/PHASE-05-FLOWS.md`

## Features

- [x] F041 — Flow model
- [x] F042 — Flow steps
- [x] F043 — Flow visualization
- [x] F044 — Flow playback

- [x] F045 — User journeys
- [x] F046 — Data flows
- [x] F047 — API flows

---

# Phase 06 — Collaboration

Status: COMPLETE  ·  Depends on: Phase 01  ·  File: `phases/PHASE-06-COLLABORATION.md`

## Features

- [x] F048 — Real-time collaboration
- [x] F049 — Presence
- [x] F050 — Comments
- [x] F051 — Mentions
- [x] F052 — Share links
- [x] F053 — Permissions
- [x] F054 — Team management
- [x] F116 — Notifications

---

# Phase 07 — Versioning

Status: COMPLETE  ·  Depends on: Phase 03, Phase 06  ·  File: `phases/PHASE-07-VERSIONING.md`

## Features

- [x] F055 — Version history
- [x] F056 — Architecture snapshots
- [x] F057 — Branches
- [x] F058 — Architecture diff
- [x] F059 — Architecture changes
- [x] F060 — Pull requests
- [x] F061 — Merge
- [x] F117 — ADR system
- [x] F118 — Scenarios
- [x] F119 — Roadmap items

---

# Phase 08 — AI Copilot

Status: COMPLETE  ·  Depends on: Phase 03, Phase 04, Phase 05, Phase 07  ·  File: `phases/PHASE-08-AI-COPILOT.md`

## Features

- [x] F062 — AI chat
- [x] F063 — Architecture generation
- [x] F064 — Natural-language editing
- [x] F065 — Architecture explanation
- [x] F066 — Impact analysis
- [x] F067 — Security analysis
- [x] F068 — AI documentation
- [x] F069 — AI architecture review
- [x] F070 — ADR generation
- [x] F071 — MCP integration
- [x] F120 — AI evidence + confidence
- [x] F121 — Specialized agents

---

# Phase 09 — Code Integrations

Status: COMPLETE  ·  Depends on: Phase 03, Phase 08  ·  File: `phases/PHASE-09-CODE-INTEGRATIONS.md`

## Features

- [x] F072 — GitHub
- [x] F073 — GitLab
- [x] F074 — Repository discovery
- [x] F075 — Code-to-architecture mapping
- [x] F076 — OpenAPI import
- [x] F077 — Repository synchronization
- [x] F122 — API catalog
- [x] F123 — Event catalog
- [x] F124 — Database catalog
- [x] F125 — Model-as-code + CLI
- [x] F126 — Webhooks
- [x] F127 — SDK

---

# Phase 10 — Infrastructure Integrations

Status: COMPLETE  ·  Depends on: Phase 03, Phase 09  ·  File: `phases/PHASE-10-INFRASTRUCTURE-INTEGRATIONS.md`

## Features

- [x] F078 — AWS
- [x] F079 — Azure
- [x] F080 — GCP
- [x] F081 — Terraform
- [x] F082 — Kubernetes
- [x] F083 — Cloud resource discovery
- [x] F128 — Cost visualization

---

# Phase 11 — Drift and Governance

Status: IN PROGRESS  ·  Depends on: Phase 03, Phase 09, Phase 10  ·  File: `phases/PHASE-11-DRIFT-AND-GOVERNANCE.md`

## Features

- [x] F084 — Architecture drift
- [x] F085 — Architecture linting
- [x] F086 — Architecture rules
- [x] F087 — Dependency analysis
- [x] F088 — Blast-radius analysis
- [x] F089 — Failure simulation
- [ ] F090 — Security architecture

- [ ] F091 — Data lineage
- [ ] F129 — Architecture health
- [ ] F130 — Circular + SPOF detection

---

# Phase 12 — Documentation

Status: NOT STARTED  ·  Depends on: Phase 03, Phase 04  ·  File: `phases/PHASE-12-DOCUMENTATION.md`

## Features

- [ ] F092 — Architecture documentation
- [ ] F093 — Markdown editor
- [ ] F094 — Public documentation
- [ ] F095 — Architecture portal
- [ ] F096 — Export
- [ ] F097 — Mermaid
- [ ] F098 — PlantUML
- [ ] F099 — PDF
- [ ] F100 — SVG

---

# Phase 13 — Enterprise

Status: NOT STARTED  ·  Depends on: Phase 01, Phase 06, Phase 11  ·  File: `phases/PHASE-13-ENTERPRISE.md`

## Features

- [ ] F101 — SSO
- [ ] F102 — SAML
- [ ] F103 — SCIM
- [ ] F104 — Advanced RBAC
- [ ] F105 — Audit logs
- [ ] F106 — Organization policies
- [ ] F107 — Enterprise security
- [ ] F108 — Private deployment
- [ ] F131 — Compliance packs
- [ ] F132 — Billing & plans
- [ ] F133 — Marketplace
- [ ] F134 — Mobile

---
