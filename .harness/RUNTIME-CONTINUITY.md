# Runtime Continuity — Claude Code ⇄ Antigravity

Keep building without interruption when one agent runtime hits its usage/session limit, by failing over to the other. This works because **the harness is the source of truth, not the conversation** — any runtime resumes from `PROJECT_STATE.md`. It is the multi-session-continuity design (Learn-Harness-Engineering Project 03) applied across *tools*, not just sessions.

## The two runtimes
| Runtime | Launch (in the repo) | Model | Role |
|---|---|---|---|
| Claude Code | `claude` | Claude (CLI default) | Primary — where you start |
| Antigravity CLI | `agy` | Claude **Sonnet** (via `/model`) | Failover |

Antigravity install (once): `curl -fsSL https://antigravity.google/cli/install.sh | bash`, then `agy --version`. Auth: run `agy` (opens a browser) or `export ANTIGRAVITY_API_KEY=...`.

## The principle
Nothing important lives in the chat. Before a runtime stops (or when it hits a limit) it commits its work and writes the exact next step into `CURRENT_TASK.md`. The other runtime reads `PROJECT_STATE.md → CURRENT_TASK.md → ROADMAP.md → the active phase file`, inspects the code (the codebase is the source of truth for what exists), and continues the one active feature. No context is lost.

## Trigger
The active runtime reaches its usage/session limit (a rate-limit or max-session message).

## Handoff protocol (in order)
1. **Finish the current safe step** — don't stop mid-edit; get the tree compiling.
2. **Run the Session-completion protocol** (`AGENTS.md`): update `PROJECT_STATE.md`, `CURRENT_TASK.md` (exact next step — file + function), `ROADMAP.md`, `CHANGELOG.md`; open/close `BLOCKERS.md`; commit on the `feat/<FID>` branch. **Never leave the tree dirty.**
3. **Log the switch** in `RUNTIME-SWITCHES.md`.
4. **Start the other runtime** in the repo and give it the resume bootstrap below.
5. **Alternate** on each subsequent limit.

## Resume bootstrap (paste into whichever runtime you start)
> Resume DiagramHQ. Read `.harness/PROJECT_STATE.md`, then `CURRENT_TASK.md`, then follow `.harness/AGENTS.md`. Work only the one active feature. Do NOT restart from Phase 1.

## Manual switching
Start (Claude Code):
```
cd <repo> && claude "<resume bootstrap>"
```
On Claude Code limit → Antigravity (Sonnet):
```
cd <repo> && agy          # then: /model → pick Claude Sonnet (persists across sessions), then paste the bootstrap
# or one-shot / headless:  agy -m <sonnet-model-id> -p "<resume bootstrap>"
```
On Antigravity limit → back to Claude Code:
```
cd <repo> && claude "<resume bootstrap>"
```
Find the exact Sonnet id from `agy` → `/model` (the list includes Claude Sonnet). `/model` persists, so you normally set it once.

## Automated relay (optional)
`scripts/agent-relay.sh` alternates between the two: it launches one runtime, and when that runtime exits (e.g. on a limit) it launches the other, looping. It pauses for a keypress before each switch so a normal quit doesn't ping-pong. Set the exact Sonnet id via `AGY_SONNET_MODEL`.
```
./scripts/agent-relay.sh          # start with Claude Code
./scripts/agent-relay.sh agy      # start with Antigravity
```
Caveat: the script treats any exit as a switch signal. To switch **only** on a real limit (not a normal quit), tune it to detect the tool's limit message — see the script header.

## Guardrails
- One active feature at a time (whatever `CURRENT_TASK.md` says). A switch changes *who* works, never *what* is worked on.
- Commit before switching; the receiving runtime trusts committed code over stale tracking and reconciles per `AGENTS.md`.
- If a limit hits mid-feature, `CURRENT_TASK.md` must record the exact next step so the other runtime continues rather than restarts.
- Antigravity runs **Sonnet** here to stay in Claude Code's model family; keep the choice deliberate.

## Platform & environment notes (learned 2026-09-26)
Separate from the two-runtime relay above — this is about *where* those runtimes execute, not a third node in the alternation. Claude Code / `agy` normally run on the macOS host (darwin-arm64, Docker + full network). This repo has also been touched between relay sessions by a cloud Cowork session running in a Linux VM that mounts the repo; that VM is **not** part of `scripts/agent-relay.sh`'s rotation (still Claude Code ⇄ Antigravity only) and never triggers or receives a handoff itself — treat any Cowork-touched state the same as any other uncommitted change you find in the tree (inspect, don't assume).

`node_modules` lives in the repo folder, so its **native binaries belong to whichever platform installed last**. After a cross-platform touch (Cowork VM, or any non-macOS environment), reinstall before running native-dependent tools:
```
pnpm install            # rebuilds rollup / esbuild / Next SWC / Prisma engine for this platform
```

Also, the Linux VM's egress blocks `binaries.prisma.sh`, so `prisma generate` and DB-backed tests can't run there. **Division of labor when a Cowork session is involved:** it does design, code, `typecheck`, `lint`, docs and tracking; the macOS host and CI run `test`, `build`, `prisma generate/migrate`, and the Postgres-backed suites. CI (`.github/workflows/ci.yml`) provisions Postgres + generates the Prisma client, so it is the authoritative full-verification gate regardless of which environment wrote the code.
