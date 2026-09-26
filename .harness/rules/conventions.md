# Conventions

Naming, structure, git, and session hygiene. Small rules that keep the harness legible across many sessions and agents.

## Ids
Stable, opaque, type-prefixed: `sys_`, `app_`, `sto_`, `cmp_`, `act_`, `grp_`, `con_`, `vw_`, `flw_`, `dec_`, `ver_`. Immutable once assigned. Used identically in DB, API, URLs, logs, and AI references.

## TypeScript
Strict mode on. No `any` without a `// why:` comment. Domain types live in `packages/domain` and are imported everywhere else; never redefine a model type in the frontend. Prefer explicit return types on exported functions.

## Files & folders
Follow `architecture/ARCHITECTURE.md` §repository shape. One module per domain area. Colocate tests with code (`*.test.ts`). No file over ~400 lines without a reason.

## Git
- One feature per branch: `feat/<feature-id>` matching the `id` in `ROADMAP.md`.
- Conventional commits: `feat(model): add connection CRUD`, `fix(canvas): stop drag from mutating store`. Reference the feature id in the body.
- Commit only when the feature (or a coherent sub-step) is green and has evidence. No "wip" on main.
- Never commit secrets, `.env`, or generated artifacts.

## Evidence discipline
A feature is `passed` only with recorded evidence in `CHANGELOG.md`: the exact command, its output (or a screenshot path under `.harness/evidence/`), or a test id. "Looks right" is not evidence. Screenshots for canvas features; command output for API/data features. See `verification/acceptance-evidence.md`.

## Logging
Structured logs (json) with `level`, `event`, `correlationId`, and relevant ids. Log at: process start, each layer boundary crossing (API in/out, job start/end), and every caught error with cause. See `scripts/SCRIPTS.md` → logger contract.

## Session hygiene (do this before you stop, every time)
1. Update `ROADMAP.md` (status + evidence).
2. Append a dated entry to `CHANGELOG.md`.
3. Rewrite `PROJECT_STATE.md` for a cold reader.
4. Run `state/clean-state-checklist.md`. Leave the tree clean.
5. Commit with the feature id.

## Comments & docs
Comment *why*, not *what*. Update the affected `.harness` doc in the same change that makes it stale (e.g. new endpoint -> update API_SURFACE.md). Stale docs are worse than none.

## Definition of "modular"
Before adding a capability, check `architecture/MODULES.md`: can this be a registration instead of a core edit? If yes, do that. If it forces a core change, either the abstraction is missing (add it) or the change is genuinely core (justify it in the sprint contract).
