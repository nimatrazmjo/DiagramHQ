#!/usr/bin/env bash
# agent-relay.sh — alternate between Claude Code and Antigravity (agy) across session limits.
# State lives in .harness/, so each runtime resumes from PROJECT_STATE.md. See
# .harness/RUNTIME-CONTINUITY.md for the full protocol.
#
# Usage:  ./scripts/agent-relay.sh [claude|agy]   (default: claude)
# Stop:   Ctrl-C at the switch prompt.
#
# CAVEAT: this treats ANY exit of a runtime as a switch signal (limit OR normal
# quit). To switch only on a real usage limit, capture each runtime's output and
# grep for its limit message before flipping `turn`.
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"
LEDGER="$REPO/.harness/RUNTIME-SWITCHES.md"
SONNET_MODEL="${AGY_SONNET_MODEL:-claude-sonnet}"   # set to the exact id from: agy -> /model
BOOTSTRAP="Resume DiagramHQ. Read .harness/PROJECT_STATE.md, then CURRENT_TASK.md, then follow .harness/AGENTS.md. Work only the one active feature. Do NOT restart from Phase 1."

# RUNTIME_PID is deliberately NOT run in its own process group (no `set -m`):
# claude/agy need real terminal ownership for interactive input, and job
# control would make the kernel stop a backgrounded group on tty access
# (SIGTTIN), breaking that. The tradeoff: cleanup() below can only signal the
# immediate child, not any grandchildren it spawns (e.g. MCP subprocesses) --
# relying on claude/agy to clean up their own subtree on SIGINT/SIGTERM, same
# as a plain Ctrl-C at an interactive prompt would.
RUNTIME_PID=""
CAFFEINATE_PID=""
CLEANED_UP=""
# $1 is which trap fired ("EXIT" for a normal stop -- the read-EOF path below
# calls cleanup with no arg, defaulting to EXIT too). Exits with the
# conventional 128+signum code for a real signal so a supervisor's $? can
# still tell a forced kill from a graceful stop, instead of always reporting
# success.
cleanup() {
  local sig="${1:-EXIT}"
  [ -n "$CLEANED_UP" ] && return
  CLEANED_UP=1
  if [ -n "$RUNTIME_PID" ]; then
    # SIGINT first: many TUIs only special-case SIGINT to restore the
    # terminal (echo/cooked mode) before exiting -- a bare SIGTERM can skip
    # that. Poll for exit instead of a blind sleep, so a slow-but-graceful
    # shutdown isn't cut off mid-teardown, then escalate TERM -> KILL if it
    # genuinely hangs.
    kill -INT "$RUNTIME_PID" 2>/dev/null
    for _ in $(seq 1 25); do   # ~5s at 0.2s each
      kill -0 "$RUNTIME_PID" 2>/dev/null || break
      sleep 0.2
    done
    if kill -0 "$RUNTIME_PID" 2>/dev/null; then
      kill -TERM "$RUNTIME_PID" 2>/dev/null
      sleep 1
      kill -0 "$RUNTIME_PID" 2>/dev/null && kill -KILL "$RUNTIME_PID" 2>/dev/null
    fi
  fi
  [ -n "$CAFFEINATE_PID" ] && kill "$CAFFEINATE_PID" 2>/dev/null
  echo; echo "relay stopped."
  case "$sig" in
    INT)  exit 130 ;;
    TERM) exit 143 ;;
    HUP)  exit 129 ;;
    *)    exit 0 ;;
  esac
}
# Trap installed BEFORE starting caffeinate below: a signal arriving in that
# gap would otherwise exit under the default disposition, skipping cleanup()
# and orphaning caffeinate. Each signal passes its own name so cleanup()
# can exit with the right code; the resulting `exit` also re-fires the EXIT
# trap, but CLEANED_UP makes that second call a no-op that just returns,
# leaving the already-set exit code alone.
trap 'cleanup INT'  INT
trap 'cleanup TERM' TERM
trap 'cleanup HUP'  HUP
trap 'cleanup EXIT' EXIT

# Keep the Mac awake for as long as the relay runs (macOS only; no-op elsewhere).
if command -v caffeinate >/dev/null 2>&1; then
  caffeinate -dimsu &
  CAFFEINATE_PID=$!
fi

log() { printf -- '- %s — %s\n' "$(date -u +%FT%TZ)" "$1" >> "$LEDGER"; }

# Runs "$@" backgrounded so its PID is capturable (see RUNTIME_PID comment
# above), waits for it, then clears RUNTIME_PID. Shared by both branches below
# so a future fix to this pattern can't drift out of sync between them.
run_and_wait() {
  "$@" &
  RUNTIME_PID=$!
  wait "$RUNTIME_PID" || true      # returns on session limit or manual quit
  # Narrow TOCTOU: a signal landing between `wait` returning and this line
  # could in theory hit a recycled PID. Accepted for a single-operator local
  # dev script; not worth the ps-based liveness check for how rare that is.
  RUNTIME_PID=""
}

turn="${1:-claude}"

while true; do
  if [ "$turn" = "claude" ]; then
    log "start Claude Code (active feature per CURRENT_TASK.md)"
    run_and_wait claude "$BOOTSTRAP"
    turn="agy"
  else
    log "start Antigravity agy (model=$SONNET_MODEL)"
    run_and_wait agy -m "$SONNET_MODEL" "$BOOTSTRAP"
    turn="claude"
  fi
  echo
  read -r -p "Next runtime: '$turn'. Press Enter to switch, or Ctrl-C to stop... " _ || cleanup
done
