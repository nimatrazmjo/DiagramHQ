# Scope Guard

What is **off-limits right now**. Scope creep is the most common agent failure; this file is the leash. The active phase is whatever `PROJECT_STATE.md` says. Building ahead of it is a defect, not initiative. There are 13 gated phases (ROADMAP.md order); a phase's features may not start until the previous phase's completion criteria pass.

## Current phase: Phase 01 — Foundation

### In scope (Phase 01 only)
- The monorepo scaffold + clean baseline (F001): apps/web, apps/api, packages/domain, packages/config; typecheck/lint/test; `init` green.
- Auth (F002): a single provider gates the app. No SSO/SCIM.
- Organizations (F003), Workspaces (F004): the tenancy tree, scoped.
- User roles (F005): owner/editor/viewer only. No advanced RBAC.
- Database foundation (F006): Postgres + Prisma + migrations for the model schema; tenant isolation from day one.
- API foundation (F007): NestJS skeleton, validation, typed errors, health.
- Application shell (F008): Next.js nav + top bar + inspector slot.

### Off-limits until their phase (do NOT build now)
- **Canvas rendering/interactions, palette, search, shortcuts, auto-layout, undo/redo** — Phase 02.
- **The architecture model, C4 objects, connections, metadata, lifecycle, the object-type catalog, domains** — Phase 03. (Design the schema in F006, but the model UX is Phase 03.)
- **Diagrams-as-views, dynamic/security/data/ownership views, technology catalog, personas** — Phase 04.
- **Flows + playback** — Phase 05.
- **Realtime, presence, comments, mentions, share links, full RBAC, teams, notifications** — Phase 06.
- **Versioning, branches, diff, PRs, merge, ADR system, scenarios, roadmap** — Phase 07.
- **AI Copilot, generation, NL editing, review agent, MCP, agents** — Phase 08.
- **GitHub/GitLab/OpenAPI, code mapping, catalogs, model-as-code + CLI, webhooks, SDK** — Phase 09.
- **AWS/Azure/GCP/Terraform/Kubernetes import, cost** — Phase 10.
- **Drift, linting, rules, dependency/blast-radius, failure sim, security architecture, data lineage, health** — Phase 11.
- **Docs editor, public portal, exports** — Phase 12.
- **SSO/SAML/SCIM, advanced RBAC, audit logs, compliance, private deploy, billing, marketplace, mobile** — Phase 13.
- **PixiJS renderer** — deferred (ADR-0002); build the CanvasRenderer interface in Phase 02, keep React Flow the only implementation.
- **Graph database** — deferred (ADR-0003). Postgres adjacency only.

## Rules of the guard
1. If a task tempts you outside the current phase, stop. Note it in `BLOCKERS.md` (or as a future feature in `ROADMAP.md`) and keep going on the active feature.
2. No dependency unless the active feature needs it — record new deps in the sprint contract with a justification.
3. Design *for* later phases (stable ids, registries, the CanvasRenderer interface) but *build* only the current phase.
4. If scope is wrong, propose an edit to this file + `ROADMAP.md` — don't silently expand. Record the decision in `DECISIONS.md`.
5. Don't skip a phase's completion criteria. A phase is done only when every feature is `COMPLETE` with evidence and the phase smoke test is green.

## Why so strict
A solid, tested Foundation and Canvas beat half of thirteen phases. Every later feature renders into the model + canvas; a shaky substrate multiplies its shakiness across the whole product.
