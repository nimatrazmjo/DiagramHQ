# Feature Review: F075 — Code-to-architecture mapping

## Review Outcome: APPROVED

### Checklist
- [x] Dedicated branch used: `feat/F075-code-to-architecture-mapping`
- [x] Pure TypeScript domain layer with zero framework dependencies (`packages/domain/src/code-mapping.ts`)
- [x] Bidirectional mapping: component -> repository -> folder -> file -> line anchors
- [x] Generates canonical remote URLs for both GitHub and GitLab with line ranges
- [x] Normalizes repository coordinates across HTTPS URLs, SSH URIs (`git@`), and slugs
- [x] Strict invariant enforced: every mapped component links directly to its repo path
- [x] Canvas UI provides `<CodeMappingBadge />`, `<OpenInRepoButton />`, and `<CodeMappingEditorDrawer />`
- [x] 100% test pass rate across monorepo (179 test suites, 1093 tests passed)
- [x] Zero TypeScript errors, zero ESLint warnings, architectural boundary script clean, production builds clean

### Verified Commands
```bash
pnpm typecheck          # Exit 0
pnpm lint               # Exit 0
pnpm check-architecture # Clean
pnpm test               # 179 passed, 1093 tests passed
pnpm build              # Exit 0
```
