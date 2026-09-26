#!/usr/bin/env bash
# Verify a clean, buildable baseline. Harness contract: .harness/scripts/SCRIPTS.md -> init.
set -euo pipefail
corepack enable >/dev/null 2>&1 || true
pnpm install
pnpm prisma:generate
pnpm build:domain
pnpm typecheck
pnpm lint
pnpm test
./scripts/check-architecture.sh
echo "init: baseline OK"
