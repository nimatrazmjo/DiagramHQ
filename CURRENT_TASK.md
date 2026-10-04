# Current Task: F102 — SAML

**Status**: COMPLETE

## Description
Enterprise SAML 2.0 Web Browser Single Sign-On (SSO) and Assertion Flow (Phase 13 — Enterprise):
- Capabilities:
  - Service Provider (SP) Metadata Generator (`buildSpMetadataXml`, `SamlSpConfig`):
    - W3C XML metadata compilation with EntityID, ACS URL (`HTTP-POST`), SingleLogoutService, and NameIDFormat.
  - IdP Metadata Parser (`parseIdpMetadataXml`):
    - Extracts EntityID, SSO URL, SLO URL, and X.509 certificate from external IdP XML.
  - SAML AuthnRequest Generator (`buildSamlAuthnRequest`):
    - XML AuthnRequest builder with request ID, timestamps, destination, and NameID policy.
    - Base64 encoding and HTTP-Redirect query URL constructor (`SAMLRequest`, `RelayState`).
  - SAML 2.0 Response & Assertion Validator (`parseAndValidateSamlResponse`):
    - Decodes Base64 SAMLResponse XML and checks StatusCode (`urn:oasis:names:tc:SAML:2.0:status:Success`).
    - Enforces security conditions: InResponseTo match (CSRF protection), Issuer match, NotBefore/NotOnOrAfter validity window with clock skew tolerance, and AudienceRestriction match.
    - Extracts Subject `<saml:NameID>` and attributes (`email`, `displayName`, `firstName`, `lastName`, `memberOf`, `groups`).
    - Group-to-role attribute mapping to DiagramHQ `MemberRole`.
    - Just-in-Time (JIT) provisioning and account linking (`provisionSsoUser`).
    - Issues authenticated 8-hour `SsoAuthSession`.
  - Deterministic Test SAML IdP Harness:
    - `createTestSamlIdpConfig`, `buildTestSamlResponseXml`, `simulateTestSamlLogin` for zero-network automated testing.
- Web & Login UI:
  - NextAuth `authorizeUser` integration: handles SAML credentials and issues session with SAML provider metadata.
  - `LoginForm`: added 1-Click "⚡ Sign In with SAML 2.0 (Acme IdP)" button.
  - `SsoSettingsModal`:
    - `SAML 2.0 SP Config` tab displaying Service Provider Entity ID, ACS URL, and SLO URL with 1-click clipboard copy.
    - Interactive IdP Metadata XML importer with real-time parsing (`parseIdpMetadataXml`).
    - Dual OIDC & SAML 2.0 simulation runner with real-time claims and session inspection.
- Acceptance criteria:
  - SAML assertion flow
  - Test: SAML login via a test IdP.

- Feature ID: F102
- Phase: 13 — Enterprise
- Dependencies: F101

## Evidence
- Domain: `packages/domain/src/saml.ts`, `packages/domain/src/saml.test.ts` (17 tests passing)
- Web: `apps/web/auth.config.ts`, `apps/web/auth.spec.ts` (9 tests passing), `apps/web/app/login/login-form.tsx`, `apps/web/components/enterprise/sso-settings-modal.tsx`, `apps/web/saml.spec.tsx` (5 tests passing)
- Reviews: `.harness/reviews/F102-PR.md`, `.harness/reviews/F102-review.md`

## Next Feature
- **Phase 13 — Enterprise**: **F103 — SCIM** (SCIM 2.0 User Provisioning & Deprovisioning)
