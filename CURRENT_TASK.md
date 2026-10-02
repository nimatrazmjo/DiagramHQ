# Current Task: F075 — Code-to-architecture mapping

**Status**: NOT STARTED

## Description
Code-to-architecture mapping engine for DiagramHQ. Establishes bidirectional traceability linking C4 architecture model objects (components, services, datastores) directly to their underlying code repositories, folders, file paths, and symbol definitions:
- Maps `ModelObject` -> repository (`provider`, `owner`, `repo`), branch/ref, directory path, file path, line numbers.
- Computes canonical remote repository deep links: "Open in GitHub" (`https://github.com/owner/repo/blob/main/path/to/file#L10-L20`) and "Open in GitLab" (`https://gitlab.com/owner/repo/-/blob/main/path/to/file#L10-L20`).
- Validates repository path integrity and updates code mappings when repository paths change.
- Strict Invariant Enforced: Every code-mapped component deterministically links to its repo path and generates valid remote URLs.

Acceptance Criteria:
- Map component -> repository -> folder -> file; open-in-GitHub / open-in-GitLab.
- Test: a component links to its repo path.

- Feature ID: F075
- Phase: 09 — Code Integrations
- Dependencies: F072, F073

## Next Steps
1. In `packages/domain/src/`, implement code-to-architecture mapping domain logic (`code-mapping.ts`):
   - Model `CodeMapping`, `RepositoryRef`, `CodeLocationSpec`.
   - Implement `createCodeMapping`, `generateRemoteRepositoryUrl`, `getCodeMappingForObject`, `updateCodeMapping`.
   - Domain unit tests in `packages/domain/src/code-mapping.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<CodeMappingInspector />`, `<OpenInRepoButton />` in `apps/web/components/canvas/code-mapping-panel.tsx`.
   - Integration specs in `apps/web/code-mapping.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
