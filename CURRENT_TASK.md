# Current Task: F121 — Specialized agents

**Status**: NOT STARTED

## Description
Specialized AI role-based subagents operating over the Model Context Protocol (MCP) tool surface in DiagramHQ. Dispatches domain-calibrated AI agents tailored to specific architectural disciplines:
- Specialized Agent Roles:
  - `Analyst`: inspects models for domain boundaries, cohesion, coupling, and requirement alignment.
  - `Designer`: generates and evaluates C4 component topology, container layout, and interface schemas.
  - `Security`: performs automated threat modeling, perimeter ingress validation, and PII exfiltration scans.
  - `Cloud`: audits infrastructure mapping, multi-AZ high availability, and cloud vendor service selection.
  - `Documentation`: synthesizes C4 architecture diagrams, Markdown catalogs, and linked ADRs.
  - `Migration`: formulates transition scenarios, phasing roadmaps, and decommissioning sequences.
  - `Code`: validates repository code-to-architecture mapping, AST call graphs, and drift detection.
- Acceptance criteria:
  - Analyst, Designer, Security, Cloud, Documentation, Migration, Code agents on the MCP surface
  - Test: each agent completes a scoped task.

- Feature ID: F121
- Phase: 08 — AI Copilot
- Dependencies: F071, F120

## Next Steps
1. In `packages/domain/src/`, implement specialized role agents (`specialized-agents.ts`):
   - Define role types (`SpecializedAgentRole = 'analyst' | 'designer' | 'security' | 'cloud' | 'documentation' | 'migration' | 'code'`).
   - Define agent interface and task execution dispatch (`SpecializedAgentContext`, `SpecializedAgentTask`, `SpecializedAgentResult`).
   - Implement execution logic for all 7 role agents executing scoped tasks on the MCP tool surface.
   - Unit tests in `packages/domain/src/specialized-agents.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<SpecializedAgentSelector />` and `<SpecializedAgentDrawer />` in `apps/web/components/canvas/specialized-agents-panel.tsx`.
   - Integration specs in `apps/web/specialized-agents.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
