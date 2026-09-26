# Current Task

Feature ID: F001
Feature: Project architecture (pnpm monorepo scaffold + clean baseline)
Status: NOT STARTED
Phase: Phase 01 — Foundation

## Objective
Stand up the monorepo and a clean, reproducible baseline so every later feature has a place to live and `init` can verify the build.

## Completed
- [ ] pnpm workspace created (apps/web, apps/api, packages/domain, packages/config)
- [ ] packages/domain is framework-free (a placeholder model type + one invariant + one test)
- [ ] shared config (tsconfig, eslint, tailwind presets) in packages/config
- [ ] root scripts: typecheck, lint, test
- [ ] init + check-architecture implemented per scripts/SCRIPTS.md
- [ ] CLAUDE.md command table updated with real commands
- [ ] git initialised; first commit

## Current Step
Not started. Begin by creating the pnpm workspace and the four package/app skeletons per `architecture/ARCHITECTURE.md` §repository shape. Write the sprint contract first (`verification/sprint-contract.md`).

## Files Being Modified
- (root) package.json, pnpm-workspace.yaml, tsconfig.base.json
- apps/web, apps/api, packages/domain, packages/config (skeletons)

## Expected Result
`pnpm install && pnpm typecheck && pnpm lint && pnpm test` all pass, and `init` runs green from a clean clone.

## Verification
- [ ] TypeScript: NOT RUN
- [ ] Lint: NOT RUN
- [ ] Unit Tests: NOT RUN
- [ ] Integration Tests: NOT APPLICABLE (scaffold)
- [ ] Build: NOT RUN
- [ ] Manual Verification: NOT RUN

## Next Step
Once F001 is COMPLETE and verified: set F006 (Database foundation) or F002 (Authentication) as the next task per Phase 01 dependencies, update this file and PROJECT_STATE.md.

## Do Not
- Rebuild or reorganise the tracking system.
- Start another feature before F001 is verified.
- Build anything outside Phase 01 (see `rules/scope-guard.md`).
- Introduce a dependency the feature does not need.

## Last Updated
2026-09-25
