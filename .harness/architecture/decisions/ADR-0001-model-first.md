# ADR-0001: Model-first, not diagram-first

- **Status:** accepted
- **Date:** 2026-09-25
- **Deciders:** DiagramHQ core

## Context
The failure mode of every architecture tool is the diagram becoming the database: objects live inside a drawing, the drawing goes stale, and there is no single truth. IcePanel's key insight, and ours, is that the model must exist independently of any diagram. This is the founding decision; most other decisions derive from it.

## Decision
Objects and connections are authoritative, persisted independently of any view. A view/diagram stores only a filter (or explicit object set) plus per-view layout in `view_objects`. The same object appears in many views with different positions. Deleting an object from a view removes only the `view_objects` row. See `../DATA_MODEL.md`.

## Consequences
- Positive: reuse across views, dynamic views, impact analysis, diffing, drift, and agent-editing all become possible because there is one set of entities to reason about.
- Positive: the model is API-first and agent-readable by construction.
- Negative: more upfront modeling than a drawing tool; the canvas must resolve views to objects rather than just render a saved picture.
- Revisit-when: never, without re-founding the product. This is the thesis.

## Alternatives considered
- Diagram-first (store objects in the diagram): simpler to start, but it is the exact product we are replacing. Rejected.
- Hybrid (objects optionally shared): ambiguity about the source of truth; rejected in favor of a hard rule.
