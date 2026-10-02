# Current Task: F071 — MCP integration

**Status**: NOT STARTED

## Description
Model Context Protocol (MCP) server implementation for DiagramHQ. Equips LLMs and external IDE copilot agents (Cursor, Claude Desktop, Antigravity, etc.) with standardized MCP tools to query, inspect, and safely propose modifications to architecture models:
- Read / Query Tools:
  - `search_architecture`: keyword and filter search over objects, connections, and views
  - `get_object`: retrieves full object specifications, metadata, interfaces, and owner
  - `get_dependencies`: returns upstream components and services that target depends on
  - `get_dependents`: returns downstream components and services that depend on target
  - `analyze_impact`: calculates blast radius, affected flows, affected teams, and SPOF risks
  - `compare_versions`: computes semantic diff across two versions or branches
- Action / Authoring Tools (Strict Invariant: Mutating tools return a proposal, never a silent commit):
  - `create_object`: returns reviewable proposal to add object
  - `update_object`: returns reviewable proposal to modify object attributes or metadata
  - `delete_object`: returns reviewable proposal to decommission object
  - `create_diagram`: returns reviewable proposal for new C4 projection or view
  - `create_flow`: returns reviewable proposal for new runtime flow with ordered steps
  - `create_change`: creates explicit change set proposal
  - `review_change`: triggers automated architecture review checklist and verdict
  - `create_adr`: drafts structured ADR proposal linked to an architecture change
- Acceptance criteria:
  - Tools: search_architecture, get_object, create_object, update_object, delete_object, get_dependencies, get_dependents, analyze_impact, create_diagram, create_flow, compare_versions, create_change, review_change, create_adr
  - Mutating tools return a proposal, never a silent commit
  - Test: each tool callable; create_object returns a proposal.

- Feature ID: F071
- Phase: 08 — AI Copilot
- Dependencies: Phase 03, Phase 04, Phase 05, Phase 07, F063, F064, F066, F069, F070

## Next Steps
1. In `packages/domain/src/`, implement MCP tool registry & dispatcher (`mcp-server.ts`):
   - Protocol types: `MCPToolDefinition`, `MCPToolCall`, `MCPToolResult`, `MCPProposalResult`.
   - Implement all 14 required tools:
     - `search_architecture`
     - `get_object`
     - `create_object` (returns proposal)
     - `update_object` (returns proposal)
     - `delete_object` (returns proposal)
     - `get_dependencies`
     - `get_dependents`
     - `analyze_impact`
     - `create_diagram` (returns proposal)
     - `create_flow` (returns proposal)
     - `compare_versions`
     - `create_change` (returns proposal)
     - `review_change`
     - `create_adr` (returns proposal)
   - Unit tests in `packages/domain/src/mcp-server.test.ts`.
2. In `apps/web/`, implement canvas UI / devtools panel:
   - `<MCPStatusBadge />` and `<MCPInspectorModal />`.
   - Integration specs in `apps/web/mcp-integration.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
