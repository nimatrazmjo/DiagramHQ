# Clean-State Checklist

Run before you stop and before you start (init verifies the "start" half). A dirty state is how the next session loses hours. Tick every box.

## Before starting work
- [ ] `git status` is clean, or the only changes are ones you understand from the handoff.
- [ ] `init` runs green (build + boundary check). If not, fixing it IS your first task.
- [ ] `ROADMAP.md` has exactly one `IN PROGRESS` feature and it matches `PROJECT_STATE.md`.
- [ ] You have read the sprint contract for the active feature.

## Before stopping work
- [ ] Code compiles: `pnpm typecheck` passes (once the app exists).
- [ ] `pnpm lint` passes with no new warnings.
- [ ] `pnpm test` passes; new feature has tests.
- [ ] check-architecture passes — no layer-boundary violations (`rules/layer-boundaries.md`).
- [ ] Evidence for any status change is recorded in `CHANGELOG.md`.
- [ ] `ROADMAP.md` status + evidence updated.
- [ ] `PROJECT_STATE.md` rewritten for a cold reader (active feature + next steps + blockers).
- [ ] No stray files, no secrets, no `.env`, no debug logging left on.
- [ ] Committed on a `feat/<feature-id>` branch (or `docs/<slug>`/`chore/<slug>` for harness-only work — `rules/conventions.md`) with a conventional message.
- [ ] Exactly one `active` feature remains (or all passed and phase advanced).
- [ ] If the feature just went `COMPLETE`: branch pushed, PR opened/reused, reviewed clean — no unresolved findings (`loops/pr-review-loop.md`).

## Red flags that mean "not clean"
- Tests skipped or commented out to make the suite pass.
- A feature marked `passed` with `evidence: null`.
- More than one `active` feature.
- Uncommitted changes with no handoff note.
- A TODO that silently expands scope (move it to the parking lot instead).
