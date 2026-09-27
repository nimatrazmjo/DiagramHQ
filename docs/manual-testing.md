# Manual testing

Prerequisites: stack running and seeded ([local-setup.md](local-setup.md)). Fastest sanity check first:

```bash
./scripts/smoke-test.sh
```

- [Part A — Web UI](#part-a--web-ui)
- [Part B — REST API](#part-b--rest-api)
- [Part C — Test matrix](#part-c--test-matrix)

> **What's wired where.** The dashboard (orgs, workspaces, roles) uses live API data. The workspace canvas currently renders a **built-in sample model**, not the seeded architecture. The seeded model, views, filters, and view overlays (security/data/ownership/technology/persona) are testable through the API (Part B). Their rendering components are covered by the web specs ([automated-tests.md](automated-tests.md)).

---

## Part A — Web UI

### A1. Login

| # | Step | Expected |
|---|---|---|
| 1 | Open <http://localhost:3000/dashboard> while logged out | Redirected to `/login` |
| 2 | Log in `admin@diagramhq.com` / `wrongpass` | Error, stays on `/login` |
| 3 | Log in `admin@diagramhq.com` / `abc` | Error (password < 6 chars) |
| 4 | Log in `admin@diagramhq.com` / `adminpassword` | Redirected to `/dashboard` |
| 5 | Check the "Authenticated Session" panel | Shows `admin@diagramhq.com` |
| 6 | Sign out | Back to `/login`; `/dashboard` redirects again |

### A2. Dashboard & roles

Log in as each user and compare:

| User | Should see | Role badge | "+ Create Workspace" |
|---|---|---|---|
| admin@diagramhq.com | Acme Corporation | owner | visible |
| lead@diagramhq.com | Acme Corporation | admin | visible |
| architect@diagramhq.com | Acme Corporation **and** Globex Industries | editor / owner | visible |
| developer@diagramhq.com | Acme Corporation | viewer | hidden or rejected |

Acme should list workspaces **Core Engineering** and **Payments**.

### A3. Registration (new user) & create org / workspace

1. Log out. Log in as `newbie@example.com` / `newbie123` (any 6+ char password).
2. Dashboard says you are not a member of any organization.
3. **Create New Organization**: name `Test Org`, slug `test-org` → it appears with the **owner** badge.
4. Try slug `Bad Slug!` → validation error (lowercase letters, digits and dashes only).
5. **+ Create Workspace** in *Test Org*: name `Sandbox` → it appears under the org.
6. Log in as `admin@diagramhq.com` → *Test Org* is **not** visible (isolation).

### A4. Workspace shell & canvas

Open a workspace from the dashboard (`/workspace/<workspaceId>`).

| # | Action | Expected |
|---|---|---|
| 1 | Page loads | Top bar, left navigator (Systems, Apps, Data, Flows, Views, Decisions), "Workspace Overview", interactive canvas |
| 2 | Click each navigator item | Route changes to `/workspace/<id>/<section>` |
| 3 | Scroll / pinch on the canvas | Zooms around the cursor |
| 4 | Drag empty space | Pans |
| 5 | Click a node | Node highlighted; inspector panel shows it |
| 6 | Shift-click or drag a box over several nodes | Multi-select |
| 7 | Drag a node | Moves; others stay |
| 8 | Select 2+ nodes → alignment toolbar | Align left/center/right/top/middle/bottom and distribute work |
| 9 | Layout menu → Layered / Grid / Radial / Force-directed | Nodes re-arranged |
| 10 | `Ctrl/Cmd + Z` | Undoes the last move/align/layout |
| 11 | `Ctrl/Cmd + Shift + Z` or `Ctrl + Y` | Redoes it |
| 12 | Minimap (corner) | Shows the whole diagram; clicking it navigates |
| 13 | `Shift + F` or the fullscreen button | Toggles fullscreen canvas |

---

## Part B — REST API

Set up tokens once (requires `jq`; see [authentication.md](authentication.md) for a `sed` alternative):

```bash
API=http://localhost:4000
tok() { curl -s -X POST $API/auth/token -H 'content-type: application/json' \
          -d "{\"email\":\"$1\",\"password\":\"$2\"}" | jq -r .token; }
ADMIN=$(tok admin@diagramhq.com adminpassword)
LEAD=$(tok lead@diagramhq.com leadpassword)
ARCH=$(tok architect@diagramhq.com strongpassword)
DEV=$(tok developer@diagramhq.com password123)
H() { echo "Authorization: Bearer $1"; }
JSON='content-type: application/json'
```

### B1. Health & auth

```bash
curl -s $API/health | jq                                   # status "ok", database "up"
curl -s $API/auth/me -H "$(H $ADMIN)" | jq .user.email      # "admin@diagramhq.com"
curl -s -o /dev/null -w '%{http_code}\n' $API/organizations # 401 (no token)
```

### B2. Organizations, members, tenant isolation

```bash
curl -s $API/organizations -H "$(H $ARCH)" | jq '.organizations[].name'   # Acme + Globex
curl -s $API/organizations -H "$(H $DEV)"  | jq '.organizations[].name'   # Acme only
curl -s $API/organizations/org_acme/members -H "$(H $ADMIN)" | jq          # 4 members

# Developer cannot see Globex data → 404
curl -s -o /dev/null -w '%{http_code}\n' $API/architectures/arch_globex -H "$(H $DEV)"
```

Role changes:

```bash
# developer (viewer) tries to change roles → 403
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH $API/organizations/org_acme/members/mem_acme_lead \
  -H "$(H $DEV)" -H "$JSON" -d '{"role":"viewer"}'

# nobody can demote the owner → 403
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH $API/organizations/org_acme/members/mem_acme_admin \
  -H "$(H $LEAD)" -H "$JSON" -d '{"role":"viewer"}'

# lead (admin) promotes developer to editor → 200
curl -s -X PATCH $API/organizations/org_acme/members/mem_acme_developer \
  -H "$(H $LEAD)" -H "$JSON" -d '{"role":"editor"}' | jq
```

Run `pnpm db:seed` afterwards to restore roles — later steps assume the developer is a **viewer**.

### B3. Workspaces

```bash
curl -s $API/organizations/org_acme/workspaces -H "$(H $DEV)" | jq '.workspaces[].name'
curl -s -X POST $API/organizations/org_acme/workspaces -H "$(H $ARCH)" -H "$JSON" \
  -d '{"name":"Mobile","slug":"mobile"}' | jq                                  # 201
curl -s -o /dev/null -w '%{http_code}\n' -X POST $API/organizations/org_acme/workspaces \
  -H "$(H $DEV)" -H "$JSON" -d '{"name":"Nope"}'                               # 403 viewer
curl -s $API/workspaces/ws_core/architectures -H "$(H $ADMIN)" | jq '.architectures[].name'
```

### B4. Architecture model

```bash
curl -s $API/architectures/arch_ecommerce/model -H "$(H $DEV)" \
  | jq '{objects: (.objects|length), connections: (.connections|length)}'     # 20 / 18

curl -s $API/objects/app_payments -H "$(H $DEV)" | jq '.object.metadata'
```

Create → update → connect → delete (as an editor):

```bash
OBJ=$(curl -s -X POST $API/architectures/arch_ecommerce/objects -H "$(H $ARCH)" -H "$JSON" \
  -d '{"name":"Recommendations","kind":"application","parentId":"sys_store","metadata":{"team":"catalog","technology":"Python"}}' \
  | jq -r .object.id)
echo $OBJ

curl -s -X PATCH $API/objects/$OBJ -H "$(H $ARCH)" -H "$JSON" \
  -d '{"description":"ML-based product suggestions"}' | jq .object.description

CON=$(curl -s -X POST $API/architectures/arch_ecommerce/connections -H "$(H $ARCH)" -H "$JSON" \
  -d "{\"sourceObjectId\":\"app_catalog\",\"targetObjectId\":\"$OBJ\",\"kind\":\"sync\",\"label\":\"Get recs\"}" \
  | jq -r .connection.id)

curl -s -X DELETE $API/connections/$CON -H "$(H $ARCH)" | jq
curl -s -X DELETE $API/objects/$OBJ -H "$(H $ARCH)" | jq
```

Negative checks:

| Request | Expected |
|---|---|
| Viewer (`$DEV`) `POST /architectures/arch_ecommerce/objects` | 403 |
| Connection with `sourceObjectId == targetObjectId` | 400 (self-connection) |
| Connection to an object in another architecture (`app_ledger_api`) | 400 |
| `kind: "spaceship"` on an object | 400 validation error |

### B5. Views

```bash
# List — 9 views, one of each kind
curl -s $API/architectures/arch_ecommerce/views -H "$(H $DEV)" | jq '.views[] | {id,name,kind,isStarred}'

# Projection of a pinned view
curl -s $API/views/vw_ecom_container/projection -H "$(H $DEV)" | jq '.objects | length'   # 13

# Dynamic view: filter {team: payments} resolves live
curl -s $API/views/vw_ecom_payments_team/projection -H "$(H $DEV)" | jq '[.objects[].name]'
```

Create, star, filter, delete:

```bash
V=$(curl -s -X POST $API/architectures/arch_ecommerce/views -H "$(H $ARCH)" -H "$JSON" \
  -d '{"name":"Catalog team","kind":"custom","filter":{"team":"catalog"}}' | jq -r .view.id)

curl -s -X PATCH $API/views/$V -H "$(H $ARCH)" -H "$JSON" -d '{"isStarred":true}' | jq .view.isStarred   # true
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH $API/views/$V -H "$(H $ARCH)" -H "$JSON" \
  -d '{"isStarred":"yes"}'                                                                   # 400

# Persona view kind is accepted
curl -s -X POST $API/architectures/arch_ecommerce/views -H "$(H $ARCH)" -H "$JSON" \
  -d '{"name":"SRE view","kind":"persona"}' | jq .view.kind                                 # "persona"

curl -s -X DELETE $API/views/$V -H "$(H $ARCH)" | jq
```

View membership and layout (model-first rule):

```bash
curl -s -X DELETE $API/views/vw_ecom_context/objects/sys_email -H "$(H $ARCH)" | jq
curl -s -o /dev/null -w '%{http_code}\n' $API/objects/sys_email -H "$(H $ARCH)"   # 200 — still in the model
curl -s -X POST $API/views/vw_ecom_context/objects -H "$(H $ARCH)" -H "$JSON" \
  -d '{"objectId":"sys_email","position":{"x":700,"y":300}}' | jq

curl -s -X PATCH $API/views/vw_ecom_context/objects/sys_store/position -H "$(H $ARCH)" -H "$JSON" \
  -d '{"x":320,"y":140}' | jq
```

---

## Part C — Test matrix

Tick through before a release:

| Area | Scenario | Where |
|---|---|---|
| Auth | login ok / wrong password / short password / logout | A1, B1 |
| Registration | new email → empty dashboard → create org → owner | A3 |
| Roles | owner/admin/editor/viewer permissions | A2, B2, B3, B4 |
| Isolation | Globex hidden from non-members (404) | A3.6, B2 |
| Workspaces | create / list / viewer blocked | A3, B3 |
| Model | object & connection CRUD, validation errors | B4 |
| Views | list / projection / dynamic filter / star / persona / remove-keeps-object | B5 |
| Canvas | pan, zoom, select, multi-select, drag, align, layouts, undo/redo, minimap, fullscreen | A4 |
| Infra | `/health` 200, Docker images build and start | B1, [local-setup](local-setup.md) |
