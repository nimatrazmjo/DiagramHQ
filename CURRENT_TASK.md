# Current Task: F047 — API flows

**Status**: NOT STARTED

## Description
Flow type for API requests and exporter to Mermaid and PlantUML sequence diagrams.
- Flow type: `api_flow`
- Acceptance criteria:
  - API-request flow type (`kind: 'api_flow'`, HTTP method, endpoint, request/response schema, status code).
  - Sequence diagram exporter: export API flow sequence to Mermaid sequence diagram syntax (`sequenceDiagram`) and PlantUML (`@startuml ... @enduml`).
  - Test: an API flow exports to Mermaid and plays back.

## Next Steps
1. Review `PHASE-05-FLOWS.md` for F047 acceptance criteria.
2. In `packages/domain/src/`, implement API-flow creation (`createApiFlow()`), step annotation (`annotateApiFlowStep()`), and sequence diagram exporters (`exportFlowToMermaidSequence()`, `exportFlowToPlantUMLSequence()`).
3. Add domain unit tests in `packages/domain/src/api-flows.test.ts`.
4. Add web UI component/integration tests in `apps/web/components/canvas/api-flow-overlay.tsx` and `apps/web/api-flows.spec.tsx`.
5. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
