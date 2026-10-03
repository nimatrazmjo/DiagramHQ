# Current Task: F097 — Mermaid

**Status**: NOT STARTED

## Description
Bidirectional Mermaid Export and Import Engine for Diagrams and Execution Flows (Phase 12 — Documentation):
- Export capabilities:
  - C4 / Architecture Views -> Mermaid Flowcharts (`flowchart TB`, `flowchart LR`):
    - Subgraphs for hierarchy boundaries (System, Container, Component).
    - Node definitions with custom shapes (rectangles, cylinders for databases, rounded boxes, circles for actors).
    - Connections with labels, solid arrows (`-->`), dashed arrows (`-.->`), and bidirectional links.
    - Styling classes (`classDef system`, `classDef container`, `classDef store`, `classDef component`).
  - Execution Flows -> Mermaid Sequence Diagrams (`sequenceDiagram`):
    - `autonumber` support.
    - `participant` and `actor` definitions with aliases.
    - Sequence call messages (`->>`, `-->>`, `-)`), return messages, notes (`Note over`, `Note right of`).
- Import capabilities:
  - Mermaid Flowchart Parser (`importMermaidFlowchart`):
    - Parses subgraphs, nodes, and links into DiagramHQ `ModelObject` and `ModelConnection` representations.
    - Preserves hierarchy (`parentId`) from subgraphs.
    - Auto-classifies node kinds based on shapes (cylinders `[(...)]` -> store, rects `[...]` -> application/system).
  - Mermaid Sequence Diagram Parser (`importMermaidSequence`):
    - Parses participants, message arrows, notes, and order into DiagramHQ `Flow` and `FlowStep` models.
- Round-trip validation:
  - Export -> Import -> Export preservation test.
- Interactive Canvas UI (`MermaidModal`):
  - Dual tabs: Export (copy Mermaid markdown, download `.mmd`) and Import (paste Mermaid script, preview converted nodes/edges, apply to active architecture).
- Acceptance criteria:
  - Export flows/diagrams to Mermaid; import Mermaid
  - Test: export -> Mermaid renders; round-trip import.

- Feature ID: F097
- Phase: 12 — Documentation
- Dependencies: Phase 03, Phase 04

## Next Feature
- **F098 — PlantUML**
