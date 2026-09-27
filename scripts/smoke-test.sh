#!/usr/bin/env bash
# End-to-end API smoke test against a running, seeded stack.
# Usage: ./scripts/smoke-test.sh [api-url]     (default http://localhost:4000)
# Requires: curl. Data: `pnpm db:seed` (read-only checks — nothing is modified).
set -uo pipefail

API="${1:-${API_URL:-http://localhost:4000}}"
pass=0
fail=0

check() { # name expected actual
  if [ "$2" = "$3" ]; then
    printf '  \033[32m✓\033[0m %s\n' "$1"; pass=$((pass + 1))
  else
    printf '  \033[31m✗\033[0m %s (expected %s, got %s)\n' "$1" "$2" "$3"; fail=$((fail + 1))
  fi
}
contains() { # name needle haystack
  case "$3" in *"$2"*) check "$1" yes yes ;; *) check "$1" "contains '$2'" "no" ;; esac
}
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
token() {
  curl -s -X POST "$API/auth/token" -H 'content-type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | sed -nE 's/.*"token":"([^"]+)".*/\1/p'
}

echo "DiagramHQ smoke test → $API"

echo "Health"
contains "GET /health reports database up" '"database":"up"' "$(curl -s "$API/health")"

echo "Auth"
ADMIN=$(token admin@diagramhq.com adminpassword)
ARCH=$(token architect@diagramhq.com strongpassword)
DEV=$(token developer@diagramhq.com password123)
check "admin login returns token" yes "$([ -n "$ADMIN" ] && echo yes || echo no)"
check "demo user with wrong password → 401" 401 \
  "$(status -X POST "$API/auth/token" -H 'content-type: application/json' -d '{"email":"admin@diagramhq.com","password":"nope123"}')"
check "protected route without token → 401" 401 "$(status "$API/organizations")"
contains "GET /auth/me returns the user" 'admin@diagramhq.com' "$(curl -s "$API/auth/me" -H "Authorization: Bearer $ADMIN")"

echo "Seed data & tenancy"
orgs_arch=$(curl -s "$API/organizations" -H "Authorization: Bearer $ARCH")
orgs_dev=$(curl -s "$API/organizations" -H "Authorization: Bearer $DEV")
contains "architect sees Acme" 'Acme Corporation' "$orgs_arch"
contains "architect sees Globex" 'Globex Industries' "$orgs_arch"
contains "developer sees Acme" 'Acme Corporation' "$orgs_dev"
case "$orgs_dev" in *Globex*) check "developer does not see Globex" hidden visible ;; *) check "developer does not see Globex" hidden hidden ;; esac
check "developer reading Globex architecture → 404" 404 "$(status "$API/architectures/arch_globex" -H "Authorization: Bearer $DEV")"

echo "Model & views"
check "GET e-commerce model → 200" 200 "$(status "$API/architectures/arch_ecommerce/model" -H "Authorization: Bearer $DEV")"
contains "model contains Payments Service" 'Payments Service' \
  "$(curl -s "$API/architectures/arch_ecommerce/model" -H "Authorization: Bearer $DEV")"
views=$(curl -s "$API/architectures/arch_ecommerce/views" -H "Authorization: Bearer $DEV")
for k in context container component security data ownership technology persona custom; do
  contains "view kind '$k' present" "\"kind\":\"$k\"" "$views"
done
contains "dynamic view resolves team=payments" 'Payments Service' \
  "$(curl -s "$API/views/vw_ecom_payments_team/projection" -H "Authorization: Bearer $DEV")"

echo "Permissions"
check "viewer cannot create objects → 403" 403 \
  "$(status -X POST "$API/architectures/arch_ecommerce/objects" -H "Authorization: Bearer $DEV" \
      -H 'content-type: application/json' -d '{"name":"Nope","kind":"system"}')"

echo
echo "passed: $pass  failed: $fail"
if [ "$fail" -ne 0 ]; then
  echo "Hint: is the stack running and seeded? See docs/local-setup.md"
  exit 1
fi
