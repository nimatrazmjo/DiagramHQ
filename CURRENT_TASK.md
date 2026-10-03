# Current Task: F130 — Circular + SPOF detection

**Status**: COMPLETE

## Description
Structural risk analysis engine detecting circular dependencies and single points of failure (Phase 11 — Drift and Governance):
- Detect all circular dependency loops with cycle hop paths, synchronicity classification, severity scoring, and breaking edge recommendations.
- Detect Single Points of Failure (SPOFs):
  - High fan-in bottlenecks
  - Sole downstream providers
  - Tarjan cut-vertex articulation points
  - Unreplicated datastores
  - Unmitigated central hubs
- Acceptance criteria:
  - Detect circular dependencies; detect single points of failure
  - Test: seeded cycle detected; SPOF flagged on a fan-in.

- Feature ID: F130
- Phase: 11 — Drift and Governance
- Dependencies: F087

## Next Phase & Feature
- **Phase 12 — Documentation**
- **F092 — Architecture documentation**
