# Modules — Modular & Expandable by Design

"Modular and expandable" means one thing concretely: **new capabilities register against interfaces; they do not edit the core.** If adding an object type, a view, an importer, or an AI action forces a change to a switch statement in the core, the abstraction has failed. This file defines the registries. Rule 6 in `AGENTS.md` enforces them.

## The registry pattern

Each extension point is a registry: a typed interface + a `register()` call + core code that iterates the registry instead of hard-coding cases. Registries are populated at startup. A plugin is a package that calls `register()` for one or more extension points.

```
Core  ── iterates ──▶  Registry  ◀── register() ──  Module / Plugin
(never edited)                                       (added freely)
```

## Extension points

### 1. Object-type registry
Built-ins: system, application, store, component, actor, group. A module registers a new kind with: `kind`, display metadata (icon, default style), allowed parents, allowed connection kinds, metadata schema, and how it renders in the inspector. Adding "queue" or "external-api" is a registration, not a core edit.

```
registerObjectType({
  kind, label, icon, allowedParents, allowedConnectionKinds,
  metadataSchema, inspectorSection
})
```

### 2. View-type registry
Built-ins: context, container, component, security, data, ownership, technology, custom. A module registers a view with: `kind`, a `filter(model) -> objects` function, a layout hint, and optional overlays (e.g. security overlays trust boundaries). New perspectives are new registrations.

```
registerViewType({ kind, label, filter, layoutHint, overlays })
```

### 3. Importer registry
Built-ins (Phase 4): github, gitlab, terraform, kubernetes, openapi, cloud. An importer implements `scan(config) -> ProposedChangeset` where every proposed object/connection carries `evidence` (source ref). Drift = run importer, diff against documented version.

```
registerImporter({ source, configSchema, scan })
```

### 4. Exporter registry
Built-ins: png, svg, pdf, mermaid, plantuml, structurizr, yaml (model-as-code). An exporter implements `export(view|model) -> artifact`.

```
registerExporter({ format, export })
```

### 5. AI-action registry
Built-ins: analyze, explain, generate, validate, compare, refactor, simulate, document, search, update, review. Each action implements `run(context) -> Result`, where mutating actions return a proposed changeset for approval. New AI verbs are registrations, surfaced automatically in the Copilot palette.

```
registerAiAction({ verb, description, run, mutating })
```

### 6. Layout-engine registry
Auto-layout strategies (dagre, elk, force, manual). A view picks an engine by hint; new engines register without touching the canvas.

```
registerLayoutEngine({ name, layout })
```

### 7. Canvas-renderer interface
Not a registry but a swap point: `CanvasRenderer` abstracts React Flow behind an interface (`mount`, `renderNodes`, `renderEdges`, `onInteraction`). This is what lets PixiJS/WebGL replace React Flow at scale without rewriting interactions (ADR-0002).

## Where registries live

`packages/domain` owns the interfaces (framework-free). Built-ins register in their own modules under `apps/api` / `apps/web` — **except** a built-in that is itself pure, framework-free computation with no I/O (e.g. the layout-engine registry's `grid`/`layered`/`radial`/`forceDirected` implementations, F015): those register from their own modules *inside* `packages/domain`, next to the registry, on the same footing as `alignment.ts`. The dividing line is Rule 1 in `rules/layer-boundaries.md` (no framework imports in `packages/domain`), not physical location — an importer/exporter/AI-action built-in almost always needs I/O or a framework and so belongs under `apps/*`; a layout algorithm is just math and belongs wherever the other pure math already lives. Third-party/enterprise plugins register the same way, from wherever suits them. The core imports the registry, never the modules.

## Test of a good module

Ask: could a second team ship this as a separate package without a PR to the core? If no, refactor until yes. Every flagship feature in `product/PRODUCT.md` should map to one or more registrations here, not to core edits.
