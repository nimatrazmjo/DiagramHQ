# F101 — SSO — Review

## Verdict: APPROVED

### Maker-Checker Verification Summary
- **Feature ID**: F101
- **Phase**: 13 — Enterprise
- **Description**: Single sign-on.
- **Acceptance Criteria**:
  - SSO login via an IdP: **PASSED**
  - Test: SSO login via a test IdP: **PASSED**

### Quality Gates
1. **Typecheck**: `pnpm typecheck` — **CLEAN** (0 errors across domain, api, and web packages).
2. **Lint**: `pnpm lint` — **CLEAN** (0 errors, 0 warnings across whole repository).
3. **Architecture Check**: `./scripts/check-architecture.sh` — **CLEAN** (Zero framework or persistence imports in domain; clean boundary isolation).
4. **Domain Unit Tests**: `pnpm --filter @diagramhq/domain test` — **PASSED** (99 test files, 618 tests passed; 19 tests in `sso.test.ts`).
5. **Web Tests**: `pnpm --filter @diagramhq/web test` — **PASSED** (113 test files, 580 tests passed; 6 tests in `sso.spec.tsx`, 8 tests in `auth.spec.ts`).
6. **Production Build**: `pnpm build` — **PASSED** (All artifacts and routes successfully compiled).

### Review Notes
- Domain SSO logic is completely pure TypeScript with zero DOM/React or framework dependencies.
- Cryptographic state, nonce, and PKCE tokens use web-standard `crypto.getRandomValues` with fallback for robust cross-environment compatibility.
- Seamlessly integrates with NextAuth while enforcing enterprise security policies (such as blocking password authentication when domain SSO is enforced).
- Test IdP simulation harness provides reliable automated test execution without relying on third-party network requests.
