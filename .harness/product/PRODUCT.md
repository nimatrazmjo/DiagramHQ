# DiagramHQ — Product Specification

> The living architecture platform for modern engineering teams.
> From code to architecture in minutes. From architecture to decisions in seconds.

## 1. Thesis

Most "architecture" tools are drawing tools. You draw boxes, they rot, and six months later the diagram lies. DiagramHQ inverts that: the **architecture model** is the product. Objects (systems, apps, stores, components, actors) exist independently of any diagram and are reused across many views. A diagram is a saved query over the model, not a source of truth.

This is the same core decision IcePanel made (model-first, not diagram-first) and the reason it beats generic tools. DiagramHQ takes it further: the model is **agent-readable and agent-editable**, kept in sync with real code and infrastructure, and versioned like source.

We are not cloning IcePanel's UI. We are building the same category — an "Architecture OS" — with our own identity: model at the center, AI native, code and cloud connected, changes reviewed like pull requests.

## 2. Who it is for

See `PERSONAS.md`. In short: staff/principal engineers and architects who own system design; platform teams fighting architecture drift; eng leaders who need to explain systems to non-engineers; and security/compliance who need to trace data flows. Secondary: any developer who wants to understand a system fast.

## 3. The core model (the one decision everything hangs on)

```
Organization
 └── Workspace
      └── Architecture Model
           ├── Objects: Systems, Applications, Stores(DBs), Components, Actors, Groups
           ├── Connections (typed, directional, with metadata)
           ├── Tags, Technologies
           ├── Views      (filtered projections onto objects)
           ├── Flows      (ordered paths through connections)
           ├── Decisions  (ADRs linked to objects)
           ├── Environments, Phases (current/future), Versions/Branches
           └── Members
```

Rules that fall out of this:
- One object, many views. Deleting an object from a view never deletes the object.
- A connection is a first-class object with its own metadata, not a line on a canvas.
- Views, flows, and diagrams are **projections**. They store selection + layout, never the objects themselves.
- Everything is addressable by stable id, so AI, API, and code-as-model all point at the same entities.

Data-layer detail: `../architecture/DATA_MODEL.md`.

## 4. C4 as the modeling backbone

DiagramHQ is organized around the C4 model, extended to a code level:

- **Level 0 — Landscape.** The whole company/platform and its external systems.
- **Level 1 — System Context.** One system and the actors and external systems around it.
- **Level 2 — Container.** Apps, services, stores, queues inside a system.
- **Level 3 — Component.** The pieces inside a container (controllers, services, repositories).
- **Level 4 — Code (our extension).** Components map down to repository -> folder -> file -> class -> function, generated from real code rather than hand-drawn.

Drilling a level is navigation over the same model, not opening a different file.

## 5. Flagship capabilities

These are the features that make DiagramHQ worth switching to. Grouped, with the intent behind each. The exhaustive checklist is `../ROADMAP.md` (+ per-feature detail in `../phases/`).

### 5.1 Generate Architecture (onboarding wow)
Point DiagramHQ at a GitHub org (later: GitLab, cloud accounts). An agent reads repos, package manifests, Dockerfiles, Kubernetes manifests, Terraform/CloudFormation, OpenAPI/GraphQL specs, env vars, CI/CD, and dependency graphs, then produces a first-draft model: systems, services, stores, and connections. **Every generated node and edge carries evidence** (repo/file/line) so a human can trust or reject it. This is the difference between a toy and a tool.

### 5.2 Architecture Copilot (AI is a first-class surface, not a chatbot)
A right-side panel that answers questions grounded in the model: "Why does checkout depend on Redis?", "What breaks if Stripe is down?", "Show every path customer PII takes to a third party.", "Find single points of failure.", "Explain this to a CTO.", "Propose a scalable version." AI actions are verbs over the model: Analyze, Explain, Generate, Validate, Compare, Refactor, Simulate, Document, Search, Update, Review. Every AI mutation is a proposed change a human approves, never a silent edit.

### 5.3 Natural-language generation
"Build a multi-tenant analytics SaaS on Next.js, Node, PostgreSQL, Redis, Kafka, AWS." DiagramHQ generates the model, C4 diagrams, connections, technology metadata, data flows, a deployment view, draft ADRs, and starter documentation. This is the fastest path from idea to a structured model.

### 5.4 Dynamic views (not hundreds of diagrams)
One model, many filtered perspectives: Security view, Data view, Payments view, Ownership view (color by team), Technology view (filter by stack). A view is a stored filter + layout, so it stays live as the model changes. This is the antidote to the "50 stale diagrams in Confluence" problem.

### 5.5 Metadata system
Every object carries: name, description, type, owner, team, status, environment, technology, repository URL, docs URL, criticality, data classification, cost center, compliance, tags, deployment, version, created/updated. Metadata drives views, filters, impact analysis, and governance.

### 5.6 Flows with playback
Instead of redrawing sequence diagrams, select an ordered path (Customer -> Web -> API -> Order -> Payment -> Stripe) and press Play. DiagramHQ animates the request step by step over the existing model, and exports to Mermaid/PlantUML.

### 5.7 Current vs. future architecture
Model the current state, fork a proposed future state, diff them side by side (Monolith -> {Order, Payment, Inventory} services), collect feedback, and merge. The workflow is Fork -> Discuss -> Approve -> Merge, deliberately Git-shaped.

### 5.8 Git for architecture
Branches (`main`, `feature/payment-service`, `migration/kafka`, `experiment/serverless`), each carrying objects, connections, views, flows, metadata, ADRs, comments. Then **Architecture Pull Requests**: a titled, reviewable change ("Extract payment service") showing added/removed objects and connections, a risk level, affected systems, and an AI review that flags likely breakage (e.g. "Admin Portal reads User DB directly; moving auth may break it"). Approve and merge. This turns architecture into an engineering workflow instead of a slide.

### 5.9 Architecture Decision Records
Any significant change can spawn an ADR (status, context, decision, consequences) linked to the objects it affects. Clicking an object shows its decision history.

### 5.10 Infrastructure sync + Architecture Drift
Connect GitHub/GitLab, AWS/Azure/GCP, Terraform/Pulumi, Kubernetes/Helm, OpenAPI/GraphQL, databases. DiagramHQ keeps the model in sync and **detects drift**: documented says `API -> PostgreSQL`, production shows `API -> Redis -> Kafka -> PostgreSQL`. It surfaces the delta with actions: Update Architecture / Ignore / Open Architecture PR. Drift detection is the reason teams keep using the product after onboarding.

### 5.11 Security view + Impact analysis + Failure simulation
- **Security mode** overlays trust boundaries, auth, PII, secrets, public endpoints, compliance zones, and answers "show all paths PII reaches third parties."
- **Impact analysis**: select an object -> direct/indirect dependencies, affected teams, flows, APIs, databases, and critical paths.
- **Failure simulation**: mark a store "down" and DiagramHQ colors the blast radius, counts dependent requests/flows, notes which have fallbacks, and recommends mitigations.

The through-line: don't just make diagrams prettier, make them useful for engineering decisions.

## 6. Experience

### 6.1 Editor shell
Clean three-pane shell: left navigator (Overview, Systems, Apps, Data, Flows, Views, Decisions), center infinite canvas, right inspector (object detail). A bottom bar switches level/view: Context | Container | Component | Flow | Security. Visual language: whitespace, subtle borders, rounded cards, restrained color, strong typography, smooth zoom/pan, minimal chrome. Not a BPMN/UML editor.

### 6.2 Canvas interactions
Infinite zoom/pan, multi-select, drag, snap, align, group, nest, connection routing, minimap, focus mode, fullscreen, undo/redo, copy/paste/duplicate, lock/hide/pin, collapse/expand, breadcrumbs. Double-click drills into an object; wheel zooms; Shift-click multi-selects; Space pans; `/` opens the command palette; Cmd+K searches everything.

### 6.3 Command palette (Cmd+K)
Create system/app/database/connection; Generate architecture; jump to any object; switch to security/customer view; create future version; compare with production; generate ADR; export Mermaid/PNG/SVG; Ask AI. The palette is the power-user spine.

## 7. Documentation & sharing

- **Docs generation**: every object renders to a documentation page (overview, responsibilities, dependencies, consumers, owner, repo). The model becomes a documentation site.
- **Public explorer**: publish a read-only `architecture.company.com` with search, zoom, drill-down, flows, metadata, versions, comments, and deep links, viewable without an account. Share links preserve viewer position and selection.

## 8. Integrations (target)

Development: GitHub, GitLab, Bitbucket. Cloud: AWS, Azure, GCP. Infra: Terraform, Pulumi, Kubernetes, Helm. Docs: Notion, Confluence, SharePoint. Comms: Slack, Teams. AI: Claude, ChatGPT, Cursor, VS Code, Codex (via MCP). Architecture formats: Mermaid, PlantUML, OpenAPI, Structurizr. Import/export is API-first so landscapes can be maintained as code and synced via CI/CD.

## 9. API-first + Model-as-code

The backend model is the source of truth; the frontend is one client of the API. A representative surface (full list in `../architecture/API_SURFACE.md`): CRUD for objects/connections/views/flows/versions; branches + merge; impact-analysis; AI analyze; imports/exports. Ship SDKs (TypeScript first). Support a YAML model-as-code file with `archctl push` / `archctl pull`, so a Git repo is another interface to the model.

## 10. AI + MCP (from day one, not bolted on)

Expose the model to agents as tools: `search_architecture`, `get_object`, `create_object`, `update_object`, `delete_object`, `create_connection`, `search_dependencies`, `analyze_impact`, `create_view`, `create_flow`, `create_adr`, `compare_versions`, `create_architecture_pr`. A developer in Cursor/Claude can say "add a Redis cache in front of the Product API," and the agent proposes the object + connection with a reason, for human approval. This is what "agent-readable and agent-editable" means in practice.

## 11. Phased delivery

Thirteen gated phases. Each is fully implemented **and tested** (its completion criteria) before the next begins. The tracked feature list lives in `../ROADMAP.md` and `../phases/`; current status in `../PROJECT_STATE.md`.

1. **Foundation** - auth, orgs, workspaces, roles, database + API foundation, app shell.
2. **Canvas** - infinite-canvas primitives: pan/zoom, select, drag, multi-select, alignment, auto-layout, undo/redo, minimap, command palette, search, shortcuts.
3. **Architecture Model** - the model-first core: C4 objects, the object-type catalog, first-class connections, metadata, lifecycle, domains.
4. **Diagrams & Views** - diagrams as saved views; dynamic filtered views; security/data/ownership views; technology catalog; persona modes.
5. **Flows** - ordered sequences through connections, with playback.
6. **Collaboration** - realtime, presence, comments, mentions, share links, permissions, teams, notifications.
7. **Versioning** - snapshots, branches, diff, changes, PRs, merge, ADRs, scenarios, roadmap.
8. **AI Copilot** - grounded chat, generation, NL editing (with evidence), explanation, analysis, docs, review agent, ADR generation, MCP, agents.
9. **Code Integrations** - GitHub/GitLab, discovery, code mapping, OpenAPI, sync, catalogs, model-as-code + CLI, webhooks, SDK.
10. **Infrastructure Integrations** - AWS/Azure/GCP, Terraform, Kubernetes, discovery, cost.
11. **Drift & Governance** - drift, linting, rules, dependency + blast-radius, failure simulation, security architecture, data lineage, health.
12. **Documentation** - object docs, markdown editor, public portal, exports (Mermaid/PlantUML/PDF/SVG).
13. **Enterprise** - SSO/SAML/SCIM, advanced RBAC, audit logs, org policies, compliance packs, private deployment, billing, marketplace, mobile.

The active phase and feature are tracked in `../PROJECT_STATE.md` + `../ROADMAP.md`. **Phase 01 (Foundation) is current; the first task is F001.**

## 12. Product loop (the north star)

```
CODE -> IMPORT -> ARCHITECTURE -> { DOCUMENT | REVIEW | SIMULATE } -> CHANGE -> CODE
```

If DiagramHQ closes that loop, it stops being a diagram tool and becomes part of how the team ships software. That is the whole bet.

## 13. Non-goals (for now)

Pixel-cloning IcePanel's UI. A general whiteboard. Real-time multiplayer before the single-player model is solid. Neo4j or a dedicated graph DB before Postgres adjacency actually hurts (see ADR-0003). Every integration at once — GitHub is the wedge.
