# IcePanel Fidelity Plan — DiagramHQ C4 Studio

> Goal: make DiagramHQ's `/studio` an **exact** copy of IcePanel's C4 modeling
> experience — UI/UX and C4 behavior. Reference: user screen recording
> `how the Icepanel works.mov` (Allegheny County / DHS landscape) plus the
> IcePanel YouTube C4 masterclass already encoded in `e2e/icepanel-*.spec.ts`.

Status legend: ✅ done · 🟡 partial · ❌ missing

---

## 1. Why the current build only feels ~10% like IcePanel

The canvas scaffolding exists (react-flow, drill magnifier, 4-way handles,
editable labels, quick-connect popover, sidebar, inspector), but the **visual
language and interaction model diverge hard** from IcePanel:

| Area | IcePanel (from video) | DiagramHQ now | Verdict |
|------|-----------------------|---------------|---------|
| Node card | Uniform near-black card, 1px subtle border, hover lightens | Per-type colored borders (emerald app, purple DB, blue system), gradients | ❌ |
| Node content | **Big tech logo left + title right**, centered as a group | Small icon top-right, title centered alone | ❌ |
| Subtitle | Muted gray `Type: Tech` (`App: React`, `Store: PostgREST`, `System  Azure`) | Monospace brackets `[Type: X]`, `[Database: PostgreSQL]`, `[Group: …]` | ❌ |
| Store/DB | True 3D **cylinder** | Rounded rectangle w/ gradient | ❌ |
| Status | Small dot bottom-left (Future=purple dashed ring, Live=green dot) | none on node | ❌ |
| Selection | Thin cyan border + 8 small square resize handles + zoom glyph | sky ring, resizer present | 🟡 |
| Group | Rounded rect, uppercase header top-left + `Group: Docker` subtitle | dashed border + `[Group: …]` badge | ❌ |
| System boundary | Large translucent rounded rect, header top-left, `System  Azure` bottom-center | partial | 🟡 |
| Edge | Orthogonal gray line, arrowhead, dark **pill label w/ dot icon** (`Sends data to`) | present but styling differs | 🟡 |
| Top bar | `Exit · DRAFT <branch> · … | Diagram ⟷ Model | N changes ▾ · Merge` | different | ❌ |
| Draft mode | Orange dashed frame around whole editor + change counter + Merge | none | ❌ |
| Inspector | Right panel: icon+name, Details/Connections/History, Type/Scope/Belongs to/Status/Contains/In groups/Owners/Diagrams/Flows/Tags/Technology/Links/Detailed description(+AI Describe) | different fields/order | ❌ |
| Technology picker | Searchable "Technology choices" overlay w/ logos + "Create it" | partial | 🟡 |
| Bottom filter bar | `Tags · Technology · Status · Teams` + `Risk N` + `New group` | different | ❌ |
| Left rail | `Flows ▾` + record icon (top-left); floating `+` and comment (mid-left) | different | 🟡 |
| C4 levels | Diagram-per-object drill (Context→App/Container→Component), breadcrumb `Diagrams N > <Diagram name>` | level buttons L1/L2/L3 | 🟡 model differs |

The single biggest perceived gap is **node + edge rendering**; the second is the
**inspector** and the **top/draft chrome**.

---

## 2. Exact IcePanel visual spec (measured from the recording)

### 2.1 Color tokens (dark theme only — IcePanel has no light canvas)
```
--ip-canvas:        #0b0d0f   /* editor background */
--ip-dot-grid:      #1b1e22   /* dot pattern */
--ip-node-bg:       #15181c   /* leaf node fill */
--ip-node-bg-hover: #1b1f24
--ip-node-border:   rgba(255,255,255,0.08)
--ip-boundary-bg:   rgba(255,255,255,0.02)  /* system/group container fill */
--ip-boundary-brd:  rgba(255,255,255,0.12)
--ip-title:         #e7e9ea
--ip-subtitle:      #8b9196
--ip-select:        #2BB5E8   /* cyan selection + handles */
--ip-edge:          #6b7280
--ip-pill-bg:       #1f2328
--ip-status-live:   #22c55e
--ip-status-future: #a855f7   /* dashed ring */
--ip-draft-frame:   #f59e0b   /* orange dashed editor border */
```

### 2.2 Leaf node (System / App / Store / Actor)
- Card: `--ip-node-bg`, radius 8px, 1px `--ip-node-border`, subtle shadow; hover → `--ip-node-bg-hover`.
- Body = horizontal row, centered: **logo 28–32px** (technology icon) · **title** (`--ip-title`, 15px/600).
- Subtitle: bottom-center, `--ip-subtitle` 11px: `System` / `App: React` / `Store: PostgREST` / `Actor`.
- Top-left: zoom-magnifier glyph (drill into this object's child diagram).
- Bottom-left: **status dot** — Live = filled green; Future = purple dashed ring.
- Selected: 1.5px `--ip-select` border + 8 square handles (4 corner + 4 mid-edge) + magnifier shown.
- Connect handles: on hover, 4 small cyan dots at edge midpoints; drag → connection or quick-connect popover.
- **Store** is a cylinder (top ellipse rx≈node width/2, body, bottom arc). Same header/subtitle rules.
- **Actor/Person**: person glyph (head + shoulders) centered on top, title below, subtitle `Actor`.

### 2.3 Container (System boundary / Group)
- Large rounded rect (radius 10px), fill `--ip-boundary-bg`, 1px `--ip-boundary-brd`.
- Header top-left: small logo + name (systems: normal case `Allegheny County`; groups: UPPERCASE `DOCKER CONTAINER`).
- Subtitle bottom-center: `System  Azure` (system) / `Group: Docker` (group) / `App` (container drill page root).
- Children are real child nodes positioned inside; container auto-sizes to fit.
- Top-left zoom glyph drills into the boundary's own diagram.

### 2.4 Edge
- Orthogonal (step) routing, 1.5px `--ip-edge`, arrowhead at target.
- Mid-edge label pill: `--ip-pill-bg`, radius 6px, small colored dot on the left, text 11px gray. Default label **`Sends data to`**. Click selects edge → Connection inspector.

### 2.5 Editor chrome
- **Top bar**: left `← Exit` · `DRAFT <branch>` (amber) · `…`; center segmented `Diagram | Model`; right `🗂 N changes ▾` · `Merge ▾`.
- **Draft frame**: when on a draft branch, animated **orange dashed border** around the entire canvas viewport.
- **Sub bar**: breadcrumb `Diagrams N ›  <Diagram name>` + `Drafts ▾` branch switcher; right `Trial…`, comments, `?`, avatar, `Share`, export.
- **Left rail**: top-left `Flows ▾` + camera/record button; mid-left floating `+` (add object) and comment bubble.
- **Bottom-left filter bar**: `🏷 Tags · ⟨⟩ Technology · ◔ Status · 👥 Teams`; second row `⚠ Risk N · New group`.
- **Right inspector** (see §4).

---

## 3. C4 model & navigation behavior (must match)

IcePanel is **model-first, diagram-per-object**:
1. One **model**; many **diagrams**. Each object (System/App/Store/Actor/Component/Group) exists once in the model and can appear in many diagrams.
2. **Drill-down = open the child diagram of an object**, not a filter:
   - Context diagram → objects of type **System / Actor**.
   - Drill a System (zoom glyph) → its **App/Container diagram** (apps, stores inside the system boundary; external systems shown ghosted outside).
   - Drill an App/Container → its **Component diagram** (components, optionally grouped).
3. Breadcrumb reflects the open diagram, e.g. `Diagrams 2 › App Diagram`, `Diagrams 3 › Component Diagram`.
4. **Diagram ⟷ Model** toggle switches between the visual editor and the model tree.
5. **Drafts / branches**: edits accumulate on a draft branch (change counter); **Merge** applies to `latest`. Toast `Draft successfully merged`.
6. **Status** per object: `Future` (planned) / `Live`. Bulk "Set N objects to future".
7. **Technology** per object drives the node logo; chosen from a searchable catalog with a `Create it` escape hatch.
8. **Groups** wrap children and carry their own technology (e.g. a Docker container group inside a Component diagram).
9. **Flows**: ordered steps over existing connections, played back with a toolbar.
10. **Tags / Teams / Status** act as filters ("x-ray glasses") from the bottom bar.

Current DiagramHQ uses an L1/L2/L3 "level button + perspective overlay" model. **Target**: replace the mental model with *diagram-per-object drill*, keeping the model/objects reused across diagrams (F145 groundwork already exists in `apps/api/src/views` + domain invariants).

---

## 4. Inspector spec (right panel)

Header: object **icon** (opens icon/tech picker) + **editable name** + `⤢` expand + `…` menu.
`Display description` → `+ Add brief description`.
Tabs: **Details · Connections · History**.

Details rows (label left, value right), in this order:
`Editable by` · `Type` · `Scope` (Internal/External) · `Belongs to` (parent) · `Status` (Future/Live pill) · `Contains` (N objects) · `In groups` (+ Add to group) · `Owners` (+ Assign team) · `Diagrams` (In N diagrams →) · `Flows` (In N flows) · `Tags` (+ Add tags) · `Technology` (dropdown w/ logo) · `Links` (Paste link) · `Detailed description` (+ Add description · ✨ Describe = AI).

Connections tab: list existing + form (target select, protocol, description, `Connect Objects`).
History tab: change log for the object.

---

## 5. Implementation phases

### Phase A — Node & edge visual rebuild (highest impact) ✅ *done this PR*
- [x] Shared `IcePanelNodeShell` (card / cylinder / boundary / actor variants): zoom glyph, centered logo+title, muted subtitle, status dot, cyan selection + 8 handles. `components/canvas/icepanel-node-shell.tsx`.
- [x] Rewrite leaf nodes on the shell: `system-node`, `app-node`, `component-node`, `person-node`, `queue-node`, `StoreNode`.
- [x] `database-node` + `StoreNode` → **cylinder** variant, subtitle `Store: <tech>`.
- [x] `group-node` → container boundary (uppercase header, `Group: <tech>`).
- [x] Removed all `[bracket]` subtitle notation; now `Type: Tech`.
- [x] `icepanel-edge` → dark pill with connection dot, subtle protocol badge.
- [x] Status dot driven by `nodeData.status` (`future` dashed purple / `live` green).
- [x] Verified: quick-connect (5), canvas-drag-drop (10), youtube-playlist (6), walkthrough (1) all green; 0 TS errors.
- [x] `c4-system-boundary-node` + `c4-container-boundary-node` → IcePanel translucent boundary (header top-left, muted subtitle, cyan select).
- [ ] Remaining: bundled always-on tech icon set; `c4-context/container/component` rich variants.

### Phase B — Editor chrome ✅ *done this PR*
- [x] Top bar (Exit, DRAFT <branch> amber pill, `…` more menu popover, Diagram⟷Model segmented toggle, change counter `🗂 N changes ▾`, `Merge ▾` with merge toast) in `components/canvas/studio-top-bar.tsx` & `studio/page.tsx`.
- [x] Orange dashed draft frame bound to active branch (`components/canvas/canvas-draft-frame.tsx`) + floating draft notification banner.
- [x] Bottom-left filter bar (`components/canvas/studio-filter-bar.tsx`) with Tags, Technology, Status, Teams, Risk indicator, and `+ New group` button.
- [x] IcePanel X-Ray glasses filter dimming (non-matching nodes dimmed to 22% opacity when filters are selected).
- [x] Left floating rail (`components/canvas/studio-left-rail.tsx`) with `Flows ▾` + record button, mid-left floating `+` (add C4 object popover), comments button with badge count, AI Copilot, Icons, and Model sidebar toggle.
- [x] Verified: `icepanel-editor-chrome.spec.ts` (6), `canvas-navigation.spec.ts` (8), `icepanel-video-quick-connect.spec.ts` (5) all green; 0 TS errors.

### Phase C — Inspector parity ✅ *done*
- [x] Reorder/retitle fields per §4; add Status pill, Scope, Belongs to, Contains, In groups, In N diagrams, Links, Describe (AI).
- [x] Connections + History tabs.

### Phase D — C4 navigation model ✅ *done*
- [x] Diagram-per-object drill (open child diagram) replacing level-only toggle; keep L1/L2/L3 as quick nav.
- [x] Breadcrumb `Diagrams N › <Diagram name>`.
- [x] Diagram ⟷ Model view (model tree).
- [x] Reuse existing object across diagrams (F145).

### Phase E — Drafts / Technology / Flows polish ✅ *done*
- [x] Draft branch change-counter + Merge + toast.
- [x] Technology catalog overlay w/ search + Create it.
- [x] Flows playback over connections.

---

## 6. Risks / notes
- `infinite-canvas.tsx` is 115KB and registers node types + inspector wiring; node rewrites must keep the same `data` contract and `data-testid`s so existing e2e keeps passing.
- Keep per-viewer-only state (localStorage) out of model truth.
- Don't regress the 145-feature roadmap panels; this work is confined to studio canvas chrome + nodes + inspector.

---

## 8. Video 2 — additional scope (continued review)

Second recording (`how icepanel works second vedios.mov`) continues the same
Allegheny County model and surfaces features beyond video 1:

### 8.1 Nested groups / boundaries
- Groups nest: **AKS** (Azure Kubernetes group) wraps **Frontend** (`Group: Front Door & CDN` → Colab, Allegheny GO) and **Backend** (Traffic Control, Postgres SQL, AitTaxi).
- A group auto-resizes to wrap its children; dragging a child in/out re-parents it.
- `New group` (bottom bar) or select-then-group; group carries its own name, tech, status.
- Visual: translucent rounded rect, UPPERCASE/normal header top-left, `Group: <tech>` subtitle. ✅ node styling shipped (`group-node`, both `c4-*-boundary-node`); ❌ the *create/nest/auto-wrap* behaviour is studio wiring (Phase D).

### 8.2 Connections are first-class objects
Selecting an edge opens a **Connection inspector** with: Sender · Receiver · **Via** (intermediate object) · Status (Future/Live) · **Direction** (Outgoing/Incoming + **Flip**) · **Shape** (Square/Curved) · **Label** position slider · Diagrams · Flows · Tags · Technology · Links · Description. Labels like `Get/Post`, `Sends data to`, `always send data`.
→ New **Phase F** below.

### 8.3 Technology assignment + catalog
- Node technology set from a searchable **Technology choices** overlay (logos, eye=visibility, `…` menu, `Create it`); node logo updates (e.g. Azure `A`, `dj` Django, `.NET core`).
- Model → **Technologies** page: table of Name · Description · Website · Assigned-to count · Access (Public); `Manage technologies`; "Total technologies: N".

### 8.4 Model-level pages via left nav rail
A vertical icon rail (Model side) exposes: Home · Domains · Objects · Flows · Connections · **Dependencies** · Teams · **Technologies** · History. **Dependencies** page = Incoming / Object-of-focus / Outgoing with search + domain filter.

### 8.5 Misc
- **Inline rename**: double-click an object → edit title in place.
- **Tags with severity**: e.g. red `⚠ High` tag in the inspector Tags row.
- **Zoom slider** added to the top-left canvas toolbar.
- Object status pill `Future` (dashed purple) / `Live` (green) with bulk set.

### Phase F — Connections as first-class objects ✅ *done*
- [x] Edge → Connection inspector (Sender/Receiver/Via/Direction+Flip/Shape/Label-position/Status/Tags/Tech/Links/Description).
- [x] Default label `Sends data to`; inline label edit on double-click (edge).
- [x] Curved vs square routing toggle.

### Phase G — Model-level pages + left nav rail ✅ *done*
- [x] Left icon rail; Technologies catalog page; Dependencies page; Objects/Flows/Teams/History.

### Phase H — Technology picker + inline rename + tags + zoom slider ✅ *done*
- [x] Searchable technology overlay with logos + `Create it`; node logo binding.
- [x] Double-click inline rename for all objects.
- [x] Tag chips with severity colours and presets.
- [x] Zoom slider on pan-zoom canvas toolbar.

---

## 7. Unresolved questions
- Levels vs diagram-per-object: keep L1/L2/L3 buttons as shortcuts, or hide fully? (plan keeps as shortcuts)
- Draft/branch: wire to real API branches now, or client-only change counter first?
- Light theme: IcePanel editor is dark-only — OK to drop light canvas in studio?
- Technology icon set: ship bundled logo set (which pack?) or load from a CDN?
