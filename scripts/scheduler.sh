#!/usr/bin/env bash
# scheduler.sh — Autonomous Model Scheduler & Failover Runner
#
# Runs features one by one from F036 to end.
# Automatically switches to Claude Sonnet when Primary model (Gemini/Antigravity) hits its session limit.
# If both models hit session limit, calculates which resets sooner, waits until that exact time,
# and automatically resumes.
#
# Usage:
#   ./scripts/scheduler.sh                       # Runs F036 through end
#   ./scripts/scheduler.sh --start=F036 --end=F040
#   ./scripts/scheduler.sh --dry-run             # Inspect queue without executing
#
# Optional environment overrides:
#   PRIMARY_MODEL="gemini-3.1-pro-high"
#   SONNET_MODEL="claude-sonnet-4-6"
#   PRIMARY_RUNNER="agy"                         # 'agy' or 'claude'
#   SONNET_RUNNER="agy"                          # 'agy' or 'claude'
#
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

CAFFEINATE_PID=""

cleanup() {
  local sig="${1:-EXIT}"
  if [ -n "$CAFFEINATE_PID" ]; then
    kill "$CAFFEINATE_PID" 2>/dev/null || true
  fi
  case "$sig" in
    INT)  exit 130 ;;
    TERM) exit 143 ;;
    *)    exit 0 ;;
  esac
}

trap 'cleanup INT'  INT
trap 'cleanup TERM' TERM
trap 'cleanup EXIT' EXIT

# Keep Mac awake during scheduling
if command -v caffeinate >/dev/null 2>&1; then
  caffeinate -dimsu &
  CAFFEINATE_PID=$!
fi

exec node --experimental-strip-types scripts/model-scheduler.ts "$@"
