# F097 — Mermaid — Code Review

## Review Criteria Check
- **Acceptance Criteria**:
  - [x] Export to Mermaid: flowchart and sequence diagram
  - [x] Import from Mermaid: import a Mermaid script into DiagramHQ
  - [x] Test: export -> Mermaid renders; round-trip import
- **Layer Boundaries**: Clean separation — pure domain logic in `packages/domain/src/mermaid.ts` with no React/DOM dependencies; UI in `apps/web/components/canvas/mermaid-modal.tsx`.
- **Quality Gates**:
  - `pnpm typecheck`: Clean across all packages
  - `pnpm lint`: Clean across workspace
  - `pnpm check-architecture`: Clean
  - Domain tests: 95 test files / 569 tests passing (+8 tests)
  - Web tests: 109 test files / 561 tests passing (+4 tests)
  - `pnpm build`: Clean production build

## Key Architectural Findings
- **Bidirectional Conversion**: Supports both export (view -> flowchart, flow -> sequence) and import (flowchart -> objects + connections, sequence -> participants + flow steps), facilitating easy interoperability with existing Markdown documents and Git repos.
- **C4 Kind-Aware Syntax**: Maps C4 entity kinds directly to Mermaid shape semantics (stadium for actors, cylinders for databases/stores, subroutines for components, rounded rectangles for systems/apps) and applies distinct theme class styles.
- **Robust Line-by-Line Tokenizer**: Implements resilient parsing capable of handling comments (`%%`), subgraphs, direction headers, aliases (`participant A as Label`), arrow styles (`->>`, `-->>`, `-.->`), and inline notes without external runtime parser dependencies.

## Verdict
APPROVED — Ready for merge into `main`.
