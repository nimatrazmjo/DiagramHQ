# Architecture Decisions

Running log of important decisions. Read before making a major architectural change; do not contradict an accepted decision without recording a new one that supersedes it. Deep records for the model/canvas/storage decisions live as full ADRs under `architecture/decisions/` — the DEC entries here index them and add the lighter/process decisions.

## DEC-001
Date: 2026-09-25
Decision: The architecture model (objects + connections) is the source of truth. Diagrams are projections of the model.
Reason: Lets the same object appear in many views; enables reuse, dynamic views, impact analysis, diffing, drift, and agent-editing. The failure mode of every diagram tool is the diagram becoming the database.
Status: Accepted
Full record: `architecture/decisions/ADR-0001-model-first.md`

## DEC-002
Date: 2026-09-25
Decision: PostgreSQL is the primary persistence layer; connections are an adjacency table. No graph database until query latency on real data forces it.
Reason: One datastore, transactional consistency, no new query language; recursive CTEs + Redis caching are enough well past MVP.
Status: Accepted
Full record: `architecture/decisions/ADR-0003-graph-storage.md`

## DEC-003
Date: 2026-09-25
Decision: React Flow for the MVP canvas, isolated behind a `CanvasRenderer` interface; PixiJS/WebGL is the scale path.
Reason: Fast to build now; swap the renderer for large models without rewriting interactions.
Status: Accepted
Full record: `architecture/decisions/ADR-0002-canvas-rendering.md`

## DEC-004
Date: 2026-09-25
Decision: The tracking system is Markdown-first. ROADMAP.md + phases/*.md + PROJECT_STATE.md are the single source of truth for intended state; the earlier machine-readable feature_list.json is retired (archived).
Reason: Matches the PROJECT_STATE.md-first workflow; avoids two competing lists that drift. Human-readable and diff-friendly.
Status: Accepted

## DEC-005
Date: 2026-09-25
Decision: Track features with the 13-phase taxonomy and permanent, phase-independent IDs (F001–F108, extended F109+), rather than the earlier 6-phase `p1-*` scheme.
Reason: ~8-feature phases are real, trackable milestones; a phase-independent ID never lies about where a feature lives, which is essential for a 100+ feature tracker that outlives many sessions.
Status: Accepted (supersedes the 6-phase scheme in the archived feature_list.json)

## DEC-006
Date: 2026-09-25
Decision: The progress counter is a contract (spec in `scripts/SCRIPTS.md`), not committed code, to honour the "no application code yet" constraint. Counts are maintained by hand until the build agent implements the script.
Reason: Keeps the repo code-free during setup; the counter is trivial to implement later from ROADMAP.md.
Status: Accepted

---

## Template
```
## DEC-NNN
Date: YYYY-MM-DD
Decision: ...
Reason: ...
Status: Accepted | Superseded by DEC-XXX
```
