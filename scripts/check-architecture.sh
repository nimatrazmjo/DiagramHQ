#!/usr/bin/env bash
# Enforce layer boundaries per .harness/rules/layer-boundaries.md.
# Harness contract: .harness/scripts/SCRIPTS.md -> check-architecture.
set -euo pipefail

violations=0

# Matches `from '<pkg>'`, bare `import '<pkg>'`, `require('<pkg>')`, and
# dynamic `import('<pkg>')` — not just static named imports.
IMPORT_PREFIX="(from ['\"]|import ['\"]|require\(['\"]|import\(['\"])"

echo "Running architectural boundary checks..."

# Rule 1: packages/domain imports nothing framework-specific
if [ -d "packages/domain/src" ]; then
  domain_forbidden=$(grep -rnE "${IMPORT_PREFIX}(@nestjs|next|react|@prisma/client|axios|node-fetch)(/[^'\"]*)?['\"]" packages/domain/src || true)
  if [ -n "$domain_forbidden" ]; then
    echo "VIOLATION [Rule 1]: packages/domain contains framework-specific imports:" >&2
    echo "$domain_forbidden" >&2
    violations=$((violations + 1))
  fi
fi

# Rule 2 & 5: apps/web must not import @prisma/client or @nestjs
if [ -d "apps/web" ]; then
  web_forbidden=$(grep -rnE "${IMPORT_PREFIX}(@prisma/client|@nestjs)(/[^'\"]*)?['\"]" apps/web --exclude-dir=".next" --exclude-dir="node_modules" --exclude-dir="dist" || true)
  if [ -n "$web_forbidden" ]; then
    echo "VIOLATION [Rule 2/5]: apps/web contains forbidden persistence/server imports:" >&2
    echo "$web_forbidden" >&2
    violations=$((violations + 1))
  fi
fi

# Rule 5: Prisma client only under apps/api
other_prisma=$(grep -rnE "${IMPORT_PREFIX}@prisma/client(/[^'\"]*)?['\"]" packages/ apps/web --exclude-dir=".next" --exclude-dir="node_modules" --exclude-dir="dist" || true)
if [ -n "$other_prisma" ]; then
  echo "VIOLATION [Rule 5]: @prisma/client imported outside apps/api:" >&2
  echo "$other_prisma" >&2
  violations=$((violations + 1))
fi

if [ "$violations" -gt 0 ]; then
  echo "check-architecture failed with $violations violation(s)." >&2
  exit 1
fi

echo "check-architecture: clean"
exit 0
