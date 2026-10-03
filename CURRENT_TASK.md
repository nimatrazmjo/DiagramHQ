# Current Task: F098 — PlantUML

**Status**: COMPLETE

## Description
PlantUML Export and Import Engine for Architecture Diagrams and Execution Flows (Phase 12 — Documentation):
- Export capabilities:
  - C4 / Architecture Views -> PlantUML:
    - Support for official C4-PlantUML macro syntax (`C4_Context.puml`, `C4_Container.puml`, `C4_Component.puml`):
      - `Person(alias, label, desc)`
      - `System(alias, label, desc)`
      - `Container(alias, label, technology, desc)`
      - `ContainerDb(alias, label, technology, desc)`
      - `Component(alias, label, technology, desc)`
      - `Rel(src, tgt, label, tech)`
      - `System_Boundary`, `Container_Boundary`
    - Support for Native PlantUML component diagram syntax (`component`, `database`, `actor`, `package`, `folder`, `-->`).
    - Configurable layout direction (`top to bottom`, `left to right`), title, styling, and legend (`SHOW_LEGEND()`).
  - Execution Flows -> PlantUML Sequence Diagrams:
    - Standard sequence headers: `@startuml ... @enduml`.
    - `autonumber` support.
    - `actor`, `participant`, `database`, `queue` declarations with aliases.
    - Message requests (`->`, `->>`), responses (`-->`), status codes, notes (`note over`, `note right of`), and divider markers (`== Step Name ==`).
- Import capabilities:
  - PlantUML Parser (`importPlantUml`):
    - Parses both C4 macros (`System(...)`, `Container(...)`, etc.) and standard PlantUML (`component`, `database`, `actor`, `-->`) into DiagramHQ `ModelObject` and `ModelConnection`.
    - Parses PlantUML sequence diagrams into `FlowWithSteps`.
- Interactive Canvas UI (`PlantUmlModal`):
  - Dual tabs: Export (mode selector, live syntax-highlighted preview, copy, download `.puml`) and Import (paste PlantUML script, live validation and entity preview, apply to active model).
- Acceptance criteria:
  - Export diagrams/flows to PlantUML
  - Test: export -> valid PlantUML.

- Feature ID: F098
- Phase: 12 — Documentation
- Dependencies: Phase 03, Phase 04

## Next Feature
- **F099 — PDF**
