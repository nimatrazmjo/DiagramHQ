# Current Task: F125 — Model-as-code + CLI

**Status**: IN PROGRESS

## Description
Model-as-code serialization engine and `dhq` CLI command surface for DiagramHQ:
- Bidirectional YAML serialization mapping objects and connections by human-readable, deterministic `slug` to stable internal IDs (`ObjectId`, `ConnectionId`).
- Core CLI commands: `dhq login`, `dhq init`, `dhq pull`, `dhq push`, `dhq validate`, `dhq diff`, `dhq deploy`, `dhq export`, `dhq generate`.
- Push-then-pull round-trip fidelity: parsing YAML into domain model and pulling model back into YAML produces equivalent semantic structures without loss.
- Validation: catches syntax errors, dangling connection references, schema mismatches, duplicate slugs, and invalid C4 hierarchy levels.
- CLI argument parsing and execution dispatch with structured output and exit codes.

Acceptance Criteria:
- YAML maps to objects + connections by slug -> stable id
- CLI: dhq login/init/pull/push/validate/diff/deploy/export/generate; push then pull round-trips
- Test: push YAML -> model; pull -> equivalent YAML; validate catches errors.

- Feature ID: F125
- Phase: 09 — Code Integrations
- Dependencies: F007, F075

## Next Steps
1. In `packages/domain/src/`, implement Model-as-code serialization and CLI engine (`model-as-code.ts`):
   - Model `ModelAsCodeDocument`, `ModelAsCodeObject`, `ModelAsCodeConnection`, `CliCommandType`, `CliContext`, `CliExecutionResult`, `ValidationResult`.
   - Implement `serializeModelToYaml`, `parseYamlToModelDocument`, `importModelAsCode`, `validateModelAsCodeDocument`, `diffModelAsCode`, `executeDhqCommand`.
   - Unit tests in `packages/domain/src/model-as-code.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<ModelAsCodeModal />` and `<CliTerminalDrawer />` in `apps/web/components/canvas/model-as-code-panel.tsx`.
   - Integration specs in `apps/web/model-as-code.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
