# Personas

Who DiagramHQ is for, and the job each hires it to do. Used to prioritize features and to sanity-check that a slice serves a real user, not just a demo.

## Primary

**Priya — Staff Engineer / Architect.**
Owns system design across several teams. Today she keeps stale diagrams in Confluence and a mental model in her head. Job: keep one accurate model, explore "what if we split this service" without redrawing, and hand new hires something true. Cares about: model reuse across views, current/future forking, impact analysis. Wins when she stops redrawing.

**Marcus — Platform / DevProd Engineer.**
Runs the paved road. Fights the gap between documented and actual architecture. Job: detect drift automatically, keep the model synced from Terraform/K8s/GitHub, and gate risky changes. Cares about: infra sync, drift detection, architecture PRs, API/model-as-code. Wins when the model updates itself.

**Dana — Engineering Leader (Director/VP).**
Needs to explain systems to execs and reason about risk. Job: see ownership, criticality, and single points of failure at a glance; explain a system to a non-engineer. Cares about: ownership/technology views, failure simulation, public explorer, "explain to a CTO." Wins when she can answer a board question in a click.

**Sam — Security / Compliance Engineer.**
Must trace sensitive data and prove boundaries. Job: find every path PII takes to a third party, see trust boundaries and public endpoints, evidence for audits. Cares about: security view, data classification metadata, flows, impact analysis. Wins when an audit question becomes a query.

## Secondary

**Alex — Any developer, new to a codebase.**
Job: understand a system fast without pinging six people. Cares about: generate-from-repo, drill-down, object docs, search. Wins in the first hour on a new team.

**An AI agent (Cursor / Claude / Codex).**
Not a person, but a first-class user. Job: read and safely edit the model via MCP tools, propose changes for human approval, keep code and model in sync. Cares about: stable object ids, the MCP tool surface, evidence on every change. This persona is why the model is API-first and agent-readable.

## Anti-persona

**The whiteboard doodler** who wants a freeform canvas to sketch anything. DiagramHQ is opinionated: it models software architecture with a typed model. If someone wants Miro, that is not us. We optimize for correctness and reuse over drawing freedom.
