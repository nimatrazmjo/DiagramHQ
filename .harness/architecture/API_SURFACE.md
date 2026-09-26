# API Surface

DiagramHQ is API-first. The UI is one client; agents and CI are others. This is the target surface — build only the endpoints an active feature needs, but design them to fit here.

## Conventions

- REST + JSON, resource-oriented, ids prefixed by type. Auth via bearer token / session. All list endpoints paginate + filter. All mutations are versioned (carry or default a `version_id`).
- Errors are typed: `{ error: { code, message, details } }`. Never leak stack traces past the API edge.
- Every mutation is attributable (actor + version) for audit and diff.

## Core resources

```
# Tenancy
POST   /organizations
GET    /organizations/:id
GET    /workspaces?org=:id
POST   /workspaces
GET    /architectures?workspace=:id
POST   /architectures
GET    /architectures/:id

# Model objects (the reusable entities)
GET    /architectures/:id/objects?version=&kind=&tag=&team=
POST   /architectures/:id/objects
GET    /objects/:id
PATCH  /objects/:id
DELETE /objects/:id

# Connections (first-class)
GET    /architectures/:id/connections?version=
POST   /architectures/:id/connections
PATCH  /connections/:id
DELETE /connections/:id

# Views (projections)
GET    /architectures/:id/views
POST   /architectures/:id/views
GET    /views/:id            # resolves filter -> objects + per-view layout
PATCH  /views/:id
POST   /views/:id/objects    # add/position an object in this view only

# Flows
GET    /architectures/:id/flows
POST   /architectures/:id/flows
GET    /flows/:id            # ordered steps for playback
POST   /flows/:id/export     # { format: mermaid|plantuml }

# Versioning
GET    /architectures/:id/versions
POST   /architectures/:id/branches      # { from_version, name, kind }
POST   /architectures/:id/merge         # { source_version, target_version }
GET    /architectures/:id/diff?from=&to=

# Decisions
GET    /architectures/:id/decisions
POST   /architectures/:id/decisions
POST   /decisions/:id/link              # { object_id }

# Intelligence (Phase 3+)
POST   /architectures/:id/impact-analysis   # { object_id } -> deps, teams, flows, critical paths
POST   /architectures/:id/ai/analyze        # { prompt } -> grounded answer + cited object ids
POST   /architectures/:id/generate          # { prompt | repo_url } -> proposed changeset (needs approval)

# Integration (Phase 4)
POST   /architectures/:id/imports           # { source: github|terraform|openapi|..., config }
POST   /architectures/:id/exports           # { format }
POST   /architectures/:id/drift-scan        # -> documented vs actual delta

# Realtime (Phase 2) : websocket channel per architecture for presence + live edits
```

## Model-as-code

A YAML file maps onto `model_objects` + `model_connections`. Human slugs resolve to stable ids on push; `pull` writes ids back as comments so the file round-trips.

```yaml
# architecture.yaml
systems:
  - id: ecommerce
    name: E-Commerce
applications:
  - id: storefront
    name: Storefront
    system: ecommerce
    technology: Next.js
    team: web
  - id: order-api
    name: Order API
    system: ecommerce
    technology: NestJS
    team: orders
stores:
  - id: postgres
    name: PostgreSQL
connections:
  - from: storefront
    to: order-api
    kind: sync
  - from: order-api
    to: postgres
    kind: data
```

CLI (Phase 4): `archctl push architecture.yaml` and `archctl pull`. A Git repo of these files is another interface to the model, so it can be reviewed in normal PRs and synced via CI.

## MCP tool surface (Phase 3, but design ids for it now)

Agents operate the model through tools, one per API capability. Every mutating tool returns a **proposed change** a human approves; agents never silently commit.

```
search_architecture(query)            get_object(id)
create_object(kind, name, parent?)    update_object(id, patch)
delete_object(id)                     create_connection(from, to, kind)
search_dependencies(id, direction)    analyze_impact(id)
create_view(kind, filter)             create_flow(name, steps)
create_adr(title, context, decision)  compare_versions(from, to)
create_architecture_pr(branch, title) 
```

The MCP server is a thin adapter over the REST surface above. If a capability is not in the API, it is not a tool. That is the discipline that keeps the model agent-editable without a second code path.
