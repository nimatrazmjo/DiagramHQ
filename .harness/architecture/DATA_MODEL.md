# Data Model

The heart of DiagramHQ. Model-first: objects and connections are authoritative; views/flows/diagrams are projections. This document is the contract the domain layer, the API, and model-as-code all implement.

## Entity overview

```
organizations ─┐
               └─< workspaces ─┐
                               └─< architectures ─┐
                                                  ├─< versions (branches, commits)
                                                  ├─< model_objects ─┐
                                                  │                  ├─< object_tags >─ tags
                                                  │                  ├─< object_technologies >─ technologies
                                                  │                  └─< repositories
                                                  ├─< model_connections
                                                  ├─< views ─< view_objects
                                                  ├─< flows ─< flow_steps
                                                  ├─< decisions (ADRs)
                                                  ├─< environments
                                                  └─< phases (current/future)
organizations ─< members
```

## Core tables (conceptual — Prisma schema is the implementation)

### organizations
`id, name, slug, created_at, updated_at`

### workspaces
`id, org_id -> organizations, name, slug, settings(jsonb), created_at, updated_at`

### architectures
`id, workspace_id -> workspaces, name, description, default_version_id, created_at, updated_at`

### versions
`id, architecture_id, parent_version_id (nullable), name, kind(enum: main|branch|fork|future), status(enum: draft|open|approved|merged), created_by, created_at`
- Branching and current/future both live here. `main` is the trunk; a `future` version is a fork intended to become main.

### model_objects  (the reusable entities)
`id (prefixed), architecture_id, version_id, parent_id (nullable, self -> nesting/groups), kind(enum: system|application|store|component|actor|group), name, description, metadata(jsonb), position(jsonb, per-view override lives in view_objects), created_at, updated_at`
- `kind` is extensible via the object-type registry (MODULES.md); the enum is the built-in set.
- `metadata` holds owner, team, status, environment, technology, criticality, data_classification, cost_center, compliance, docs_url, repo_url, deployment, etc. Indexed via generated columns for the fields views filter on.

### model_connections  (first-class, not lines)
`id, architecture_id, version_id, source_object_id, target_object_id, kind(enum: sync|async|data|dependency|deploys_to|...), label, description, metadata(jsonb), created_at, updated_at`
- This is the adjacency list. Graph queries (dependencies, impact, paths) run over this table (ADR-0003).

### tags / object_tags
`tags: id, architecture_id, name, color` — `object_tags: object_id, tag_id`

### technologies / object_technologies
`technologies: id, name, category` — `object_technologies: object_id, technology_id`

### repositories
`id, object_id, provider(github|gitlab|...), url, default_branch, last_synced_at` — links an object to real code for L4 mapping and evidence.

### views  (projection: a saved filter + layout)
`id, architecture_id, name, kind(enum: context|container|component|security|data|ownership|technology|custom), filter(jsonb), level(int), created_at, updated_at`
- A view stores **which** objects appear (filter or explicit set) and **how** they are laid out — never the objects themselves.

### view_objects  (per-view layout override)
`view_id, object_id, position(jsonb), collapsed(bool), hidden(bool), style(jsonb)`
- Same object, different position in each view. Deleting a row removes the object from that view only.

### flows / flow_steps
`flows: id, architecture_id, name, description` — `flow_steps: flow_id, step_index, connection_id, note`
- A flow is an ordered list of existing connections. Playback animates steps in order. Export to Mermaid/PlantUML reads this.

### decisions  (ADRs)
`id, architecture_id, number, title, status(proposed|accepted|superseded), context, decision, consequences, created_at` + `decision_objects: decision_id, object_id`

### environments / phases
`environments: id, architecture_id, name(dev|staging|prod|...)` — `phases: id, architecture_id, name, version_id` (current/future mapping).

### members
`id, org_id, user_id, role(owner|admin|editor|viewer)` — RBAC expands in Phase 5.

## Invariants (enforced in packages/domain)

1. An object belongs to exactly one architecture + version. Cross-architecture references are forbidden.
2. A connection's source and target must exist in the same architecture + version.
3. `parent_id` may not create a cycle (no group contains its own ancestor).
4. Deleting an object cascades to its connections and its `view_objects` rows, but never silently deletes another object.
5. A view's `filter` must resolve to objects in the same architecture + version.
6. Ids are immutable once assigned.

## Versioning + diff

- Every mutation records `version_id`. A branch/fork copies object+connection rows with new ids mapped from source (a mapping table records `source_id -> branch_id`).
- **Diff** between two versions = set difference over `(objects, connections, metadata)`: added, removed, changed. This powers current-vs-future, architecture PRs, and drift (documented-version vs. imported-version).
- **Merge** applies a branch's diff onto `main` with conflict detection on the same object id.

## Why Postgres, not a graph DB (summary; full reasoning ADR-0003)

Connections are a plain adjacency table. Dependency/impact/path queries are recursive CTEs over `model_connections`, cached in Redis. This is fast enough well past MVP and keeps one datastore. Revisit only when recursive query latency on real data becomes the bottleneck.

## Model-as-code mapping

The YAML in `API_SURFACE.md` §model-as-code maps 1:1 onto `model_objects` + `model_connections` (by human-friendly slug, resolved to ids on push). This is why ids are stable and objects are independent of views.
