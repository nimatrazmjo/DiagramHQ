# Phase 14 — UX Remediation

Status: IN PROGRESS

## Description

Turn the product from a convincing demo into one coherent, model-first editor.
Derived from the UX teardown (`docs/ux-review.html`). Two themes:

1. **Trust & convention** (cheap, high-frequency) — stop surprising users who
   know Figma/draw.io, and stop presenting simulated features as real.
2. **The moat** (expensive, decisive) — make the model-first behaviors actually
   work: one editor wired to the model, real C4 drill-down, real views.

Build order below is the review's recommended order: low-effort trust/friction
fixes first (F136–F140), then unification and the signature interactions
(F141–F143), then the decisive model-wiring (F144–F145).

Guiding principles (full list in `docs/ux-review.html` §14):
- Model once, draw never twice. Nothing in the UI is a prop. The canvas never
  surprises a Figma user. Hide the plumbing. Depth is navigation, not a label.

## Dependencies

Phases 01–04 (foundation, canvas, model, views). Backend model API already
exists (`/architectures/:id/objects|connections`, `/views/*`) — unused by the
studio editor today.

## Features

### F136 — Honest surface: gate simulated features

Status: COMPLETE

Priority: P0 · Effort: Low

Description: Every control that is not wired to real data is labelled "Preview"
or removed from the default view. Repairs trust before anything else.

Simulated today (studio top bar + panels): presence peers (`INITIAL_PEERS`),
comments, PR review, branches/snapshots/visual diff, and the four "AI" actions
(deterministic domain functions, not model calls).

Requirements:
- Introduce a single `PREVIEW` flag/registry for not-yet-real features.
- Wrap each simulated trigger with a visible "Preview" affordance (badge +
  tooltip) or hide it behind an overflow "Labs" menu.

Acceptance Criteria:
- No unlabelled simulated control appears in the default studio view.
- Preview controls carry a consistent "Preview — not saved" badge.
- Real controls (add, connect, inspector, autosave, export, layout, undo,
  share-link) are unaffected.

Files:
- `apps/web/app/studio/page.tsx` (top-bar triggers ~1507–1804; seed fixtures
  `INITIAL_PEERS`, comments, `architecturePR`, `INITIAL_BRANCHES`, snapshots)
- new `apps/web/lib/preview-flags.ts`

Test: studio renders with 0 unlabelled preview controls; a preview control shows
the badge; a real control (add object) still works.

Success metric: 0 unlabelled simulated controls in default view.

---

### F137 — Inline rename & edge labels

Status: COMPLETE

Priority: P1 · Effort: Low

Description: Double-click a node to rename in place; double-click an edge to
label it. Removes the most frequent friction (naming currently costs 3+
interactions via the inspector; labelling an edge costs 4).

Requirements:
- Double-click on a node label enters edit mode; Enter/blur commits, Esc cancels.
- Double-click on an edge opens an inline label editor at the edge midpoint.
- Commit routes through the command stack (see F143) so it is undoable.

Acceptance Criteria:
- Name a new object in ≤ 2 interactions.
- Label a connection in ≤ 2 interactions.
- Inspector editing still works and stays in sync.
- Edit mode ignores canvas delete/select keybindings while focused
  (`isTextInput` guard already exists in `infinite-canvas.tsx`).

Files:
- `apps/web/components/canvas/custom-nodes.tsx` (node label editing)
- `apps/web/components/canvas/icepanel-edge.tsx` (edge label editing)
- `apps/web/components/canvas/infinite-canvas.tsx` (double-click handlers)

Test: double-click node → type → Enter renames; double-click edge → type labels;
⌘Z reverts both.

Success metric: name-object ≤ 2, label-edge ≤ 2 interactions.

---

### F138 — Canvas context menus

Status: COMPLETE

Priority: P1 · Effort: Low

Description: Right-click menus on node, edge and pane. The universal "act on the
thing" affordance is entirely absent today (0 context-menu handlers in repo).

Requirements:
- Node menu: Rename, Duplicate, Delete, Add connection, Add to view, Drill in.
- Edge menu: Edit label, Reverse, Delete.
- Pane menu: Add object (by kind), Paste, Select all, Fit view, Auto-layout.
- Keyboard-dismissible; positioned within viewport bounds.

Acceptance Criteria:
- `onNodeContextMenu`, `onEdgeContextMenu`, `onPaneContextMenu` wired.
- Each action dispatches the same command path as its toolbar/inspector twin.
- Menu closes on Esc, outside-click, and action.

Files:
- new `apps/web/components/canvas/context-menu.tsx`
- `apps/web/components/canvas/infinite-canvas.tsx`

Test: right-click node shows menu; Duplicate adds a copy; Delete removes it;
right-click pane → Add object creates one at the cursor.

Success metric: > 60% of object actions initiated from the context menu in
instrumented sessions.

---

### F139 — Clipboard, duplicate & default marquee-select

Status: NOT STARTED

Priority: P1 · Effort: Low

Description: Canvas-convention parity. Add ⌘C/⌘V/⌘D and alt-drag duplicate, and
make dragging empty canvas marquee-select by default (today box-select is a
mode toggle; `selectionOnDrag` is off).

Requirements:
- ⌘C copies selection (nodes + internal edges) to an in-app clipboard.
- ⌘V pastes at cursor with new ids and a small offset; ⌘D duplicates in place.
- Alt-drag on a node duplicates it.
- `selectionOnDrag` on by default; Space still pans; Shift still adds to
  selection. Retire or demote the "Box Select" toggle.

Acceptance Criteria:
- Duplicate an object in 1 interaction.
- Copy/paste preserves kind, metadata and relative layout; ids are regenerated.
- Dragging empty canvas draws a marquee and selects enclosed nodes.
- All of the above are undoable.

Files:
- `apps/web/components/canvas/infinite-canvas.tsx` (keydown, `selectionOnDrag`)
- `apps/web/lib/commands/` (new paste/duplicate commands)
- `apps/web/lib/canvas-store.ts` (`isBoxSelectMode` default/removal)

Test: ⌘D duplicates; ⌘C/⌘V round-trips a 2-node + 1-edge selection; empty-drag
marquee-selects; ⌘Z reverts.

Success metric: duplicate workflow = 1 interaction.

---

### F140 — IA cleanup: hide plumbing, one brand, honest copy

Status: NOT STARTED

Priority: P2 · Effort: Low

Description: Stop leaking the internal model to the surface and stop confusing
the user about which product they are in.

Observed: dashboard shows org `slug`, org `id`, `User ID` as primary content;
workspace header shows raw `workspaceId`; dashboard brands as "Architecture OS"
while studio brands as "DiagramHQ"; landing copy still says "the infinite canvas
arrives in Phase 02".

Requirements:
- Remove raw ids/slugs from primary UI (keep in a dev/debug affordance only).
- One product name everywhere.
- Rewrite landing copy to match reality; primary CTA into the real editor.

Acceptance Criteria:
- 0 raw ids/slugs in default dashboard/workspace views.
- Single brand name across landing, dashboard, studio, navigator footer.
- Landing copy contains no stale phase references.

Files:
- `apps/web/app/dashboard/page.tsx`, `apps/web/app/page.tsx`
- `apps/web/app/workspace/[workspaceId]/page.tsx`
- `apps/web/components/shell/left-navigator.tsx` (footer "Architecture OS")

Test: dashboard + workspace render with no visible ids/slugs; landing copy
asserted free of "Phase 02".

Success metric: 0 raw IDs on screen.

---

### F141 — Unify to one canvas

Status: NOT STARTED

Priority: P0 · Effort: Medium

Dependencies: F137, F138, F139

Description: Collapse the four surfaces to one editor. Delete the hand-rolled SVG
canvas and embed the studio React Flow editor in the workspace shell. Fix the
duplicate zoom clusters and the colliding bottom-left panels.

Observed: `/canvas/[workspaceId]/[diagramId]` is a separate SVG canvas with its
own select/connector/hand modes; the workspace overview embeds a second, weaker
canvas; React Flow's native `<Controls>` (bottom-left) coexists with the custom
pan/zoom toolbar (top-right) and the auto-layout menu overlaps the native
controls.

Requirements:
- Remove the `/canvas/*` SVG implementation; route any links to the unified
  editor.
- Workspace shell hosts the same `InfiniteCanvas` editor.
- One zoom/pan cluster (recommend bottom-right); drop React Flow default
  `<Controls>`; give the layout menu its own corner.

Acceptance Criteria:
- Exactly one canvas editor implementation remains in the repo.
- No overlapping control clusters at desktop or phone width.
- Entering the editor from dashboard, deep link, or share lands in the same UI.

Files:
- delete `apps/web/app/canvas/[workspaceId]/[diagramId]/page.tsx`
- `apps/web/components/canvas/infinite-canvas.tsx` (Controls/MiniMap/panels)
- `apps/web/app/workspace/[workspaceId]/*`

Test: grep shows one canvas editor; workspace route renders the unified editor;
no panel overlap at 400px.

Success metric: 1 editor implementation in repo.

---

### F142 — Real C4 drill-down

Status: NOT STARTED

Priority: P0 · Effort: Medium

Dependencies: F141

Description: Make level switching real navigation over a parent/child hierarchy,
not a breadcrumb relabel. Today `displayNodes` ignores `c4Level`
(`app/studio/page.tsx:1169`) so the graph is identical at every level.

Requirements:
- Model/respect a containment hierarchy (system → container → component).
- Context/Container/Component filter the canvas to the relevant level.
- Double-click a system descends into its containers; breadcrumb ascends.

Acceptance Criteria:
- Switching level changes the visible graph.
- Double-click-to-descend and breadcrumb-to-ascend both work.
- Objects without children degrade gracefully (no empty dead-ends).

Files:
- `apps/web/app/studio/page.tsx` (`displayNodes`, `c4Level`, breadcrumb)
- `apps/web/components/canvas/infinite-canvas.tsx` (double-click descend)
- `packages/domain` (hierarchy/containment helpers if needed)

Test: at L1 only systems show; double-click a system reveals its containers;
breadcrumb returns to L1.

Success metric: drill-down usage > 0 (today ~0).

---

### F143 — Command palette (⌘K) + total undo coverage

Status: NOT STARTED

Priority: P1 · Effort: Medium

Dependencies: F137

Description: Add a ⌘K palette over objects + actions, and route EVERY mutation
through the command stack so undo is total. Today inspector edits and
inspector-created connections mutate state directly and cannot be undone;
creation via palette vs inspector take different code paths.

Requirements:
- ⌘K opens a palette: fuzzy-search objects (jump/select) and run actions
  (add kind, auto-layout, toggle view, drill, export, share).
- Inspector metadata edits and inspector connections dispatch commands.
- Single mutation path shared by palette/sidebar/inspector/canvas.

Acceptance Criteria:
- ⌘K finds an object in ≤ 2s and selects/centres it.
- Rename, description, technology, and inspector-created connections are
  undoable with ⌘Z.
- No mutation bypasses the dispatcher.

Files:
- new `apps/web/components/shell/command-palette.tsx`
- `apps/web/app/studio/page.tsx` (`handleMetadataChange`,
  `handleConnectNodesFromInspector` → commands)
- `apps/web/lib/commands/`

Test: ⌘K → type → Enter centres object; rename then ⌘Z reverts; inspector
connection then ⌘Z removes it.

Success metric: find-component ≤ 2s; 0 non-undoable mutations.

---

### F144 — Wire the editor to the model API

Status: NOT STARTED

Priority: P0 · Effort: High

Dependencies: F141, F142

Description: The decisive change. Objects persist as objects via the existing
model API; the canvas becomes a view (membership + layout) over that model —
not a JSON blob in `workspace.settings.studioDiagram`.

Requirements:
- Load/create an architecture + view for the editor session.
- Create/update/delete objects and connections through
  `/architectures/:id/objects` and `/connections` (optimistic + rollback, as the
  move commands already do).
- Positions persist per view via `/views/:viewId/objects/positions`.
- Keep guest/local mode working for the no-login open.

Acceptance Criteria:
- A created object exists as a model object (visible via the model API), not
  only in a diagram blob.
- Reopening loads from the model, not a blob.
- Autosave status reflects real model writes.

Files:
- `apps/web/app/studio/page.tsx` (replace blob state with model-backed)
- `apps/web/lib/model/architecture-model-client.ts`
- `apps/web/app/api/diagrams/autosave/route.ts` (retire blob or migrate)
- API: `apps/api/src/architectures/*`, `apps/api/src/views/*` (reuse)

Test: create object in editor → GET `/architectures/:id/objects` returns it;
reload restores from model; e2e covers create→reload.

Success metric: activation = first real object persisted to a model.

---

### F145 — Real views: reuse objects across views

Status: NOT STARTED

Priority: P1 · Effort: Medium

Dependencies: F144

Description: Deliver the one thing that beats draw.io — one object, many views.
Replace the perspective-overlay-only model (security/data/ownership just toggle
badges on one canvas) with independent views, each with its own object
membership and layout, over the shared model.

Requirements:
- Create/switch views; each stores selection + layout, never objects.
- Add an existing object to another view in ≤ 2 interactions.
- Removing an object from a view keeps it in the model (invariant already in
  domain).

Acceptance Criteria:
- Same object appears in ≥ 2 views; editing it once updates all views.
- Remove-from-view ≠ delete-object (verified).
- Per-view layout persists independently.

Files:
- `apps/web/app/studio/page.tsx` (view switcher → real views)
- `apps/web/components/canvas/icepanel-sidebar.tsx` (Diagrams tab → real views)
- API: `apps/api/src/views/*` (reuse `/views/:viewId/objects`, projection)

Test: add object to a second view; edit its name once → both views reflect it;
remove from view A → still present in model and view B.

Success metric: reuse rate > 0 (% of objects in ≥ 2 views).

## Phase acceptance

- Trial users never ask "is this real?" (no unlabelled props).
- Canvas follows Figma/draw.io conventions (right-click, double-click, clipboard,
  marquee default).
- One editor; drill-down works; objects persist to the model; one object appears
  in many views.
- Before/after interaction budgets in `docs/ux-review.html` §20 met.
