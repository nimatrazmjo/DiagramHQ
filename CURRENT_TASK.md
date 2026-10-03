# Current Task: F101 — SSO

**Status**: COMPLETE

## Description
Enterprise Single Sign-On (SSO) with OpenID Connect (OIDC), OAuth2, and IdP Integration (Phase 13 — Enterprise):
- Capabilities:
  - Enterprise IdP Configuration & Status Model (`SsoProviderConfig`, `validateSsoProviderConfig`):
    - OIDC / OAuth2 / Test IdP provider registration.
    - Endpoints: issuer discovery, authorization, token exchange, userinfo, jwks.
    - Corporate domain matching (`acme.com`, `acme-enterprise.com`).
    - Governance policies: `enforceSso` (prohibits password authentication for corporate email domains) and `allowJitProvisioning`.
  - Domain Discovery & Auto-Routing:
    - `findSsoProviderForEmail`, `isSsoEnforcedForEmail`, `normalizeDomain`, `extractDomainFromEmail`.
  - PKCE & State Challenge Engine:
    - Cryptographically secure `state`, `nonce`, and PKCE `code_verifier`/`code_challenge` (`generateSsoChallenge`).
    - Standard OIDC redirect URL builder.
  - Claims & Attribute Mapping:
    - IdP claim normalization (`sub`, `email`, `name`, `groups`, `roles`).
    - Group-to-role mapping to DiagramHQ `MemberRole` (Owner, Admin, Editor, Viewer, Guest).
  - JIT Provisioning & Enterprise Session:
    - `provisionSsoUser` creating new `usr_` identities or linking existing accounts.
    - `processSsoCallback` validating CSRF state, expiration, and generating 8-hour `SsoAuthSession`.
  - Deterministic Test IdP Engine:
    - `createTestIdpConfig`, `simulateTestIdpLogin` for zero-network testing and developer environments.
- Web & Login UI:
  - `LoginForm` tabs: Password mode vs Enterprise SSO mode.
  - Live corporate domain detection badge (e.g. Acme Enterprise Okta).
  - 1-Click "⚡ Sign In with Test IdP (Acme Enterprise)" quick login.
  - NextAuth `authorizeUser` integration: handles SSO assertions, provisions users, and blocks password logins for enforced domains.
  - Enterprise SSO Settings Modal (`SsoSettingsModal`):
    - Configured IdPs list with status & enforcement toggles.
    - Live Test IdP simulation drawer with claims inspection.
    - Add corporate IdP form with validation.
- Acceptance criteria:
  - SSO login via an IdP
  - Test: SSO login via a test IdP.

- Feature ID: F101
- Phase: 13 — Enterprise
- Dependencies: Phase 01, Phase 06, Phase 11

## Evidence
- Domain: `packages/domain/src/sso.ts`, `packages/domain/src/sso.test.ts` (19 tests passing)
- Web: `apps/web/auth.config.ts`, `apps/web/auth.spec.ts` (8 tests passing), `apps/web/app/login/login-form.tsx`, `apps/web/components/enterprise/sso-settings-modal.tsx`, `apps/web/sso.spec.tsx` (6 tests passing)
- Reviews: `.harness/reviews/F101-PR.md`, `.harness/reviews/F101-review.md`

## Next Feature
- **Phase 13 — Enterprise**: **F102 — SAML** (SAML 2.0 assertions and metadata exchange)
