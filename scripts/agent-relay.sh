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

# Keep the Mac awake for as long as the relay runs (macOS only; no-op elsewhere).
CAFFEINATE_PID=""
if command -v caffeinate >/dev/null 2>&1; then
  caffeinate -dimsu &
  CAFFEINATE_PID=$!
fi
CLEANED_UP=""
cleanup() {
  [ -n "$CLEANED_UP" ] && return
  CLEANED_UP=1
  [ -n "$CAFFEINATE_PID" ] && kill "$CAFFEINATE_PID" 2>/dev/null
  echo; echo "relay stopped."
  exit 0
}
trap cleanup INT TERM HUP EXIT

log() { printf -- '- %s — %s\n' "$(date -u +%FT%TZ)" "$1" >> "$LEDGER"; }

turn="${1:-claude}"

while true; do
  if [ "$turn" = "claude" ]; then
    log "start Claude Code (active feature per CURRENT_TASK.md)"
    claude "$BOOTSTRAP" || true      # returns on session limit or manual quit
    turn="agy"
  else
    log "start Antigravity agy (model=$SONNET_MODEL)"
    agy -m "$SONNET_MODEL" "$BOOTSTRAP" || true
    turn="claude"
  fi
  echo
  read -r -p "Next runtime: '$turn'. Press Enter to switch, or Ctrl-C to stop... " _ || cleanup
done
