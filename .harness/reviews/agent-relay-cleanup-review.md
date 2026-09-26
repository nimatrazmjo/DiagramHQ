# Code Review — chore/agent-relay-cleanup-and-runtime-notes (harness tooling)

Branch: `chore/agent-relay-cleanup-and-runtime-notes` -> `main`. Not tied to a ROADMAP feature id.

## PR Review — round 1 (code-review skill, PR #3)
3 findings: `cleanup()` only killed the `caffeinate` helper, never the foreground `claude`/`agy` child — a SIGTERM sent to just the wrapper's PID (not a terminal Ctrl-C, which reaches the whole process group) would leave that child running orphaned; `RUNTIME-CONTINUITY.md`'s new note claimed `pnpm install` alone "rebuilds ... Prisma engine for this platform", contradicting this repo's own `init.sh`, which runs `prisma generate` as a separate step; this harness-only change had no `CHANGELOG.md` entry, violating `conventions.md`'s own session-hygiene rule.

All 3 fixed: `claude`/`agy` are now launched backgrounded (`&` + `wait`) so their PID is capturable, and `cleanup()` kills that PID too — smoke-tested the background+wait+signal-forward pattern in isolation (SIGTERM to the wrapper correctly kills the backgrounded child, verified via `ps` before/after); `RUNTIME-CONTINUITY.md` now calls out `pnpm prisma:generate` as a required second step, not implied by `pnpm install`; added the missing `CHANGELOG.md` entry (this file's own citation). `bash -n scripts/agent-relay.sh` clean.
