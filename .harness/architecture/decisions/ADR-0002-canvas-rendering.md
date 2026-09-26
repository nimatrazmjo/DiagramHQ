# ADR-0002: React Flow for MVP, PixiJS/WebGL as the scale path

- **Status:** accepted
- **Date:** 2026-09-25
- **Deciders:** DiagramHQ core

## Context
The canvas is the most performance-sensitive surface. Thousands of DOM/SVG nodes stutter; a WebGL canvas (IcePanel uses Pixi.js) scales but is heavier to build. We need velocity now and headroom later. Slice 1 is Model + Canvas core, so this decision is immediate.

## Decision
Build the MVP canvas on **React Flow** (fast to build, great interaction model, React-native). Isolate all rendering behind a `CanvasRenderer` interface (`../MODULES.md` §7) so the renderer can be swapped to **PixiJS/WebGL** for large models without rewriting selection, drag, routing, or the command layer.

## Consequences
- Positive: fast Phase 1; interactions and state are decoupled from the renderer from day one.
- Negative: the abstraction costs some indirection early, and React Flow's model must be mapped to ours (nodes/edges are projections, not the store).
- Revisit-when: real models exceed ~1–2k visible nodes with interaction lag, or profiling shows DOM rendering as the bottleneck. Then implement the Pixi renderer behind the same interface.

## Alternatives considered
- PixiJS from day one: correct end state, wrong starting cost; slows Phase 1 with no users yet. Deferred.
- Plain SVG/D3: full control, but we would rebuild React Flow's interaction layer. Rejected.
