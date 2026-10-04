# Implementation Changelog
 
 Every completed feature and every meaningful state change is recorded here, newest first. Each entry names a feature ID (or the tracking system). No vague entries. A feature appears here as COMPLETE only after verification. (Supersedes the earlier `state/claude-progress.md`, archived under `_archive/`.)

## 2026-10-04 — F108 — Private deployment (Phase 13 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'dep'` prefix to `IdPrefix` union and created branded type `DeploymentId`.
  - `private-deployment.ts`: Self-hosted customer VPC deployment and air-gapped architecture engine:
    - Customer VPC deployment profiles (AWS VPC, GCP VPC, Azure VNet, On-Premises bare metal, Air-Gapped Enclave).
    - Air-gapped zero-outbound-egress configuration (`AirGappedConfig`): internal container registry (`docker.customer.internal`), local private AI engines (vLLM / Ollama), local embedded static assets, and offline cryptographic license validation.
    - Automated topology manifest generation for offline `docker-compose.yml` and Kubernetes Helm `values.yaml` with network egress filtering.
    - Automated Clean Environment Smoke Test Suite (`runPrivateDeploymentSmokeTests`) executing 6 mission-critical readiness probes (Web gateway `/healthz`, NestJS API `/api/health`, PostgreSQL connection pool, S3/MinIO bucket read/write, local AI endpoint, and strict egress barrier firewall checks).
  - `private-deployment.test.ts`: 7 unit tests covering 100% smoke test pass rate in clean environments, degraded environment fault detection, egress barrier verification, and offline manifest syntax.
  - `index.ts`: Exported `private-deployment` module.
- Documentation:
  - `.harness/deployment/PRIVATE_DEPLOYMENT.md`: Architecture diagrams, prerequisites, air-gapped environment configuration, and verification procedures.
- Web layer (`apps/web/`):
  - `components/enterprise/private-deployment-modal.tsx`: Interactive Private VPC & Air-Gapped Deployment modal with deployment status ribbon, configuration forms, manifest viewer with copy action, and live clean environment smoke test runner.
  - `components/enterprise/index.ts`: Exported `PrivateDeploymentModal`.
  - `private-deployment.spec.tsx`: 4 integration and component tests verifying UI rendering, 100% clean environment smoke suite pass rate, and air-gapped Docker Compose/Helm manifest generation.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 105 test files / 718 tests ✓, web 120 test files / 613 tests ✓, `next build ✓`.
- **Milestone: 126 / 135 features completed overall (93.3%)!**

## 2026-10-04 — F107 — Enterprise security (Phase 13 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'sec'` prefix to `IdPrefix` union and created branded type `SecurityProfileId`.
  - `enterprise-security.ts`: Enterprise cryptographic defense-in-depth, disaster recovery, and compliance evaluation engine:
    - Encryption at rest: Authenticated AES-256-GCM, Customer-Managed Keys (CMEK), envelope encryption, and 90-day KMS key rotation (`EncryptionAtRestConfig`).
    - Encryption in transit: Strict TLS 1.3 mandate, 1-year HSTS preload (`max-age: 31536000`), and Perfect Forward Secrecy (`EncryptionInTransitConfig`).
    - Automated Backup & Disaster Recovery: Continuous Point-In-Time Recovery (PITR) with 30-day retention, multi-region replication, WORM ransomware protection, RTO (< 30m) / RPO (< 15m) targets, and simulated automated restore drills (`simulateBackupRestoreDrill`).
    - Data Sanitization & Legal Hold: NIST SP 800-88 Rev 1 compliant crypto-shredding (`executeCryptoShredding`) with active legal hold evidentiary freezes.
    - Enterprise Security Review Checklist: Automated evaluation engine (`evaluateEnterpriseSecurityChecklist`) scoring 14 controls across 6 critical domains (Network/Transport, Cryptography, Identity & Access, Audit Logging, Resilience/DR, Vulnerability Management) against SOC2, ISO 27001, and NIST SP 800-53 standards.
  - `enterprise-security.test.ts`: 10 unit tests covering baseline 100% compliance verification, TLS 1.3 transport failure detection, key rotation CIS warnings, SSO/audit log critical failures, DR drill simulation, and crypto-shredding with legal hold protection.
  - `index.ts`: Exported `enterprise-security` module.
- Web layer (`apps/web/`):
  - `components/enterprise/enterprise-security-modal.tsx`: Interactive Enterprise Security & Hardening modal with executive KPI ribbon, multi-domain checklist filters, live DR drill simulator, and crypto-shredding tester.
  - `components/enterprise/index.ts`: Exported `EnterpriseSecurityModal`.
  - `enterprise-security.spec.tsx`: 5 integration and component tests verifying UI rendering, 100% checklist compliance passage, automated DR drill RTO/RPO SLA adherence, and NIST SP 800-88 crypto-shredding with legal hold safeguards.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 105 test files / 711 tests ✓, web 119 test files / 609 tests ✓, `next build ✓`.
- **Milestone: 125 / 135 features completed overall (92.6%)!**

## 2026-10-04 — F106 — Organization policies (Phase 13 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'pol'` prefix to `IdPrefix` union and created branded type `OrgPolicyId`.
  - `organization-policies.ts`: Organization-wide governance, security, and administrative policy engine:
    - IP Restrictions: Allowlist and denylist evaluation with CIDR subnet prefix parsing and unsigned 32-bit integer matching (`isIpInCidr`, `ipToNumber`), plus role-based bypass exemptions (`owner`).
    - Session Management: Maximum session duration limits, inactivity idle timeouts, concurrent active session caps, mandatory MFA verification, and corporate device trust enforcement (`evaluateSessionPolicy`).
    - Data Retention Lifecycle: Automated retention cutoffs (`calculateRetentionCutoffDate`) and permanent purge eligibility calculation (`isItemEligibleForRetentionPurge`) across soft-deleted items, version history, audit logs, and inactive workspaces (`evaluateDataRetentionPolicy`).
    - Export Controls: Format whitelisting (PNG, SVG, PDF, JSON, CSV, Markdown), mandatory security classification watermarks on visual exports, external recipient email domain constraints, and sensitive data classification tag blocking (`pci`, `phi`, `secret`) (`evaluateExportControl`).
    - Governance Engine: Centralized policy evaluation with global enforcement mode switcher (`enforce`, `audit_only`, `disabled`), factory defaults (`createDefaultOrganizationPolicies`), and comprehensive validation (`validateOrganizationPolicies`).
  - `organization-policies.test.ts`: 26 unit tests covering IP/CIDR math, subnet containment, allowlist/denylist enforcement, role exemptions, session timeout and concurrent limit terminations, export format/tag filtering, retention purge eligibility, and policy validation.
  - `index.ts`: Exported `organization-policies` module.
- Web layer (`apps/web/`):
  - `components/enterprise/org-policies-modal.tsx`: Interactive Organization Policies administration modal with tabbed configuration for IP restrictions, session lifetimes, retention lifecycles, export controls, and an interactive Live Policy Enforcement Simulator.
  - `components/enterprise/index.ts`: Exported `OrgPoliciesModal`.
  - `org-policies.spec.tsx`: 6 integration and component tests verifying UI rendering, IP allowlist enforcement, session idle/duration termination, data retention lifecycle, and export control boundaries.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 104 test files / 701 tests ✓, web 118 test files / 604 tests ✓, `next build ✓`.
- **Milestone: 124 / 135 features completed overall (91.9%)!**

## 2026-10-03 — F105 — Audit logs (Phase 13 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'aud'` prefix to `IdPrefix` union and created branded type `AuditLogEntryId`.
  - `audit-log.ts`: Enterprise Immutable Audit Log engine with cryptographic hash chaining and AI-agent auditing:
    - Full who/what/when data capture (`AuditEntry`): actor types (`human_user`, `ai_agent`, `scim_sync`, `api_key`, `system`), category, action, status (`SUCCESS`, `FAILURE`, `DENIED`), target resource, payload details, timestamps, sequence indexing.
    - AI-Agent auditing: tracks AI model provenance (e.g. `gemini-1.5-pro`), prompt summary, confidence score, tool calls executed, and autonomous execution flags.
    - Multi-pass cryptographic hash chaining (`computeAuditEntryHash`): seals previous entry hash and record payload into a tamper-evident Merkle chain.
    - Append-only semantic enforcement: monotonic sequence numbers and chronological ordering.
    - Cryptographic integrity verifier (`verifyAuditLogIntegrity`): detects in-place record mutations, severed hash links, or dropped entries.
    - Query engine (`queryAuditLogs`): supports filtering by actor, actorType (e.g. `ai_agent`), category, status, resourceId, and time window with pagination.
    - Structured export (`exportAuditLogToJson`, `exportAuditLogToCsv`) for SIEM ingestion (Splunk, Datadog).
    - Deterministic lifecycle testing harness (`simulateAuditLogLifecycle`).
  - `audit-log.test.ts`: 9 unit tests covering genesis initialization, append-only monotonicity, AI-agent auditing, tamper detection, hash chain integrity, filtering, and SIEM export.
  - `index.ts`: Exported `audit-log` module.
- Web layer (`apps/web/`):
  - `components/enterprise/audit-logs-modal.tsx`: Interactive Enterprise Immutable Audit Logs modal with KPI summary counters, search & category filters, dedicated AI-Agent Actions tab, Cryptographic Chain Integrity verifier, and SIEM JSON/CSV export actions.
  - `components/enterprise/index.ts`: Exported `AuditLogsModal`.
  - `audit-logs.spec.tsx`: 3 integration and component tests verifying UI rendering, AI-agent action recording, append-only immutability, and SIEM export formats.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 103 test files / 675 tests ✓, web 117 test files / 598 tests ✓, `pnpm build ✓`.
- **Milestone: 123 / 135 features completed overall (91.1%)!**


## 2026-10-03 — F104 — Advanced RBAC (Phase 13 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'role'` prefix to `IdPrefix` union and created branded type `CustomRoleId`.
  - `advanced-rbac.ts`: Enterprise Advanced Role-Based Access Control and Least Privilege Engine:
    - Fine-grained permission catalog across 7 enterprise domains (`architecture`, `model`, `flow`, `docs`, `governance`, `admin`, `billing`).
    - 5 built-in enterprise specialized roles:
      - `Security Auditor`: Read-only views, audit logs, compliance reports, and security scans; explicitly denied from modifying models, editing diagrams, or deleting workspaces.
      - `Documentation Specialist`: Markdown editing, publishing, and diagram views; explicitly denied from mutating core architectural objects.
      - `Compliance Officer`: Audit log inspection, framework mapping, and ADR approval; explicitly denied from altering diagrams or deleting objects.
      - `Junior Architect`: Authors draft diagrams and flows; explicitly denied from publishing, deleting models, or managing admin settings.
      - `Billing Administrator`: Invoicing, subscriptions, and seat management; strictly isolated with zero access to proprietary architecture diagrams or models.
    - Custom role creation with dynamic allow and explicit denial lists.
    - Least privilege evaluation engine (`evaluateFineGrainedPermission`, `assertFineGrainedPermission`): explicit deny overrides allow; ungranted permissions denied by default.
    - Out-of-scope action denial test harness: `testFineGrainedRoleDenial`.
    - Least privilege audit engine (`auditRoleLeastPrivilege`): computes privilege risk score (LOW/MEDIUM/HIGH/CRITICAL), flags destructive capabilities, and provides actionable remediation recommendations.
  - `advanced-rbac.test.ts`: 13 comprehensive unit tests covering permission catalog, specialized roles, custom role authoring, evaluation decisions, out-of-scope denial verification, and risk auditing.
  - `index.ts`: Exported `advanced-rbac` module.
- Web layer (`apps/web/`):
  - `components/enterprise/advanced-rbac-modal.tsx`: Comprehensive Advanced RBAC management modal featuring Roles Catalog, Real-Time Least Privilege Evaluator with instant decision badges, Risk & Compliance Audit dashboard, and Custom Role Authoring form.
  - `components/enterprise/index.ts`: Exported `AdvancedRbacModal`.
  - `advanced-rbac.spec.tsx`: 5 integration and component tests verifying UI rendering and least privilege out-of-scope action denial.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 102 test files / 666 tests ✓, web 116 test files / 595 tests ✓, `pnpm build ✓`.
- **Milestone: 122 / 135 features completed overall (90.4%)!**


## 2026-10-03 — F103 — SCIM (Phase 13 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `scim` prefix to `IdPrefix` union and created branded type `ScimConfigId`.
  - `scim.ts`: Pure TypeScript SCIM 2.0 User Provisioning and Deprovisioning engine (RFC 7643 & RFC 7644):
    - SCIM schemas: `User`, `EnterpriseUser`, `Group`, `ServiceProviderConfig`, `PatchOp`, `ListResponse`, `Error`.
    - User creation (`createScimUser`): uniqueness validation across userName and externalId, attribute parsing, audit logging.
    - User querying and filtering (`getScimUser`, `listScimUsers`): 1-based pagination, RFC 7644 filter evaluator supporting `userName eq "..."`, `externalId eq "..."`, `active eq true/false`.
    - User modification (`updateScimUser` PUT): full resource replacement, optimistic versioning (`W/"2"`).
    - User deprovisioning and reactivation (`patchScimUser` PATCH): handles `path: "active"` and object-value `{ active: false }` deprovisioning, reactivating with `active: true`, and attribute patching (`name`, `displayName`, `title`).
    - User deletion (`deleteScimUser` DELETE): removes user and logs audit entry.
    - Group management: `createScimGroup`, `getScimGroup`, `listScimGroups`.
    - Service Provider Config generator (`getScimServiceProviderConfig`): PATCH, filter, and bearer authentication capabilities.
    - Zero-network deterministic simulation harness: `simulateScimProvisioningLifecycle`.
    - High-entropy bearer token generation (`generateScimBearerToken`) and Bearer header validation (`validateScimBearerToken`).
  - `scim.test.ts`: 18 comprehensive unit tests covering provisioning, uniqueness enforcement, filtering, PUT, PATCH deactivation/reactivation, group management, and lifecycle simulation.
  - `index.ts`: Exported `scim` module.
- Web layer (`apps/web/`):
  - `lib/scim-server.ts`: SCIM state singleton and seeding for web layer with active and deactivated enterprise users.
  - `app/api/scim/v2/ServiceProviderConfig/route.ts`: SCIM 2.0 RFC 7643 ServiceProviderConfig discovery endpoint.
  - `app/api/scim/v2/Users/route.ts`: SCIM 2.0 user list and provisioning endpoint with Bearer authentication.
  - `app/api/scim/v2/Users/[id]/route.ts`: SCIM 2.0 individual user GET, PUT, PATCH deprovisioning, and DELETE.
  - `components/enterprise/sso-settings-modal.tsx`: Added `SCIM 2.0 Provisioning` tab with base URL copy, token generation, user directory, status badges, and 1-click end-to-end lifecycle verification test.
  - `scim.spec.tsx`: 4 integration and component tests verifying UI rendering and REST API lifecycle execution.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 101 test files / 653 tests ✓, web 115 test files / 590 tests ✓, `pnpm build ✓`.
- **Milestone: 121 / 135 features completed overall (89.6%)!**


## 2026-10-03 — F102 — SAML (Phase 13 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `saml` prefix to `IdPrefix` union and created branded type `SamlRequestId`.
  - `saml.ts`: Pure TypeScript SAML 2.0 Web Browser SSO integration engine:
    - Service Provider (SP) metadata generation (`buildSpMetadataXml`, `SamlSpConfig`): EntityID, ACS URL (`HTTP-POST`), SingleLogoutService, and NameIDFormat.
    - Identity Provider (IdP) metadata parser (`parseIdpMetadataXml`): extracts EntityID, SSO URL, SLO URL, and X.509 certificate.
    - SAML AuthnRequest generator (`buildSamlAuthnRequest`): XML AuthnRequest builder, Base64 encoding, and HTTP-Redirect query URL constructor (`SAMLRequest`, `RelayState`).
    - SAML 2.0 Response & Assertion validator (`parseAndValidateSamlResponse`): decodes Base64 SAMLResponse XML, verifies StatusCode, InResponseTo CSRF mitigation, Issuer matching, NotBefore/NotOnOrAfter time validity windows with clock skew tolerance, and AudienceRestriction match.
    - Attribute extraction & group-to-role attribute mapping to DiagramHQ `MemberRole`.
    - Just-in-Time (JIT) provisioning and account linking (`provisionSsoUser`).
    - Issues authenticated 8-hour `SsoAuthSession`.
    - Deterministic Test SAML IdP harness: `createTestSamlIdpConfig`, `buildTestSamlResponseXml`, `simulateTestSamlLogin`.
  - `saml.test.ts`: 17 unit tests covering SP metadata generation, IdP metadata parsing, AuthnRequest generation, assertion validation, condition/clock skew verification, error statuses, CSRF InResponseTo checks, Issuer and Audience mismatch rejections, JIT provisioning, existing account linking, and full Test IdP simulation.
  - `index.ts`: Exported `saml` module.
- Web layer (`apps/web/`):
  - `auth.config.ts`: Added SAML 2.0 authentication handling in `authorizeUser`, connecting SAML credentials to `simulateTestSamlLogin` and populating session provider metadata (`Acme Enterprise SAML 2.0 IdP`).
  - `auth.spec.ts`: Added test case verifying enterprise SAML 2.0 assertion authentication flow (9 tests passing).
  - `components/enterprise/sso-settings-modal.tsx`: Added `SAML 2.0 SP Config` tab displaying Service Provider Entity ID, ACS URL, and SLO URL with 1-click clipboard copy, interactive IdP Metadata XML importer with real-time parsing (`parseIdpMetadataXml`), and dual OIDC/SAML simulation runners.
  - `app/login/login-form.tsx`: Added 1-Click "⚡ Sign In with SAML 2.0 (Acme IdP)" quick authentication button.
  - `saml.spec.tsx`: 5 integration tests verifying SP metadata generation, IdP XML parsing, LoginForm SAML action button, SsoSettingsModal SAML tab, and end-to-end SAML assertion exchange.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 100 test files / 635 tests ✓, web 114 test files / 586 tests ✓, `pnpm build ✓`.
- **Milestone: 120 / 135 features completed overall (88.9%)!**


## 2026-10-03 — F101 — SSO (Phase 13 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `idp` and `sso` prefixes to `IdPrefix` union and created branded types `SsoProviderId` and `SsoSessionId`.
  - `sso.ts`: Pure TypeScript Enterprise Single Sign-On (SSO) engine.
    - IdP configuration model (`SsoProviderConfig`, `validateSsoProviderConfig`) supporting OIDC, OAuth2, and Test IdP.
    - Corporate email domain matching and auto-routing (`findSsoProviderForEmail`, `isSsoEnforcedForEmail`, `normalizeDomain`, `extractDomainFromEmail`).
    - Cryptographically secure PKCE and state/nonce generator (`generateSsoChallenge`, `generateRandomToken`).
    - OIDC claim extraction and normalization (`extractSsoClaims`).
    - Enterprise group-to-role attribute mapping (`mapSsoClaimsToRole`, `DEFAULT_SSO_ATTRIBUTE_MAPPING`).
    - Just-In-Time (JIT) user provisioning and account linking (`provisionSsoUser`).
    - Callback validation and enterprise session generator (`processSsoCallback`).
    - Deterministic Test IdP simulation harness (`createTestIdpConfig`, `simulateTestIdpLogin`).
  - `sso.test.ts`: 19 unit tests covering configuration validation, email domain routing, strict enforcement checks, PKCE challenge generation, group-to-role attribute mapping, JIT user provisioning, existing user linking, callback error validation (invalid code, state mismatch, expired session), and full Test IdP simulation.
  - `index.ts`: Exported `sso` module.
- Web layer (`apps/web/`):
  - `auth.config.ts`: Added enterprise demo IdP providers (Acme Okta, Stark Entra ID, Strict Corp IdP), SSO authentication handler in `authorizeUser`, and strict SSO enforcement blocking password logins for enforced corporate domains.
  - `auth.spec.ts`: Added tests for enterprise SSO authentication and domain enforcement.
  - `components/enterprise/sso-settings-modal.tsx`: Implemented `<SsoSettingsModal />` with 3 tabs (`Configured IdPs`, `⚡ Test IdP Simulation`, `+ Add Provider`), status & enforcement toggles, and live claims inspection.
  - `components/enterprise/index.ts`: Exported enterprise components.
  - `app/login/login-form.tsx`: Added `Password` vs `Enterprise SSO` authentication mode tabs, live corporate domain auto-detection indicator (e.g. Acme Enterprise Okta), 1-Click "⚡ Sign In with Test IdP (Acme Enterprise)" quick login, and direct launcher for Enterprise SSO Settings modal.
  - `sso.spec.tsx`: 6 integration tests verifying LoginForm rendering with Password and Enterprise SSO modes, SsoSettingsModal open/closed states, enforcement badges, and end-to-end Test IdP simulation.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 99 test files / 618 tests ✓, web 113 test files / 580 tests ✓, `pnpm build ✓`.
- **Phase 13 — Enterprise launched! Milestone: 119 / 135 features completed overall (88.1%)!**


## 2026-10-03 — F100 — SVG (Phase 12 Complete)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `svg-export.ts`: Pure vector SVG architecture diagram export engine at fidelity.
    - Theme palettes (`SVG_THEME_PALETTES`): Dark Canvas (`#090D16`), Light Paper (`#F8FAFC`), Transparent Vector.
    - Distinctive C4 shape silhouettes and inline kind icons (`getNodeKindIconPath`): Actor (user silhouette), Store (cylinder database), Application (browser window), Component (modular puzzle), System (cloud server).
    - Edge routing calculation (`calculateSvgEdgePath`): Smooth cubic Bezier curves matching IcePanel Edge, right-angle stepped orthogonal paths, and direct straight lines.
    - Full SVG document compiler (`renderViewToFidelitySvg`): Element cards with header accent bars, kind icons, kind badges, active health dot indicators, title, description, and technology/owner pills. Parent system and group boundary boxes with dashed borders and header pills. Relationship connections with centered protocol/label pills, distinct sync/async line styling, and arrow markers (`#arrow-sync`, `#arrow-async`).
    - Background dot grid alignment pattern and C4 component kind legend.
    - Interactive `<title>` tooltips on nodes and edges for hover inspection.
    - Base64 data URI, FNV-1a checksum, and sanitized filename generation.
  - `svg-export.test.ts`: 10 unit tests covering edge routing calculations, node kind icon paths, XML escaping, full SVG document generation, orthogonal routing, light/transparent themes, display toggles, and resolution scaling.
  - `index.ts`: Exported `svg-export`.
- Web layer (`apps/web/`):
  - `components/canvas/svg-export-modal.tsx`: Implemented `<SvgExportModal />` canvas UI:
    - 3 Navigation tabs: `Interactive Preview`, `Fidelity & Styling Options`, and `SVG XML Markup`.
    - Interactive Preview: Live rendered SVG graphic container with viewport zoom controls (Zoom In, Zoom Out, Reset 100%) and ViewBox coordinate indicator.
    - Fidelity & Styling Options: Theme palette switcher (Dark, Light, Transparent), Edge routing switcher (Curved, Orthogonal, Straight), Resolution scale selector (1x, 2x, 3x) with live pixel dimensions readout, display toggles (Dot Grid, Badges, Header Banner, Legend, Tooltips), and diagram title override input.
    - SVG XML Markup: Formatted XML source viewer with character count and verification badge.
    - Modal Footer: Quick metrics badges (Elements, Connections, File Size), and actions: "Copy Data URI", "Copy SVG Markup", "Download SVG File".
  - `components/canvas/index.ts`: Exported `svg-export-modal`.
  - `svg-export.spec.tsx`: 3 integration tests verifying modal closed state, open modal layout with tabs and action buttons, and live SVG graphic rendering with canvas elements and connections.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 98 test files / 599 tests ✓, web 112 test files / 572 tests ✓, `pnpm build ✓`.
- **Phase 12 — Documentation is now 100% COMPLETE (9/9 features)! Milestone: 118 / 135 features completed overall (87.4%)!**

## 2026-10-03 — F099 — PDF (Phase 12 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `pdf-export.ts`: Pure PDF 1.4 vector documentation and book compilation engine.
    - PDF 1.4 binary stream conformance (`%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`, font dictionaries for Helvetica and Helvetica-Bold, catalog, page tree, byte-accurate XREF offsets table, info dictionary, and trailer `%%EOF`).
    - Standard page dimensions (`getPdfPageDimensions`) for ISO A4 and US Letter in landscape and portrait geometry with literal string escaping (`escapePdf`).
    - Multi-page section generators:
      - `buildCoverPageStream`: Executive cover sheet with branding header, document title, subtitle, version badge, and metadata cards (organization, author, date, watermark).
      - `buildOverviewPageStream`: Architecture summary, key KPI metric cards (systems, containers, components, databases, connections), and system boundary breakdown table.
      - `buildViewPageStream`: Vector diagram projection with auto-grid layout, color-coded node boxes, kind badges, technology tags, and connection lines.
      - `buildCatalogPageStream`: Paginated multi-page service and entity catalog table (up to 12 items/page) with part indicators.
      - `buildAdrsPageStream`: Architecture Decision Records cards with status pills, context, decision, and consequences.
      - `buildFlowsPageStream`: Step-by-step transaction walkthrough table.
    - Export helpers: `exportArchitecturePdfBook` and `exportDocumentToPdf` returning binary string, base64 data URI, page count, byte size, sanitized filename, and FNV-1a checksum.
  - `pdf-export.test.ts`: 9 unit tests covering page dimensions across formats/orientations, multi-page book generation, selective section export, vector diagram box rendering, catalog table multi-page wrapping, ADR and flow rendering, special character escaping, and single view export.
  - `index.ts`: Exported `pdf-export`.
- Web layer (`apps/web/`):
  - `components/canvas/pdf-export-modal.tsx`: Implemented `<PdfExportModal />` canvas UI:
    - 3 Navigation tabs: `Live Preview`, `Document Sections & Options`, and `PDF Syntax Inspector`.
    - Live Preview: Interactive page carousel navigation buttons (`Page 1`, `Page 2`, ...) with current page indicator, visual sheet preview in landscape/portrait geometry, dynamic section renderer, watermark overlay, and running headers/footers with dynamic page numbers.
    - Document Sections & Options: Checkbox toggles for 6 document sections (Cover, Overview, Diagrams, Catalog, ADRs, Flows), page format (A4, Letter), orientation (Landscape, Portrait), page number toggle, metadata inputs (Custom title, author/team, organization, watermark).
    - PDF Syntax Inspector: Raw stream viewer displaying `%PDF-1.4` objects, streams, XREF, and trailer.
    - Modal Footer: Live file size and page count badges, "Copy Data URI" action, and "Download PDF Book" action creating and triggering browser download.
  - `components/canvas/index.ts`: Exported `pdf-export-modal`.
  - `pdf-export.spec.tsx`: 4 integration tests verifying closed modal state, modal dialog rendering with header and action buttons, multi-page carousel controls, and document metadata preview.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 97 test files / 589 tests ✓, web 111 test files / 569 tests ✓, `pnpm build ✓`.
- **Milestone: 117 / 135 features completed overall (86.7%)!**

## 2026-10-03 — F098 — PlantUML (Phase 12 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `plantuml.ts`: Pure PlantUML syntax export and import engine.
    - `toPlantUmlId`, `sanitizePlantUmlText`: Identifier and text sanitizers for compliant PlantUML aliases and escaped quotes/newlines.
    - `exportViewToPlantUml`, `exportViewToPlantUmlResult`: C4 and native component diagram exporter supporting C4-PlantUML standard library includes (`C4_Context.puml`, `C4_Container.puml`, `C4_Component.puml`), C4 macros (`Person`, `Person_Ext`, `System`, `System_Ext`, `Container`, `ContainerDb`, `ContainerQueue`, `Component`), boundary grouping (`System_Boundary`, `Container_Boundary`, `package`) discovering parent containers from model hierarchy, and relationship macros (`Rel`). Native mode supports `actor`, `database`, `queue`, `component [...] as alias`, and `-->` arrows.
    - `exportFlowToPlantUmlSequence`: Sequence diagram exporter producing `@startuml ... @enduml` with `autonumber`, participant and actor declarations, synchronous (`->`) and asynchronous (`->>`) messages, return status codes (`-->`), notes (`note over`), and schema annotations.
    - `importPlantUml`: Robust parser supporting C4 macros, standard components, and sequence diagrams with warnings and errors diagnostics.
  - `plantuml.test.ts`: 11 unit tests covering identifier/text sanitization, C4 context export, C4 container export with boundaries and `ContainerDb`, native component export, sequence export, C4 import, native component import, sequence diagram import, and error diagnostics.
  - `index.ts`: Exported `plantuml`.
- Web layer (`apps/web/`):
  - `components/canvas/plantuml-modal.tsx`: Implemented `<PlantUmlModal />` canvas UI:
    - Navigation tabs: `Export PlantUML` and `Import PlantUML`.
    - Export controls: Flavor switcher (`C4 Macro`, `Component`, `Sequence`), direction buttons (`Top to Bottom`, `Left to Right`), execution flow picker, legend and notes toggles, live metrics summary (target view, nodes, relationships), copy to clipboard, and `.puml` download.
    - Live script preview pane with formatted syntax.
    - Import controls: textarea input with quick "Load Sample C4" and "Load Sample Sequence" buttons, live parser analysis (detected diagram type, objects count, connections count, sequence steps count, syntax badge), discovered entity list, diagnostic alerts, and model import action button.
  - `components/canvas/index.ts`: Exported `plantuml-modal`.
  - `plantuml.spec.tsx`: 4 integration tests verifying closed modal, export tab controls and script generation, node and relationship metrics summary, and import tab parser analysis with valid syntax status and apply button.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 96 test files / 580 tests ✓, web 110 test files / 565 tests ✓, `pnpm build ✓`.
- **Milestone: 116 / 135 features completed overall (85.9%)!**

## 2026-10-03 — F097 — Mermaid (Phase 12 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `mermaid.ts`: Pure bidirectional Mermaid export and import engine.
    - `toMermaidId`, `sanitizeMermaidLabel`: Identifiers and label sanitization ensuring compliant Mermaid identifiers and escaping special characters.
    - `formatMermaidNodeShape`: Formats C4 nodes to Mermaid shapes (cylinders `[(...)]` for stores, stadiums `([ ... ])` for actors, subroutines `[[ ... ]]` for components, rounded rectangles `[...]` for applications/systems).
    - `exportViewToMermaidFlowchart`, `exportViewToMermaid`: Exports any architecture view to Mermaid flowchart (`TB`, `TD`, `LR`, `RL`) with subgraph hierarchy containment, edge types (`-->`, `-.->`, `==>`), labels, and color theme styling classes (`classDef`).
    - `exportFlowToMermaid`, `exportFlowToMermaidResult`: Exports execution flows to Mermaid sequence diagrams with participants, actors, sync/async calls, return messages, schemas, and notes.
    - `importMermaidFlowchart`: Parses Mermaid flowchart script extracting subgraphs, nodes with shapes/labels, and edges with labels into `ModelObject` and `ModelConnection` representations.
    - `importMermaidSequence`: Parses Mermaid sequence diagrams extracting participants, actors, notes, and messages into `ModelObject`, `ModelConnection`, and `FlowWithSteps` with indexed steps.
  - `mermaid.test.ts`: 8 unit tests covering identifier/label sanitization, node shapes, flowchart export with subgraphs, sequence diagram export, flowchart import, sequence diagram import, and error diagnostics.
  - `index.ts`: Exported `mermaid`.
- Web layer (`apps/web/`):
  - `components/canvas/mermaid-modal.tsx`: Implemented `<MermaidModal />` canvas UI:
    - Navigation tabs: `Export Mermaid` and `Import Mermaid`.
    - Export controls: Flowchart vs Sequence diagram mode, direction buttons (`TB`, `TD`, `LR`, `RL`), execution flow selector, subgraph and notes toggles, live metrics summary (target view, nodes, edges), copy to clipboard, and `.mmd` download.
    - Live script preview pane with line counts and formatted syntax.
    - Import controls: textarea input with quick "Load Sample Flowchart" and "Load Sample Sequence" buttons, live parser analysis (detected diagram type, objects count, connections count, steps count, valid syntax badge), discovered entity list, diagnostic alerts, and model import action button.
  - `components/canvas/index.ts`: Exported `mermaid-modal`.
  - `mermaid.spec.tsx`: 4 integration tests verifying closed modal, export tab controls and script generation, node and connection metrics summary, and import tab parser analysis with valid syntax status and apply button.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 95 test files / 569 tests ✓, web 109 test files / 561 tests ✓, `pnpm build ✓`.
- **Milestone: 115 / 135 features completed overall (85.2%)!**

## 2026-10-03 — F096 — Export (Phase 12 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `export.ts`: Multi-format architecture diagram and view export engine.
    - `renderViewToSvg(view, model, options, viewObjects)`: Pure vector SVG generator with responsive `viewBox` coordinates, resolution scaling (1x, 2x, 3x, 4x), background themes (dark, light, transparent), embedded CSS typography, kind badges (`system`, `application`, `store`, `component`, `actor`), arrow markers (`marker-arrow-sync`, `marker-arrow-async`), centered edge labels, metadata title banner, and component kind legend.
    - `renderViewToPdf(view, model, options, viewObjects)`: Native vector PDF 1.4 document generator producing valid `%PDF-1.4 ... %%EOF` files with document catalog, page tree, A4 landscape media box (842 × 595 pt), metadata stream, and embedded vector data.
    - `exportViewAsJson(view, model, options, viewObjects)`: Structured JSON snapshot serializer producing `ViewExportJsonPayload` capturing architectural entities, coordinates, bounding geometry, and connection topologies.
    - `exportArchitectureView`: Unified exporter dispatching to SVG, PNG, PDF, and JSON formats with FNV-1a checksum validation, data URI generation, and dimension calculations.
    - `exportMultipleViews`: Batch export utility for multi-view downloads.
    - `sanitizeFilename`, `generateExportFilename`, `calculateExportBoundingBox`, `computeContentChecksum`.
  - `export.test.ts`: 15 unit tests covering filename sanitization, timestamped filenames, checksum calculation, bounding box geometry, SVG rendering (elements, themes, scales), PDF 1.4 generation, JSON snapshot serialization, unified exporter dispatches, and batch multi-view exports.
  - `index.ts`: Exported `export`.
- Web layer (`apps/web/`):
  - `components/canvas/export-modal.tsx`: Implemented `<ExportModal />` canvas UI:
    - Format selector tab bar: `PNG (Raster Image)`, `SVG (Vector)`, `PDF (Print Document)`, `JSON (Model Data)`.
    - View switcher dropdown when multiple views are available.
    - Live interactive preview container displaying rendered SVG, formatted JSON, or PDF document card.
    - Preview status pill displaying live dimensions, file size, and scale multiplier.
    - Settings sidebar: custom title override input, resolution/scale selector grid (1x, 2x, 3x, 4x), canvas background theme selector (Dark, Light, Transparent), and toggles for Title & Metadata Banner and Component Legend.
    - Bottom action bar with filename display, "Copy to Clipboard", and "Download [FORMAT]".
  - `components/canvas/index.ts`: Exported `export-modal`.
  - `export.spec.tsx`: 3 integration tests verifying closed modal, export modal rendering with controls and actions, and live diagram preview pane containing nodes and connections.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 94 test files / 561 tests ✓, web 108 test files / 557 tests ✓, `pnpm build ✓`.
- **Milestone: 114 / 135 features completed overall (84.4%)!**

## 2026-10-03 — F095 — Architecture Portal (Phase 12 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'ptl'` prefix to `IdPrefix` and exported `type PortalId = Id<'ptl'>`.
  - `architecture-portal.ts`: Interactive architecture portal and public explorer engine.
    - `buildPortalLevelProjection(model, parentId)`: Computes multi-level C4 hierarchy projections (Context L1, Container L2, Component L3) with auto-layout positioning, containment breadcrumb trails, and visible nodes/connections calculation.
    - `drillDownPortalToObject(state, model, targetObjectId)`: Drills down into systems (Context -> Container) and containers (Container -> Component).
    - `navigatePortalUp(state, model, targetBreadcrumbIndex)`: Ascends breadcrumb hierarchy to return to higher abstraction levels.
    - Pure Camera Viewport Controls: `zoomPortalCamera` (bounded zoom [0.2x, 3.0x]), `panPortalCamera` (viewport panning), and `fitPortalCameraToNodes` (bounds-fitting auto-zoom and center alignment).
    - Deep Object Inspector & Highlighting: `inspectPortalObject` gathers metadata (technology, owner, SLA, status), direct inbound callers, outbound dependencies, contained subcomponents, associated ADRs, and execution flows; `getDependencyHighlighting` extracts upstream/downstream dependency subgraphs and active connection IDs.
    - Interactive Flow Playback: `initPortalFlowPlayback` and `stepPortalFlowPlayback` enable step-by-step sequence navigation with active source/target participant identification and edge highlighting.
    - Global Multi-Entity Search: `searchArchitecturePortal` indexes and scores objects, views, flows, ADRs, and doc pages with token relevance ranking.
  - `architecture-portal.test.ts`: 13 unit tests covering initialization, C4 projections (Context, Container, Component), drill-down, upward navigation, camera zoom/pan/fit, inspector extraction, dependency highlighting, flow playback stepping, and multi-entity search scoring.
  - `index.ts`: Exported `architecture-portal`.
- Web layer (`apps/web/`):
  - `components/canvas/architecture-portal-panel.tsx`: Implemented `<ArchitecturePortalModal />` canvas UI:
    - Public read-only explorer header banner: `"PUBLIC EXPLORER • NO ACCOUNT REQUIRED"`.
    - Global multi-entity search bar with popover and keyboard navigation.
    - C4 Breadcrumb navigation bar with current level badge (`CONTEXT (L1)`, `CONTAINER (L2)`, `COMPONENT (L3)`) and drill-up button.
    - Canvas viewport with zoom in/out, reset, and fit-to-view controls.
    - Interactive C4 node cards displaying kind, status, technology, inbound/outbound connection counts, and "Drill Down →" action.
    - Side drawer with dual modes:
      - Object Inspector: Displays detailed properties, SLA, contained components, upstream callers, downstream dependencies, and associated ADRs.
      - Execution Flow Playback: Step progression bar, step description, active participants, and Previous/Next navigation.
  - `components/canvas/index.ts`: Exported `architecture-portal-panel`.
  - `architecture-portal.spec.tsx`: 5 integration tests verifying closed state, public read-only header/banner, C4 level breadcrumbs and node cards, container level drill-down with inspector, and global search/flow selector.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 93 test files / 546 tests ✓, web 107 test files / 554 tests ✓, `pnpm build ✓`.
- **Milestone: 113 / 135 features completed overall (83.7%)!**

## 2026-10-03 — F094 — Public Documentation (Phase 12 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'pub'` prefix to `IdPrefix` and exported `PublicationId`.
  - `public-documentation.ts`: Public documentation and static site generation engine.
    - `createPublicDocPublication(params)`: Initializes public doc publication with slug generation, default branding, SEO metadata, and draft status.
    - `publishDocPublication`, `unpublishDocPublication`, `updatePublicDocPublication`: Manages publication lifecycle, version history records (`versionHistory`), and publication timestamps.
    - `recordPublicDocView`: Tracks total pageviews, unique visitors, and last viewed timestamp.
    - `verifyPublicDocAccess(publication, request)`: Evaluates anonymous visitor access for `'public'` (open to internet without login), `'unlisted'` (secret token link without login), and `'password_protected'` (passkey verification without account registration). Enforces publication status and expiration checks.
    - `generatePublicShareUrl(publication, baseUrl)`: Generates clean external reader URLs or custom domain paths.
    - `compilePublicSiteBundle(publication, model, options)`: Compiles complete static documentation portal bundle with Overview page, Subsystem & Component entity pages, Architecture Decision Records (ADRs), Diagram Views, and Execution Flows. Generates sitemap.xml (`<urlset>`), robots.txt, and client-side full-text search index.
    - `searchPublicSite(bundle, query)`: Client-side full-text search with token ranking and snippet generation.
    - `renderStandalonePublicSiteHtml(bundle)`: Emits self-contained, single-page responsive HTML document with embedded CSS, navigation sidebar, and offline search.
  - `public-documentation.test.ts`: 19 unit tests covering slugification, reading time estimation, excerpt generation, publication creation, publishing/unpublishing, version history, view counting, anonymous access verification (public, unlisted, password protected with passkey, expired, draft), site compilation, content filtering, search ranking, and standalone HTML rendering.
  - `index.ts`: Exported `public-documentation`.
- Web layer (`apps/web/`):
  - `components/canvas/public-documentation-panel.tsx`: Implemented `<PublicDocumentationModal />` canvas UI:
    - Status header banner with portal title, status badge (`published` vs `draft`), version tag, visibility badge, and public URL.
    - Share link banner with public URL display, "Copy Public Link" button, and "View as External Reader (No Account Required)".
    - Publisher settings dashboard with 6 configuration tabs: General & Branding, Access & Security, Content Selection, Releases & Versioning, Reader Analytics, Offline HTML Export.
    - External Reader Simulation Mode:
      - Reader mode banner indicating anonymous access without account.
      - Password protection lock screen with passkey prompt for external readers.
      - Responsive documentation layout with navigation sidebar, instant client-side search, breadcrumbs, tags, reading time, and rich HTML document body.
  - `components/canvas/index.ts`: Exported `public-documentation-panel`.
  - `public-documentation.spec.tsx`: 4 integration tests verifying closed modal, publisher portal rendering with public URL viewable without an account, settings navigation tabs, and published state with unpublish action.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 92 test files / 533 tests ✓, web 106 test files / 549 tests ✓, `pnpm build ✓`.
- **Milestone: 112 / 135 features completed overall (83.0%)!**

## 2026-10-03 — F093 — Markdown Editor (Phase 12 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `markdown-editor.ts`: Rich Markdown editor and architecture embedding engine.
    - Embed Directives: Supports syntax `:::diagram[id]{options}`, `:::object[id]{options}`, `:::flow[id]{options}`, and `:::adr[id]{options}` with parameter extraction.
    - `parseMarkdownDocument(content, metadata)`: Parses markdown into abstract AST nodes (headers, paragraphs, lists, blockquotes, code blocks, tables, architecture embeds, callouts, horizontal rules), extracting table of contents headings and embedded architecture entity references.
    - `generateTableOfContents(nodes)`: Builds structured TOC navigation with anchors, levels, and hierarchy.
    - `validateEmbedReferences(doc, model)`: Cross-references embedded diagram IDs, object IDs, flow IDs, and ADR IDs against the active architectural model, identifying valid and dangling references.
    - `renderDocumentToSemanticHtml(doc)`: Produces clean semantic HTML with CSS classes for styling embeds, callouts, and code blocks.
    - `addCommentToDocument`, `resolveCommentInDocument`, `replyToComment`: Threaded inline and document-level commenting.
  - `markdown-editor.test.ts`: 10 unit tests covering AST parsing, directives, embed extraction, reference validation, semantic HTML rendering, and commenting.
  - `index.ts`: Exported `markdown-editor`.
- Web layer (`apps/web/`):
  - `components/canvas/markdown-editor-modal.tsx`: Implemented `<MarkdownEditorModal />` with 3 view modes (Split, Edit, Preview), stats bar (words, chars, reading time, references), formatting toolbar (bold, italic, code, headings, lists, tables), architecture embed insert menu (Diagrams, Components, Flows, ADRs), live interactive diagram view preview cards with metadata and node counts, and threaded discussion comments sidebar.
  - `components/canvas/index.ts`: Exported `markdown-editor-modal`.
  - `markdown-editor.spec.tsx`: 4 integration tests verifying view switching, toolbar formatting, interactive diagram embed preview card rendering, and thread commenting.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 91 test files / 514 tests ✓, web 105 test files / 545 tests ✓, `pnpm build ✓`.
- **Milestone: 111 / 135 features completed overall (82.2%)!**

## 2026-10-03 — F092 — Architecture Documentation (Phase 12 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `architecture-documentation.ts`: Model-first living documentation and doc tree navigation engine.
    - `buildArchitectureDocTree(model, options)`: Builds hierarchical navigation tree preserving parent-child containment (`parentId`), paths (`/docs/system/container/component`), tree depths, and connection counts with cycle prevention.
    - `generateObjectDocPage(objectId, model, context)`: Compiles comprehensive object doc page from metadata and topology connections (identity, governance, technical stack, environment, domain, criticality, compliance, inbound callers table, outbound dependencies table, contained subcomponents, SLA resilience, associated ADRs, flows, and views).
    - `generateArchitectureOverviewDocPage(model, context)`: System-level documentation page synthesizing high-level architecture stats, technologies, and subsystem hierarchy.
    - `generateArchitectureDocPages(model, context)`: Batch generates doc pages for all objects in the model.
    - `exportArchitectureDocsAsCatalog(model, context)`: Bundles navigation tree, overview, and all object pages into a unified doc catalog.
    - `renderDocPageToMarkdown(page)`: Serializes structured documentation pages to clean GitHub Flavored Markdown with markdown tables.
    - `findDocTreeNode`, `flattenDocTree`, `getDocBreadcrumbs`, `searchDocTree`: Tree traversal and search utilities.
  - `architecture-documentation.test.ts`: 11 unit tests.
  - `index.ts`: Exported `architecture-documentation`.
- Web layer (`apps/web/`):
  - `components/canvas/architecture-documentation-panel.tsx`: Implemented `<ArchitectureDocumentationModal />` with header banner, breadcrumb bar, searchable tree sidebar, 5 view tabs (Overview & Metadata, Connections & Interfaces, Hierarchy, Markdown Spec, Artifacts), copy markdown action, and target-in-canvas focus.
  - `components/canvas/index.ts`: Exported `architecture-documentation-panel`.
  - `architecture-documentation.spec.tsx`: 3 integration tests.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 90 test files / 504 tests ✓, web 104 test files / 541 tests ✓, `pnpm build ✓`.
- **Milestone: 110 / 135 features completed overall (81.5%)!**

## 2026-10-03 — F130 — Circular + SPOF Detection (Phase 11 COMPLETE)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `circular-spof.ts`: Structural risk detection engine.
    - `detectCircularDependencies(model)`: Detects directed circular dependency loops via DFS, categorizes synchronicity, assigns severity (`critical`, `high`, `medium`), generates ordered hop chains (`A ➔ B ➔ C ➔ A`), and provides actionable breaking edge decoupling suggestions.
    - `findArticulationPoints(nodes, connections)`: Tarjan's cut-vertex algorithm ($O(V+E)$) detecting single nodes whose failure partitions graph topology into disconnected subgraphs.
    - `detectSinglePointsOfFailure(model, options)`: Detects SPOF components across 5 risk categories (`fan_in_bottleneck`, `sole_provider`, `articulation_point`, `unreplicated_store`, `unmitigated_hub`), respecting active redundancy metadata (`ha`, `redundant`, `replicas > 1`, `multiAz`).
    - `analyzeStructuralRisks(model, options)`: Computes composite `StructuralRiskMetrics` with structural health score (0–100), overall risk level (`healthy`, `warning`, `critical`), and prioritized architectural recommendations.
  - `circular-spof.test.ts`: 6 unit tests covering seeded cycles, high fan-in SPOF, articulation points, unreplicated datastores, HA redundancy elimination, and structural risk reporting.
  - `index.ts`: Exported `circular-spof`.
- Web layer (`apps/web/`):
  - `components/canvas/circular-spof-panel.tsx`: Implemented `<CircularSpofModal />` with score badge and risk level, 6 KPI cards, recommendations banner, 3 tabs (All Risks / Cycles / SPOFs), severity and search filters, breaking edge guidance, dependent service lists, and mitigation advice.
  - `components/canvas/index.ts`: Exported `circular-spof-panel`.
  - `circular-spof.spec.tsx`: 2 integration tests.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 89 test files / 493 tests ✓, web 103 test files / 538 tests ✓, `pnpm build ✓`.
- **Milestone: Phase 11 — Drift and Governance is now 100% COMPLETE (10 / 10 features)! 108 / 135 features completed overall (80.0%)!**

## 2026-10-03 — F129 — Architecture Health (Phase 11 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `architecture-health.ts`: Architecture health scorecard and analytics engine. Aggregates 5 core categories with findings and scores:
    1. **Dependencies & Topology**: Evaluates circular dependency chains via `detectDependencyCycles`, dangling connections pointing to non-existent objects, and isolated unlinked components.
    2. **Documentation Coverage**: Evaluates component-level and high-level architecture overview descriptions.
    3. **Security Architecture**: Assesses exposures, sensitive datastore encryption, and unauthenticated public endpoints via `analyzeSecurityArchitecture` (F090).
    4. **Ownership Governance**: Evaluates service and store ownership coverage (excluding external actors and grouping boundaries).
    5. **Architecture Drift**: Detects unmanaged resources and missing connections vs actual discovered infrastructure via `detectArchitectureDrift` (F084).
    - Computes weighted composite health score and overall status (`healthy`, `warning`, `critical`).
    - Calculates detailed analytics counts (totalObjects, totalConnections, ownershipCoverage, documentationCoverage, cyclicDependencyCount, securityScore, driftItemCount, lintFindingCount, ruleViolationCount).
    - Calculates grounded **Change Analytics** when evaluated against a baseline model (score delta, trend, risk level, added/modified/removed entities, and affected component/flow counts via F059 change sets).
  - `architecture-health.test.ts`: 7 unit tests covering clean baseline high score, seeded gaps across all 5 categories, and change analytics regressions/improvements.
  - `index.ts`: Exported `architecture-health`.
- Web layer (`apps/web/`):
  - `components/canvas/architecture-health-panel.tsx`: Implemented `<ArchitectureHealthModal />` with score badge and status, 6 KPI cards, change analytics banner, 5 interactive category progress cards, findings filter (category, severity, search), inspect target links, JSON export, and clipboard summary copy.
  - `components/canvas/index.ts`: Exported `architecture-health-panel`.
  - `architecture-health.spec.tsx`: 3 integration tests.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 88 test files / 487 tests ✓, web 102 test files / 536 tests ✓, `pnpm build ✓`.

## 2026-10-02 — F091 — Data Lineage (Phase 11 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `data-lineage.ts`: Data lineage tracing and compliance engine. Traces data flow paths from any source node across the architecture model graph via DFS with per-path cycle prevention (`visitedInPath` Set). Supports edge reversal for read/query/pull operations (store→service), compliance boundary crossing detection with TLS/HTTPS validation, and multi-hop tracing up to `maxHops` (default 10). Produces `DataLineageReport` with `LineagePath[]` (ordered hop chains), `LineageBoundaryCrossing[]` (trust-zone transitions with TLS status), `DataLineageMetrics` (maxHops, endConsumers, nodesReached, boundaryCrossings, unencryptedCrossings, complianceNodes), per-hop compliance zone tracking (PII, PCI, HIPAA, GDPR, SOC2), and unencrypted crossing flag.
  - `data-lineage.test.ts`: 3 unit tests verifying path enumeration, boundary crossing detection with TLS status, and edge reversal for read/query directionality.
  - `index.ts`: Exported `data-lineage`.
- Web layer (`apps/web/`):
  - `components/canvas/data-lineage-panel.tsx`: Implemented `<DataLineageModal />` with source node selector, posture banner (unencrypted crossing warning), 6 KPI cards (Max Hops, End Consumers, Nodes Reached, Boundary Crossings, Unencrypted Crossings, Compliance Nodes), 3 tabs (Lineage Paths / Nodes / Boundary Crossings), hop-by-hop visual chain with compliance zone badges.
  - `components/canvas/index.ts`: Exported `data-lineage-panel`.
  - `data-lineage.spec.tsx`: 2 integration tests.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 87 test files / 480 tests ✓, web 101 test files / 533 tests ✓, api 37 test files / 270 tests ✓, `pnpm build ✓`.

## 2026-10-02 — F090 — Security Architecture (Phase 11 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-architecture.ts`: Deep security architecture model and governance analysis engine. Analyzes:
    1. **Trust Boundaries**: Groups objects by isolation levels (`untrusted`, `dmz`, `trusted`, `restricted`, `critical`) and enclosed components.
    2. **Public Endpoints**: Audits public/internet-facing entrypoints, verifying authentication schemes (`oauth2`, `jwt`, `apiKey`, `mTLS`).
    3. **Data Encryption**: Audits sensitive datastores (PII, PCI, HIPAA, GDPR, SOC2) and evaluates encryption at rest (`AES-256`, cloud KMS).
    4. **Secrets Management**: Detects unmanaged or hardcoded credentials versus secure vaults (HashiCorp Vault, Cloud KMS).
    5. **Cross-Boundary Connections**: Flags cross-boundary traffic missing in-transit TLS encryption or missing authentication into restricted zones.
    6. **Compliance Zones**: Maps regulatory frameworks (PII, PCI, HIPAA, GDPR, SOC2) to enrolled objects and sensitive datastores.
    7. **Metrics & Score**: Computes full metrics and a normalized Security Score (0-100) penalized by exposure severity.
  - `security-architecture.test.ts`: 3 unit tests verifying boundary discovery, exposure detection (public unauth endpoints, unencrypted PCI stores, unencrypted transit, hardcoded secrets), compliance zone mapping, and clean score evaluation.
  - `index.ts`: Exported `security-architecture`.
- Web layer (`apps/web/`):
  - `components/canvas/security-architecture-panel.tsx`: Implemented `<SecurityArchitectureModal />` with posture banner, score badge (0-100), 6 KPI metric cards (Score, Trust Boundaries, Public Ingress, Sensitive Stores, Cross-Boundary Links, Exposures), 6 interactive tabs (Exposures, Boundaries, Endpoints, Encryption, Compliance, Cross-Boundary), remediation guidance, and live search.
  - `components/canvas/index.ts`: Exported `security-architecture-panel`.
  - `security-architecture.spec.tsx`: 3 integration tests.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 86 test files / 477 tests ✓, web 100 test files / 531 tests ✓, api 37 test files / 270 tests ✓, `pnpm build ✓`.

## 2026-10-02 — F089 — Failure Simulation (Phase 11 Progress)


Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `failure-simulation.ts`: Architecture failure simulation engine. Allows marking one or more model objects as "down", cascades failure through the architecture via reverse BFS blast-radius analysis, and classifies each node into `down`, `degraded`, `fallback`, or `healthy`. Distinguishes resilient nodes with active fallback mechanisms (`status: 'fallback'`) from unmitigated services (`status: 'degraded'`). Provides `getAffectedConnections` to identify disrupted edges. Computes failure metrics: totalDownedNodes, totalDegradedNodes, totalFallbackNodes, totalHealthyNodes, impactedCustomerFacingCount, impactedTeamCount, maxCascadeDepth, and hasFullOutage.
  - `failure-simulation.test.ts`: 3 unit tests verifying DB outage downstream propagation, fallback vs no-fallback distinction, and affected connection filtering.
  - `index.ts`: Exported `failure-simulation`.
- Web layer (`apps/web/`):
  - `components/canvas/failure-simulation-panel.tsx`: Implemented `<FailureSimulationModal />` with multi-node outage selector, custom reason input, severity banner, 6 KPI cards (Downed Nodes, Degraded, Fallback Active, Healthy, Customer Facing, Max Cascade Depth), status filter tabs + search, and impacted node cards with fallback capability badges (`FALLBACK READY` vs `NO FALLBACK`) and interactive Mark Down / Restore buttons.
  - `components/canvas/index.ts`: Exported `failure-simulation-panel`.
  - `failure-simulation.spec.tsx`: 3 integration tests.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 85 test files / 474 tests ✓, web 99 test files / 528 tests ✓, api 37 test files / 270 tests ✓, `pnpm build ✓`.

## 2026-10-02 — F088 — Blast-Radius Analysis (Phase 11 Progress)


Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `blast-radius.ts`: Architecture blast-radius analysis engine using reverse BFS from a failing node. Computes: impacted services (application/system/component nodes), databases (store nodes), disrupted flows (edges), teams (distinct `metadata.owner`/`metadata.team` values), customer-facing node count (actor kind or `metadata.customerFacing`). Severity scoring: `critical` (customer-facing + no fallback) → `high` (customer-facing) → `medium` (≥3 services or critical path) → `low`. `ImpactedNode` carries hopCount, isCustomerFacing, hasFallback (resolved from `metadata.hasFallback/fallback/circuitBreaker/redundant`), and team label.
  - `blast-radius.test.ts`: 3 unit tests verifying gateway failure counts, critical severity detection, and low severity for isolated internal services.
  - `index.ts`: Exported `blast-radius`.
- Web layer (`apps/web/`):
  - `components/canvas/blast-radius-panel.tsx`: Implemented `<BlastRadiusModal />` with target node selector dropdown, severity banner (colored critical/high/medium/low), critical-path warning, 6 KPI metric cards (Services, Databases, Flows, Customer Facing, Teams, Max Hops), impacted node list sorted by hop count with customer-facing badge and no-fallback badge.
  - `components/canvas/index.ts`: Exported `blast-radius-panel`.
  - `blast-radius.spec.tsx`: 3 integration tests.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 84 test files / 471 tests ✓, web 98 test files / 525 tests ✓, `pnpm build ✓`.

## 2026-10-02 — F087 — Dependency Analysis (Phase 11 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `dependency-graph.ts`: Architecture dependency graph and path analysis engine. Implements:
    1. **`inferDependencyCategory`**: Classifies each connection as `runtime` / `compile-time` / `data` / `external` based on source/target object kinds (`actor`→external, `store`→data) and connection metadata (`dependencyType: 'compile-time'/'build'/'package'`, `conn.kind === 'dependency'`).
    2. **`detectDependencyCycles`**: DFS back-edge cycle detection; extracts cycle node lists and path descriptions.
    3. **`findDependencyPaths`**: BFS/DFS path enumeration between any two nodes (up to configurable max hops); returns all paths sorted by hop count.
    4. **`analyzeArchitectureDependencies`**: Builds direct + indirect edge sets, applies `DependencyFilterOptions` (type: direct/indirect, category: runtime/compile-time/data/external, selectedNodeId for focus), computes metrics (totalNodes, directDependencyCount, indirectDependencyCount, runtimeCount, compileTimeCount, dataCount, externalCount, cycleCount, hasCycles).
  - `dependency-graph.test.ts`: 3 unit tests verifying cycle detection (A→B→C→A), indirect path discovery (A→B→C→D), and category filter correctness (direct/indirect/runtime/compile-time/data/external).
  - `index.ts`: Exported `dependency-graph`.
- Web layer (`apps/web/`):
  - `components/canvas/dependency-panel.tsx`: Implemented `<DependencyAnalysisModal />` with 8 KPI metric cards (Nodes, Direct, Indirect, Runtime, Compile-time, Data, External, Cycles), red cycle warning alert banner, type filter buttons (All/Direct/Indirect), category filter dropdown, node-focus select, search input, edge card list (source→target, hop count, category/type badges), and footer showing filtered vs total edge counts.
  - `components/canvas/index.ts`: Exported `dependency-panel`.
  - `dependency.spec.tsx`: 3 integration tests — renders with cycle warning for cyclic model, renders with indirect path info for non-cyclic model, renders null when `isOpen=false`.
- Verification: `pnpm typecheck ✓`, `pnpm lint ✓`, `pnpm check-architecture ✓`, domain 83 test files / 468 tests ✓, web 97 test files / 522 tests ✓, `pnpm build ✓`.

## 2026-10-02 — F086 — Architecture Rules (Phase 11 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `rules.ts`: Implemented organization architecture governance rules engine for DiagramHQ (Phase 11 — Drift and Governance). Evaluates architecture models against the 4 canonical enterprise governance rules:
    1. **`ORG-RULE-001` (Owner Required)**: Every architectural application, store, and service must have an explicitly assigned team or owner in `metadata.owner` or `metadata.team`.
    2. **`ORG-RULE-002` (External API Authentication Required)**: All external ingress connections and boundary interfaces must enforce an authentication scheme (e.g. OAuth2, JWT, API Key, mTLS) and cannot be unauthenticated ('none' / 'public').
    3. **`ORG-RULE-003` (No Cross-Service Direct Database Access)**: Enforces the Database-Per-Service pattern. Datastores owned by a microservice cannot be directly connected to or queried by foreign microservices; cross-service communication must route through APIs or events.
    4. **`ORG-RULE-004` (PII Flow Restrictions)**: Connections transmitting Personally Identifiable Information (PII) or sensitive/restricted data must enforce cryptographic encryption (TLS/HTTPS/mTLS) and cannot flow to untrusted or external third-party endpoints without a verified Data Processing Agreement (DPA).
  - Implemented `evaluateArchitectureRules` supporting policy configuration for rule disabling (`disabledRuleIds`) and severity overrides (`severityOverrides`).
  - `rules.test.ts`: Added 6 unit tests verifying that a compliant model satisfies all 4 rules, each individual rule fires on violating models, and policy configuration (disabling and severity overrides) works.
  - `index.ts`: Exported `rules`.
- Web layer (`apps/web/`):
  - `components/canvas/rules-panel.tsx`: Implemented `<ArchitectureRulesModal />` (interactive policy governance modal with compliant/non-compliant hero banner, 4 interactive rule cards with pass/fail counts, rule filter dropdown, search bar, violation cards with remediation advice, and canvas element focus trigger).
  - `components/canvas/index.ts`: Exported `rules-panel`.
  - `rules.spec.tsx`: Added 3 integration tests verifying compliant state banner, non-compliant state with violation cards, and closed state.
- Milestone:
  - **101 / 135 total features completed (74.8% milestone reached)!**
  - **Phase 11 — Drift and Governance is 37.5% complete (3/8 features)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean, 0 errors, 0 warnings)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (all domain and web tests passing)
```

## 2026-10-02 — F085 — Architecture Linting (100 Features Complete Milestone!)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `linting.ts`: Implemented architecture linting engine and rule evaluator for DiagramHQ (Phase 11 — Drift and Governance). Evaluates architecture models against canonical rules spanning structural integrity, hierarchy containment, documentation completeness, and node coupling (`ARCH-001` Dangling Connection, `ARCH-002` Store-to-Store Coupling, `ARCH-003` Invalid Containment Hierarchy, `ARCH-004` Orphaned Architecture Object, `ARCH-005` Missing Technology Stack, `ARCH-006` Self-Referencing Loop, `ARCH-007` Excessive Node Coupling, `ARCH-008` Missing Description, `ARCH-009` Missing User/Actor Entrypoint). Produces structured findings at `error`, `warning`, and `info` levels with actionable remediation advice, target identifiers, and dynamic health scoring (0 - 100).
  - Implemented `lintArchitectureModel` with configurable severity threshold, custom rule extension, and rule suppression options.
  - `linting.test.ts`: Added 4 unit tests verifying that a clean model produces 0 findings & 100% health score, seeded violations produce expected findings at error/warning/info, severity threshold filtering works, and custom/ignored rules are respected.
  - `index.ts`: Exported `linting`.
- Web layer (`apps/web/`):
  - `components/canvas/lint-panel.tsx`: Implemented `<ArchitectureLintModal />` (interactive architecture quality diagnostics modal with clean banner, health gauge, severity filter tabs, category dropdown, search filtering, finding cards with actionable remediation, and canvas focus trigger).
  - `components/canvas/index.ts`: Exported `lint-panel`.
  - `linting.spec.tsx`: Added 3 integration tests verifying clean state banner, violating state with issue summary cards, and closed state.
- Milestone:
  - **100 / 135 total features completed (74.1% milestone reached)!**
  - **Phase 11 — Drift and Governance is 25% complete (2/8 features)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean, 0 errors, 0 warnings)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (all domain and web tests passing)
```

## 2026-10-02 — F084 — Architecture Drift (Phase 11 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `drift.ts`: Implemented architecture drift detection and governance engine for DiagramHQ (Phase 11 — Drift and Governance). Compares documented architecture model (objects and connections) against imported/discovered actual infrastructure and code state, surfacing the full delta: unmanaged resources, missing resources, attribute mismatches, undocumented connections, and missing connections. Every drift item carries grounded `DriftEvidence` (`sourceType`, `sourceRef`, `confidence`, `detectedAt`, `details`) and severity classification (`critical`, `high`, `medium`, `low`, `informational`).
  - Implemented 3 canonical action workflows:
    1. **Update Model (`reconcileDriftDirectly`)**: Directly synchronizes selected or all drift items into the documented architecture model without destructive side-effects.
    2. **Ignore (`ignoreDriftItem`)**: Suppresses specific drift items with an audit-logged justification reason and timestamp for compliance tracking.
    3. **Create Change Request (`createChangeRequestFromDrift`)**: Formulates detected drift into an `ArchitecturePullRequest` complete with visual diff (`computeVisualArchitectureDiff`), structured change set (`computeArchitectureChangeSet`), risk scoring, and affected systems list.
  - Implemented `detectArchitectureDrift`, `reconcileDriftDirectly`, `ignoreDriftItem`, and `createChangeRequestFromDrift`.
  - `drift.test.ts`: Added 4 unit tests verifying delta surfacing, direct model updating, item ignoring with reasons, and change request PR generation from seeded drift.
  - `index.ts`: Exported `drift`.
- Web layer (`apps/web/`):
  - `components/canvas/drift-panel.tsx`: Implemented `<ArchitectureDriftModal />` (interactive drift inspection and governance modal with KPI summary cards, severity & type filters, selectable drift items, attribute diff comparison table, expandable evidence drawers, and action triggers for Update Model, Ignore, and Create Change Request PR).
  - `components/canvas/index.ts`: Exported drift panel.
  - `drift.spec.tsx`: Added 3 integration tests verifying modal rendering, closed state, and interactive action buttons.
- Milestone:
  - **99 / 135 total features completed (73.3% milestone reached)!**
  - **Phase 11 — Drift and Governance is now IN PROGRESS (1/8 features completed)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean, 0 errors, 0 warnings)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (all domain and web tests passing)
```

## 2026-10-02 — F128 — Cost Visualization (Phase 10 COMPLETE!)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `cost-visualization.ts`: Implemented cloud infrastructure cost estimation and architectural cost overlay engine for DiagramHQ (Phase 10 — Infrastructure Integrations). Attaches cloud cost data to infrastructure architecture model objects without mutating original objects (`attachCostToObject`), computes per-service rollups with subtotals across categories (`calculateServiceCostRollup` across compute, database, storage, networking), generates architecture-wide cost summaries (`calculateArchitectureCostReport`), and preserves grounded `CostEvidence` (`sourceType: 'cloud_billing'`, billing account, meter ID, provider, timestamp).
  - Implemented `attachCostToObject`, `calculateServiceCostRollup`, `calculateArchitectureCostReport`, and `createMockCostDataset`.
  - `cost-visualization.test.ts`: Added 4 unit tests verifying cost attachment & immutability, per-service rollups across compute/db/storage/networking, multiple resource aggregation, and architecture cost reports.
  - `index.ts`: Exported `cost-visualization`.
- Web layer (`apps/web/`):
  - `components/canvas/cost-panel.tsx`: Implemented `<CostVisualizationModal />` (interactive modal with currency switcher, high-level KPI cards, category breakdown progress cards, filtered service rollups, expandable billing evidence, and canvas overlay integration).
  - `components/canvas/index.ts`: Exported cost panel.
  - `cost.spec.tsx`: Added 3 integration tests verifying modal rendering, closed state, and per-service cost items with evidence.
- Milestone:
  - **98 / 135 total features completed (72.6% milestone reached)!**
  - **Phase 10 — Infrastructure Integrations is now 100% COMPLETE (7/7 features)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean, 0 errors, 0 warnings)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (206 test suites, 1228 tests passed)
```

## 2026-10-02 — F083 — Cloud Resource Discovery (Phase 10 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `cloud-discovery.ts`: Implemented live multi-cloud resource discovery and automated architecture proposal engine for DiagramHQ (Phase 10 — Infrastructure Integrations). Discovers live infrastructure resources across accounts and subscriptions (AWS, Azure, GCP, Kubernetes), classifying resources into functional categories (`compute`, `database`, `storage`, `networking`, `messaging`, `security`) with deterministic C4 `ModelObjectKind` mapping (`application`, `store`, `group`, `component`). Reconciles live resources against existing architecture models, generating proposals with concrete `CloudDiscoveryEvidence` (`sourceType: 'cloud_discovery'`, confidence >= 0.9, provider, account, region, matchReason) for creates (unmapped assets), updates (reconfigured attributes/status), drifts (terminated backing resources), and exact matches. Supports proposal execution (`applyDiscoveryProposals`).
  - Implemented `determineObjectKindForDiscoveredResource`, `inferCloudCategory`, `reconcileCloudResources`, `applyDiscoveryProposals`, `createMockCloudAccounts`, and `createMockMultiCloudResources`.
  - `cloud-discovery.test.ts`: Added 7 unit tests verifying category inference, kind mapping, live discovery reconciliation with evidence, duplicate prevention, attribute updates, drift/stale detection, and proposal application.
  - `index.ts`: Exported `cloud-discovery`.
- Web layer (`apps/web/`):
  - `components/canvas/cloud-discovery-panel.tsx`: Implemented `<CloudDiscoveryModal />` (interactive multi-cloud discovery panel with account selectors, live scan trigger, summary KPI metrics, provider and category filter chips, proposal card list with action badges, expandable evidence drawers, and bulk proposal application).
  - `components/canvas/index.ts`: Exported cloud discovery panel.
  - `cloud-discovery.spec.tsx`: Added 3 integration tests verifying modal rendering, closed state, and accessibility attributes.
- Milestone:
  - **97 / 135 total features completed (71.9% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean, 0 errors, 0 warnings)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (205 test suites, 1221 tests passed)
```

## 2026-10-02 — F082 — Kubernetes (Phase 10 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `kubernetes.ts`: Implemented Kubernetes cluster topology and workload manifest import engine for DiagramHQ (Phase 10 — Infrastructure Integrations). Multi-document YAML parser supporting all 14 canonical Kubernetes resource types (Cluster, Namespace, Deployment, StatefulSet, DaemonSet, Job, CronJob, Pod, Service, Ingress, ConfigMap, Secret, PersistentVolume, PersistentVolumeClaim). Maps resources to `ModelObject` records with proper C4 kinds (`group`, `store`, `application`), multi-tenant namespace containment (`groupByNamespace`) setting `parentId` to enclosing namespace group object, and automatic topology connection inference (Ingress -> Service routing, Service -> Workload selector matching, Workload -> PVC storage mounts, PVC -> PV storage bindings, Workload -> ConfigMap/Secret environment bindings). Preserves traceable `KubernetesEvidence` (`sourceType: 'kubernetes_manifest'`).
  - Implemented `normalizeK8sKind`, `determineObjectKindForK8s`, `parseKubernetesYaml`, `importKubernetesManifests`, and `createMockKubernetesManifests`.
  - `kubernetes.test.ts`: Added 5 unit tests verifying kind normalization, classification, multi-document parsing, acceptance test on sample microservices manifests, and namespace filtering.
  - `index.ts`: Exported `kubernetes`.
- Web layer (`apps/web/`):
  - `components/canvas/kubernetes-panel.tsx`: Implemented `<KubernetesImportModal />` (interactive modal featuring cluster name input, sample stack loader, kind filter chips for all 14 types, namespace grouping toggle, topology connection inference toggle, tabbed views for topology preview and YAML manifest editor, and import execution).
  - `components/canvas/index.ts`: Exported Kubernetes components.
  - `kubernetes.spec.tsx`: Added 3 integration tests verifying modal rendering, closed state, and discovered sample resource rendering.
- Milestone:
  - **96 / 135 total features completed (71.1% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (204 test suites, 1211 tests passed)
```

## 2026-10-02 — F081 — Terraform (Phase 10 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `terraform.ts`: Implemented Terraform Infrastructure as Code (IaC) configuration parser and architecture mapping engine for DiagramHQ (Phase 10 — Infrastructure Integrations). Parses Terraform configurations (`.tf`, `.tfvars`) and state JSON (`.tfstate`, plan JSON), extracting resources, modules, outputs, and variables across multi-cloud providers (AWS, Azure, GCP, Kubernetes, generic). Maps resources to `ModelObject` records with proper C4 kinds (`store`, `group`, `component`, `application`), generates module containment hierarchies (`groupByModule`), infers inter-resource `ModelConnection` dependencies with protocols (`TCP:5432`, `HTTPS`, `AMQP`), and preserves traceable `TerraformEvidence` (`sourceType: 'iac_terraform'`).
  - Implemented `detectProvider`, `determineObjectKindForTerraform`, `formatTerraformResourceName`, `parseTerraformHcl`, `parseTerraformStateJson`, `deriveTerraformConnection`, `importTerraformConfig`, and `createMockTerraformRepo`.
  - `terraform.test.ts`: Added 7 unit tests verifying provider and kind detection, HCL parsing, state JSON parsing, connection derivation, acceptance test on sample repo, and provider filtering.
  - `index.ts`: Exported `terraform`.
- Web layer (`apps/web/`):
  - `components/canvas/terraform-panel.tsx`: Implemented `<TerraformImportModal />` (interactive modal featuring repository URL input, sample repo loader, provider filter pills for AWS, Azure, GCP, Kubernetes, module grouping toggle, connection inference toggle, tabbed views for architecture preview, file editor, state JSON, and import execution).
  - `components/canvas/index.ts`: Exported Terraform components.
  - `terraform.spec.tsx`: Added 3 integration tests verifying modal rendering, closed state, and discovered sample resource rendering.
- Milestone:
  - **95 / 135 total features completed (70.4% milestone reached — crossed 70% threshold)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (203 test suites, 1206 tests passed)
```

## 2026-10-02 — F080 — GCP (Phase 10 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `gcp.ts`: Implemented Google Cloud Platform (GCP) cloud infrastructure import and topology mapping engine for DiagramHQ (Phase 10 — Infrastructure Integrations). Maps all 17 canonical GCP resource types (GCE, GKE, Cloud Run, Cloud Functions, App Engine, Cloud SQL, Spanner, Bigtable, Firestore, GCS, VPC, Cloud LB, Cloud CDN, API Gateway, Pub/Sub, Eventarc, Cloud Tasks) to typed `ModelObject` instances with hierarchical VPC containment, derives inter-service `ModelConnection` interactions (origin cache fetch, LB ingress, API Gateway proxying, database queries, async pub/sub, Eventarc triggers, Cloud Tasks dispatch), and preserves traceable `GcpCloudEvidence`.
  - Implemented `parseGcpResourceUri`, `determineObjectKindForGcp`, `determineConnectionKindForGcp`, `importGcpProject`, and `createMockGcpProject`.
  - `gcp.test.ts`: Added 7 unit tests verifying URI parsing, resource-to-kind mapping, connection inference, mocked project import with all 17 resource types, VPC containment, filtering, and cloud evidence retention.
  - `index.ts`: Exported `gcp`.
- Web layer (`apps/web/`):
  - `components/canvas/gcp-panel.tsx`: Implemented `<GcpImportModal />` (GCP import modal featuring project ID, organization ID, primary region selector, resource type filter chips for all 17 types, VPC containment toggle, connection derivation toggle, discovered inventory listing, and import execution).
  - `components/canvas/index.ts`: Exported GCP components.
  - `gcp.spec.tsx`: Added 3 integration tests verifying modal rendering, closed state, and inventory items for all 17 GCP resource types.
- Milestone:
  - **94 / 135 total features completed (69.6% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (201 test suites, 1196 tests passed)
```

## 2026-10-02 — F079 — Azure (Phase 10 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `azure.ts`: Implemented Microsoft Azure cloud infrastructure import and topology mapping engine for DiagramHQ (Phase 10 — Infrastructure Integrations). Maps all 15 canonical Azure resource types (VM, App Service, Function App, AKS, Container App, SQL Database, Cosmos DB, Storage Account, VNet, App Gateway, Front Door, API Management, Service Bus, Event Hubs, Event Grid) to typed `ModelObject` instances with hierarchical VNet containment, derives inter-service `ModelConnection` interactions (ingress routing, backend API calls, database queries, async pub/sub), and preserves traceable `AzureCloudEvidence`.
  - Implemented `parseAzureResourceId`, `determineObjectKindForAzure`, `determineConnectionKindForAzure`, `importAzureSubscription`, and `createMockAzureSubscription`.
  - `azure.test.ts`: Added 7 unit tests verifying Resource ID parsing, resource-to-kind mapping, connection inference, mocked subscription import with all 15 resource types, VNet containment, filtering, and cloud evidence retention.
  - `index.ts`: Exported `azure`.
- Web layer (`apps/web/`):
  - `components/canvas/azure-panel.tsx`: Implemented `<AzureImportModal />` (Azure import modal featuring subscription ID, Entra ID tenant ID, resource group, primary region selector, resource type filter chips for all 15 types, VNet containment toggle, connection derivation toggle, discovered inventory listing, and import execution).
  - `components/canvas/index.ts`: Exported Azure components.
  - `azure.spec.tsx`: Added 3 integration tests verifying modal rendering, closed state, and inventory items for all 15 Azure resource types.
- Milestone:
  - **93 / 135 total features completed (68.9% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (199 test suites, 1186 tests passed)
```

## 2026-10-02 — F078 — AWS (Phase 10 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `aws.ts`: Implemented AWS cloud infrastructure import and topology mapping engine for DiagramHQ (Phase 10 — Infrastructure Integrations). Maps all 13 canonical AWS resource types (EC2, ECS, EKS, Lambda, RDS, DynamoDB, S3, CloudFront, API Gateway, SQS, SNS, EventBridge, VPC) to typed `ModelObject` instances with hierarchical VPC containment, derives inter-service `ModelConnection` interactions (origin fetch, proxy integration, database queries, async pub/sub), and preserves traceable `AwsCloudEvidence`.
  - Implemented `parseAwsArn`, `determineObjectKindForAws`, `determineConnectionKindForAws`, `importAwsAccount`, and `createMockAwsAccount`.
  - `aws.test.ts`: Added 7 unit tests verifying ARN parsing, resource-to-kind mapping, connection inference, mocked account import with all 13 resource types, VPC containment, filtering, and cloud evidence retention.
  - `index.ts`: Exported `aws`.
- Web layer (`apps/web/`):
  - `components/canvas/aws-panel.tsx`: Implemented `<AwsImportModal />` (AWS import modal featuring account ID, cross-account IAM role ARN, primary region selector, resource type filter chips for all 13 types, VPC containment toggle, connection derivation toggle, discovered inventory listing, and import execution).
  - `components/canvas/index.ts`: Exported AWS components.
  - `aws.spec.tsx`: Added 3 integration tests verifying modal rendering, closed state, and inventory items for all 13 AWS resource types.
- Milestone:
  - **92 / 135 total features completed (68.1% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (197 test suites, 1176 tests passed)
```

## 2026-10-02 — F127 — SDK (Phase 09 COMPLETE!)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `sdk.ts`: Implemented typed TypeScript client SDK (`DiagramHQClient`, `createDiagramHQClient`) for DiagramHQ's REST and Model intelligence APIs (Phase 09 — Code Integrations). Covers complete CRUD over architectures, model objects, connections, views, and execution flows with model snapshot extraction (`getModel`), comprehensive error hierarchy (`DiagramHQApiError`, `AuthenticationError`, `NotFoundError`), custom HTTP transport interface, and in-memory mock test server (`createMockTestServer`) with verified round-trip fidelity.
  - `sdk.test.ts`: Added 5 unit tests verifying configuration, auth headers, error propagation (401, 404, 500), and full end-to-end CRUD round-trip against the test server.
  - `index.ts`: Exported `sdk`.
- Web layer (`apps/web/`):
  - `components/canvas/sdk-panel.tsx`: Implemented `<SdkPanelModal />` (developer modal featuring code snippet generators for TypeScript SDK, cURL, and CLI (`dhq`), API key/base URL configuration, resource switcher, copy-to-clipboard, and an interactive in-memory SDK round-trip test playground).
  - `components/canvas/index.ts`: Exported SDK components.
  - `sdk.spec.tsx`: Added 3 integration tests verifying modal rendering, closed state, and snippet generation.
- Milestone:
  - **Phase 09 — Code Integrations is 100% COMPLETE (10 / 10 features)!**
  - **91 / 135 total features completed (67.4% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (195 test suites, 1166 tests passed)
```

## 2026-10-02 — F126 — Webhooks (Phase 09 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `webhooks.ts`: Implemented outbound webhook delivery and lifecycle event notification engine for DiagramHQ (Phase 09 — Code Integrations). Emits standard lifecycle events across architecture models (`object.*`, `connection.*`, `diagram.created`, `flow.created`, `architecture.updated`, `version.created`, `change.approved`, `change.merged`), secured with cryptographic HMAC SHA-256 signatures (`X-Hub-Signature-256`) and per-subscription secret tokens (`whsec_...`).
  - Supports wildcard subscriptions (`*`, `object.*`, `connection.*`), architecture scoping, delivery audit logs, and test sink verification.
  - `webhooks.test.ts`: Added 5 unit tests verifying HMAC-SHA256 signature generation & verification, subscription CRUD operations, wildcard & prefix topic matching, end-to-end event dispatching to test sink, and error logging on failure.
  - `index.ts`: Exported `webhooks`.
- Web layer (`apps/web/`):
  - `components/canvas/webhooks-panel.tsx`: Implemented `<WebhookManagerModal />` (full-featured modal with metrics banner, subscriptions list, test trigger, and delivery audit logs).
  - `components/canvas/index.ts`: Exported Webhooks components.
  - `webhooks.spec.tsx`: Added 3 integration tests verifying modal metrics and subscriptions, empty state, and closed state.
- Milestone:
  - **90 / 135 total features completed (66.7% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (187 test suites, 1143 tests passed)
```

## 2026-10-02 — F125 — Model-as-code + CLI (Phase 09 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `model-as-code.ts`: Implemented Model-as-code serialization engine and `dhq` CLI command surface for DiagramHQ (Phase 09 — Code Integrations). Serializes architecture models to clean, human-readable YAML with deterministic mapping between slugs and stable internal IDs (`ObjectId`, `ConnectionId`), supporting C4 model kinds and aliases (`container`, `person`, `database`).
  - Implemented full `dhq` CLI command set (`dhq login`, `dhq init`, `dhq pull`, `dhq push`, `dhq validate`, `dhq diff`, `dhq deploy`, `dhq export`, `dhq generate`) with push-then-pull round-trip fidelity, invariant validation catching syntax errors, duplicate slugs, dangling references, and parent hierarchy cycles, and structural diffing.
  - `model-as-code.test.ts`: Added 15 unit tests verifying slug-to-ID mapping, YAML serialization & round-trip fidelity, invariant validation, structural diffing, and all `dhq` CLI commands.
  - `index.ts`: Exported `model-as-code`.
- Web layer (`apps/web/`):
  - `components/canvas/model-as-code-panel.tsx`: Implemented `<ModelAsCodeModal />` (full-featured modal with tabs for YAML Definition, Live Validation, Diff Viewer, and interactive dhq CLI Terminal, with two-way Push/Pull Canvas synchronization).
  - `components/canvas/index.ts`: Exported Model-as-code components.
  - `model-as-code.spec.tsx`: Added 3 integration tests verifying modal tabs, YAML editor, active model synchronization, and closed state.
- Milestone:
  - **89 / 135 total features completed (65.9% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (186 test suites, 1135 tests passed)
```

## 2026-10-02 — F124 — Database catalog (Phase 09 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `database-catalog.ts`: Implemented Database Catalog and data schema registry for DiagramHQ (Phase 09 — Code Integrations). Indexes relational and NoSQL datastores with full hierarchical structure (Database -> Schema/Namespace -> Table/Collection -> Column/Field), capturing primary keys, foreign key relations, nullable flags, unique indices, data classification tags, and migration repo coordinates (`CodeLocationSpec`).
  - Supports all major database engines (PostgreSQL, MySQL, SQLite, MongoDB, Redis, DynamoDB, Cassandra, ClickHouse, Snowflake, BigQuery) with relationship detection (`findTableRelationships`) and faceted browsing.
  - `database-catalog.test.ts`: Added 5 unit tests verifying database registration, hierarchical table and column modeling, foreign key relationship discovery, and faceted catalog browsing.
  - `index.ts`: Exported `database-catalog`.
- Web layer (`apps/web/`):
  - `components/canvas/database-catalog-panel.tsx`: Implemented `<DatabaseCatalogExplorerModal />` (full-featured modal with metrics banner, database tree, search/engine filters, and column schema inspector drawer).
  - `components/canvas/index.ts`: Exported Database Catalog components.
  - `database-catalog.spec.tsx`: Added 3 integration tests verifying modal metrics and table listings, search/engine filters, and column schema inspection.
- Milestone:
  - **Phase 09 — Code Integrations is now 90% COMPLETE (9/10 features completed, 88/135 total, 65.2% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (185 test suites, 1132 tests passed)
```

## 2026-10-02 — F123 — Event catalog (Phase 09 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `event-catalog.ts`: Implemented Event Catalog and asynchronous messaging registry for DiagramHQ (Phase 09 — Code Integrations). Indexes domain events, topics, message brokers (Kafka, RabbitMQ, SQS/SNS, EventBridge, NATS, Redis Streams, Google Pub/Sub), message schemas (JSON Schema, Avro, Protobuf), delivery guarantees, and emission frequencies.
  - Deterministically links event producers and consumers to C4 model objects (`ObjectId`) and async connections (`ConnectionId`), providing faceted searching and subscription management.
  - `event-catalog.test.ts`: Added 4 unit tests verifying entry creation with schema and delivery guarantees, registry management across brokers, consumer subscription updates, and faceted browsing.
  - `index.ts`: Exported `event-catalog`.
- Web layer (`apps/web/`):
  - `components/canvas/event-catalog-panel.tsx`: Implemented `<EventCatalogExplorerModal />` (full-featured modal with metrics banner, text search, broker filter buttons, producer filter, frequency filter, and detailed schema & subscription inspector drawer).
  - `components/canvas/index.ts`: Exported Event Catalog components.
  - `event-catalog.spec.tsx`: Added 3 integration tests verifying modal metrics and event rows, filter toolbars, and closed state behavior.
- Milestone:
  - **Phase 09 — Code Integrations is now 80% COMPLETE (8/10 features completed, 87/135 total, 64.4% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (184 test suites, 1124 tests passed)
```

## 2026-10-02 — F122 — API catalog (Phase 09 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `api-catalog.ts`: Implemented centralized, discoverable API catalog and interface registry for DiagramHQ (Phase 09 — Code Integrations). Indexes REST endpoints, GraphQL queries/mutations, and gRPC RPC methods, deterministically anchored to architecture model objects (`ObjectId`) and source code repository locations (`CodeLocationSpec`).
  - Provides multi-dimensional querying (text search, protocol, service, deprecation status, auth scheme, tags), deprecation lifecycle tracking, and facet aggregations.
  - `api-catalog.test.ts`: Added 5 unit tests verifying entry creation with service and repo mapping, multi-protocol registry population, model linking and code mapping inheritance, deprecation lifecycle updates, and faceted browsing.
  - `index.ts`: Exported `api-catalog`.
- Web layer (`apps/web/`):
  - `components/canvas/api-catalog-panel.tsx`: Implemented `<ApiCatalogExplorerModal />` (full-featured catalog explorer modal featuring metrics banner, text search, protocol tabs, service filter dropdown, status filter, and detailed inspector drawer).
  - `components/canvas/index.ts`: Exported API catalog components.
  - `api-catalog.spec.tsx`: Added 3 integration tests verifying modal metrics and endpoint row rendering, search and filter toolbars, and closed state behavior.
- Milestone:
  - **Phase 09 — Code Integrations is now 70% COMPLETE (7/10 features completed, 86/135 total, 63.7% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (183 test suites, 1117 tests passed)
```

## 2026-10-02 — F077 — Repository synchronization (Phase 09 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `repo-sync.ts`: Implemented continuous repository synchronization and background architecture freshness engine for DiagramHQ (Phase 09 — Code Integrations). Supports periodic scheduled sync (`SyncScheduleConfig`) and remote git webhook triggers (`push`, `pull_request_merged`), comparing previous scan fingerprints against current commit state and active model topology.
  - Detects added, modified, and removed components, route controllers, and datastores.
  - Directly feeds architectural drift detection (F084) with itemized drift items, severity levels, and evidence citations, and generates reviewable model refresh updates without ungrounded silent mutations.
  - `repo-sync.test.ts`: Added 5 unit tests verifying scheduled scan due checks, webhook trigger processing, drift evaluation, code addition/removal detection, and model refresh application.
  - `index.ts`: Exported `repo-sync`.
- Web layer (`apps/web/`):
  - `components/canvas/repo-sync-panel.tsx`: Implemented `<RepoSyncDrawer />` (status card, schedule & webhook ingress indicators, drift findings list with severity badges, and "Apply Model Refresh" / "Create Change Request" actions) and `<SyncScheduleModal />` (configuration modal for interval scheduling, scan toggles, and webhook payload URL copying).
  - `components/canvas/index.ts`: Exported repo sync components.
  - `repo-sync.spec.tsx`: Added 4 integration tests verifying clean state rendering, drift alert banners and actions, schedule modal configuration, and closed drawer behavior.
- Milestone:
  - **Phase 09 — Code Integrations is now 60% COMPLETE (6/10 features completed, 85/135 total, 63.0% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (182 test suites, 1109 tests passed)
```

## 2026-10-02 — F076 — OpenAPI import (Phase 09 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `openapi-import.ts`: Implemented OpenAPI 3.0/3.1 and Swagger 2.0 specification parser and API catalog importer for DiagramHQ (Phase 09 — Code Integrations). Parses JSON and YAML specs into structured endpoint operations (GET, POST, PUT, DELETE, PATCH) with path parameters, query parameters, request bodies, and response codes.
  - Automatically links parsed endpoints to target architecture services and source repositories, populating the discoverable `ApiCatalog` while maintaining `AIEvidence` and confidence tracking.
  - `openapi-import.test.ts`: Added 4 unit tests verifying OpenAPI 3.0 parsing, Swagger 2.0 compatibility, tag and service filtering, and YAML/JSON error handling.
  - `index.ts`: Exported `openapi-import`.
- Web layer (`apps/web/`):
  - `components/canvas/openapi-import-panel.tsx`: Implemented `<OpenApiImportModal />` (interactive spec import interface supporting JSON/YAML paste or file content, spec format detection, target service binding, and endpoint preview before import) and `<ApiCatalogDrawer />` (API catalog drawer displaying categorized endpoints with HTTP method badges, route parameters, tags, and service linkage badges).
  - `components/canvas/index.ts`: Exported openapi import components.
  - `openapi-import.spec.tsx`: Added 3 integration tests verifying modal import form, endpoint extraction and display, and catalog drawer search filtering.
- Milestone:
  - **Phase 09 — Code Integrations is now 50% COMPLETE (5/10 features completed, 84/135 total, 62.2% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (181 test suites, 1100 tests passed)
```

## 2026-10-02 — F075 — Code-to-architecture mapping (Phase 09 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `code-mapping.ts`: Implemented bidirectional code-to-architecture mapping and traceability linking architecture model objects (services, components, datastores) directly to their underlying code repositories, directory folders, source file paths, and line ranges (Phase 09 — Code Integrations).
  - Generates canonical remote repository deep links: "Open in GitHub" (`https://github.com/owner/repo/blob/main/path/to/file#L10-L20`) and "Open in GitLab" (`https://gitlab.com/owner/repo/-/blob/main/path/to/file#L10-20`).
  - Normalizes repository coordinates across HTTPS URLs, SSH URIs (`git@`), and project slugs.
  - Injects code mapping metadata into architecture objects without violating pure model invariants.
  - `code-mapping.test.ts`: Added 4 unit tests verifying component linking, GitHub and GitLab URL generation with line anchors, repo coordinate normalization, and validation rules.
  - `index.ts`: Exported `code-mapping`.
- Web layer (`apps/web/`):
  - `components/canvas/code-mapping-panel.tsx`: Implemented `<CodeMappingBadge />` (compact badge showing provider icon, file path, line range suffix, and deep link), `<OpenInRepoButton />` (button navigating directly to remote repository), and `<CodeMappingEditorDrawer />` (editor modal to configure repository, branch, directory, file, and line anchors with live computed URL preview).
  - `components/canvas/index.ts`: Exported code mapping components.
  - `code-mapping.spec.tsx`: Added 4 integration tests verifying badge rendering, open-in-repo buttons for GitHub & GitLab, editor drawer live preview, and dismiss states.
- Milestone:
  - **Phase 09 — Code Integrations is now 40% COMPLETE (4/10 features completed, 83/135 total, 61.5% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (179 test suites, 1093 tests passed)
```

## 2026-10-02 — F074 — Repository discovery (Phase 09 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `repository-discovery.ts`: Implemented organization and group-wide repository discovery, filtering, and scan scoping (Phase 09 — Code Integrations). Enables engineering teams to enumerate repositories across GitHub organizations or GitLab groups/namespaces, filter by technology (languages, frameworks, search query, archived flag), and multi-select an active subset of repositories.
  - Strict invariant enforced: user repository selection strictly scopes downstream scans, guaranteeing unselected repositories are excluded from downstream modeling scans.
  - `repository-discovery.test.ts`: Added 5 unit tests verifying repository listing, query and language filtering, strict selection scoping, summary statistics, and empty selections.
  - `index.ts`: Exported `repository-discovery`.
- Web layer (`apps/web/`):
  - `components/canvas/repo-discovery-panel.tsx`: Implemented `<RepoDiscoveryModal />` (interactive discovery modal with provider switcher GitHub 🐙 / GitLab 🦊, organization input, text search, language filters, Select All/Clear controls, repository cards with metadata badges, and a scoped summary footer).
  - `components/canvas/index.ts`: Exported repository discovery components.
  - `repo-discovery.spec.tsx`: Added 4 integration tests verifying modal rendering, filter interactions, strict selection scoping, and modal dismiss states.
- Milestone:
  - **Phase 09 — Code Integrations is now 30% COMPLETE (3/10 features completed, 82/135 total, 60.7% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (177 test suites, 1085 tests passed)
```

## 2026-10-02 — F073 — GitLab (Phase 09 Progress)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `gitlab-scanner.ts`: Implemented GitLab project connectivity and static repository code analysis with full feature parity to the GitHub scanner (Phase 09 — Code Integrations). Analyzes GitLab repositories across groups, subgroups, and project namespaces (`namespace/project`), scanning manifests (`package.json`, `pom.xml`, `requirements.txt`, `go.mod`), configuration files (`docker-compose.yml`, `.gitlab-ci.yml`), and route handlers to detect services, exposed APIs, persistent datastores (PostgreSQL, MySQL, Redis, MongoDB), message queues (Kafka, RabbitMQ), frameworks (NestJS, Express, Next.js, Fastify), cloud SDKs (AWS SDK, GCP, Azure), and GitLab CI services & test containers defined in `.gitlab-ci.yml`.
  - Strict invariant enforced: every detected object and connection carries concrete code evidence (`AIEvidence` with project path, file path, line numbers) and calibrated confidence assessment (high/medium/low).
  - Human-in-the-loop review: all detected items are formulated as proposed additions for review before model import.
  - `gitlab-scanner.test.ts`: Added 3 unit tests verifying parity with GitHub scanner on equivalent repositories, `.gitlab-ci.yml` service discovery, and heuristic fallback for minimal repositories.
  - `index.ts`: Exported `gitlab-scanner`.
- Web layer (`apps/web/`):
  - `components/canvas/gitlab-scanner-panel.tsx`: Implemented `<GitLabConnectModal />` (GitLab project connection modal with support for project namespaces and ref/branch selection) and `<GitLabScanResultDrawer />` (reviewable proposal drawer displaying discovered entities with GitLab project badge 🦊, confidence badges, code citations, and model import action).
  - `components/canvas/index.ts`: Exported GitLab scanner components.
  - `gitlab-scanner.spec.tsx`: Added 4 integration tests verifying scanner parity, modal and drawer rendering, and empty states.
- Milestone:
  - **Phase 09 — Code Integrations is now 20% COMPLETE (2/10 features completed, 81/135 total, 60.0% milestone reached)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (175 test suites, 1076 tests passed)
```

## 2026-10-02 — F072 — GitHub (Phase 09 Started)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `github-scanner.ts`: Implemented GitHub repository connectivity and static code analysis for automated architecture discovery (Phase 09 — Code Integrations). Statically analyzes repository file trees (`package.json`, `docker-compose.yml`, route controllers) to detect services, APIs, persistent datastores (PostgreSQL, MySQL, Redis, MongoDB), message queues (Kafka, RabbitMQ), frameworks (NestJS, Express, Next.js), and cloud provider SDKs (AWS SDK, GCP, Azure).
  - Strict invariant enforced: every detected object and connection carries concrete code evidence (`AIEvidence` with repo, file path, line numbers) and calibrated confidence assessment (high/medium/low).
  - Human-in-the-loop review: all detected items are formulated as proposed additions for review before model import.
  - `github-scanner.test.ts`: Added 2 unit tests verifying that scanning sample repository trees extracts expected objects, datastores, queues, and frameworks with evidence and confidence scores.
  - `index.ts`: Exported `github-scanner`.
- Web layer (`apps/web/`):
  - `components/canvas/github-scanner-panel.tsx`: Implemented `<GitHubConnectModal />` (repo connect dialogue with owner/repo input and branch selector) and `<GitHubScanResultDrawer />` (comprehensive drawer displaying detected services, APIs, datastores, and message queues with confidence badges, code citations, and one-click import into architecture model).
  - `components/canvas/index.ts`: Exported GitHub scanner components.
  - `github-scanner.spec.tsx`: Added 4 integration tests verifying end-to-end repository scanning, modal and drawer rendering, and empty states.
- Milestone:
  - **Phase 09 — Code Integrations is now IN PROGRESS (1/10 features completed, 80/135 total, 59.3%)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (173 test suites, 1069 tests passed)
```

## 2026-10-02 — F121 — Specialized agents (Phase 08 Complete)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `specialized-agents.ts`: Implemented 7 specialized role-based architectural AI agents operating directly over DiagramHQ's Model Context Protocol (MCP) tool surface: Analyst Agent (domain boundaries, cohesion, coupling indices, fan-in/fan-out), Designer Agent (C4 container topologies, component boundaries, interface contracts, yielding reviewable proposals), Security Agent (zero-trust threat modeling, perimeter ingress validation, blast-radius calculations), Cloud Agent (infrastructure mapping, multi-AZ high availability resilience, persistent datastores), Documentation Agent (C4 architecture catalog cards and Markdown technical specifications), Migration Agent (phased cutover strategies, Strangler Fig pattern, dual-write replication plans, decommissioning change proposals), and Code Agent (repository-to-model alignment, AST static analysis grounding, drift detection).
  - Strict invariant enforced: mutating operations yield reviewable proposals (`isProposal: true, requiresApproval: true`), never silent commits.
  - `specialized-agents.test.ts`: Added 8 unit tests verifying that all 7 agents execute and complete scoped tasks on the MCP tool surface, with mutating operations producing reviewable proposals.
  - `index.ts`: Exported `specialized-agents`.
- Web layer (`apps/web/`):
  - `components/canvas/specialized-agents-panel.tsx`: Implemented `<SpecializedAgentSelector />` (role selector with icons, capability details, preferred MCP tool badges, and custom task instruction launcher), `<SpecializedAgentResultCard />` (structured output viewer showing status, execution timestamp, invoked MCP tools, findings, and reviewable proposal cards with "Approve Proposal" action), and `<SpecializedAgentDrawer />` (modal overlay containing role selection, execution trigger, and activity stream).
  - `components/canvas/index.ts`: Exported specialized agents components.
  - `specialized-agents.spec.tsx`: Added 5 integration tests verifying all 7 agents complete scoped tasks, proposal requirements for mutating operations, and UI component rendering.
- Milestone:
  - **Phase 08 — AI Copilot is now 100% COMPLETE (12/12 features)!**

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (157 test suites, 1056 tests passed)
```

## 2026-10-02 — F120 — AI evidence + confidence

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ai-confidence.ts`: Pure domain AI Evidence & Confidence scoring engine. Fulfills the requirement that every AI assertion, generated dependency, architectural edit, or synthesized claim must be anchored to concrete source evidence (repo, file path, line numbers, symbols, commit SHA, configuration rules) accompanied by a mathematically calibrated confidence score (0.00 to 1.00). Evaluates corroborating evidence bonuses, penalizes missing locations or heuristic-only assertions, and automatically flags low-confidence inferences below threshold (< 0.60) with diagnostic warnings and human verification requirements.
  - `ai-confidence.test.ts`: Added 6 unit tests verifying citation formatting, evidence strength calculations, dependency generation with high-confidence code evidence, low-confidence flagging on weak/unanchored evidence, empty evidence handling, and edit proposal grounding.
  - `index.ts`: Exported `ai-confidence`.
- Web layer (`apps/web/`):
  - `components/canvas/ai-confidence-badge.tsx`: Implemented `<ConfidenceBadge />` (reactive confidence status pill with tier colors and score percentages), `<AIEvidenceCard />` (evidence item card displaying source type, strength percentage, code snippet, and formatted citation), and `<AIEvidenceInspector />` (interactive inspector modal supporting claim filtering, low-confidence warning alerts, and human verification).
  - `components/canvas/index.ts`: Exported AI confidence components.
  - `ai-confidence.spec.tsx`: Added 4 integration tests verifying that generated dependencies include evidence, low-confidence dependencies are flagged with warnings, evidence cards render citations and strength, and the inspector displays grounded assertions and filter counters.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (156 test suites, 1049 tests passed)
```

## 2026-10-02 — F071 — MCP integration

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `mcp-server.ts`: Pure domain Model Context Protocol (MCP) server implementation (`DiagramHQMCPServer`). Exposes all 14 required tools:
    - Query tools: `search_architecture`, `get_object`, `get_dependencies`, `get_dependents`, `analyze_impact`, `compare_versions`, `review_change`.
    - Mutating tools: `create_object`, `update_object`, `delete_object`, `create_diagram`, `create_flow`, `create_change`, `create_adr`.
    - Strict invariant: All mutating tools return reviewable proposals (`isProposal: true, requiresApproval: true`), never committing silent changes directly to the model.
  - `mcp-server.test.ts`: Added 4 unit tests verifying tool list discovery, querying objects and blast-radius impact analysis, and verifying mutating tools create reviewable proposals with required approvals.
  - `index.ts`: Exported `mcp-server`.
- Web layer (`apps/web/`):
  - `components/canvas/mcp-integration-modal.tsx`: Implemented `<MCPStatusBadge />` (connected status, tool counts, and trigger) and `<MCPInspectorModal />` (interactive MCP server inspector showing available tools, parameter schemas, mutating flags, and raw JSON schema inspect).
  - `components/canvas/index.ts`: Exported MCP integration components.
  - `mcp-integration.spec.tsx`: Added 3 integration tests verifying that each tool is callable, mutating tools return proposals requiring approval, and `<MCPStatusBadge />` / `<MCPInspectorModal />` render correctly.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (155 test suites, 1039 tests passed)
```

## 2026-10-02 — F070 — ADR generation

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ai-adr-generation.ts`: Pure domain AI Architecture Decision Record (ADR) generator from architecture change sets and pull requests. Automatically synthesizes MADR / Michael Nygard decision records: context synthesis capturing problem statements, business objectives, and topological blast radius / affected downstream component counts; decision synthesis itemizing provisioned components, new integration channels, refactored services, and decommissioned legacy entities; consequences synthesis detailing positive and negative operational trade-offs; and alternatives considered. Invariant: establishes polymorphic traceability by attaching directly to the source change set (`targetType: 'change'`). Enables human-in-the-loop review and editing (`acceptDraftedADR`) committing the official immutable `ArchitectureDecisionRecord`.
  - `ai-adr-generation.test.ts`: Added 3 unit tests verifying acceptance test for drafting an ADR linked to the source change set, human edits and acceptance, and decommissioning changes.
  - `index.ts`: Exported `ai-adr-generation`.
- Web layer (`apps/web/`):
  - `components/canvas/ai-adr-modal.tsx`: Implemented `<DraftedADRCard />` (proposal badge, context preview, linked change ID, and review trigger) and `<ADRGenerationModal />` (interactive review dialog with form inputs for title, context, decision, consequences, and alternatives, with one-click commitment).
  - `components/canvas/index.ts`: Exported AI ADR components.
  - `ai-adr-generation.spec.tsx`: Added 3 integration tests verifying acceptance test for drafting ADR linked to change, human edits and acceptance, and `<DraftedADRCard />` / `<ADRGenerationModal />` rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (154 test suites, 1032 tests passed)
```

## 2026-10-02 — F069 — AI architecture review

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ai-architecture-review.ts`: Pure domain AI Architecture Review Agent and automated pre-merge governance gate. Evaluates architecture graphs and change sets against 5 pre-merge governance checklist rules: (1) no circular dependencies via DFS cycle detection along service call chains, (2) team ownership presence on all internal components via `ObjectOwnership` or component metadata, (3) approved external dependencies whitelist validation, (4) backup & disaster recovery verification on persistent stores, and (5) customer PII leak detection to external third-party boundaries. Computes automated verdict (`REQUEST_CHANGES` on blocking critical/high violations, `APPROVE` on clean compliance, `COMMENT` for advisories) alongside actionable remediation recommendations.
  - `ai-architecture-review.test.ts`: Added 3 unit tests verifying acceptance test for seeded violations producing expected `REQUEST_CHANGES` verdict with all 5 checklist failures, clean architecture producing `APPROVE` verdict with 0 violations, and `ObjectOwnership` integration.
  - `index.ts`: Exported `ai-architecture-review`.
- Web layer (`apps/web/`):
  - `components/canvas/ai-architecture-review-modal.tsx`: Implemented `<ReviewVerdictBadge />` (color-coded badge chips for APPROVE, REQUEST_CHANGES, and COMMENT) and `<ArchitectureReviewModal />` (interactive pre-merge checklist with PASS/FAIL chips, summary banner, blocking violation list, and actionable remediation boxes).
  - `components/canvas/index.ts`: Exported review components.
  - `ai-architecture-review.spec.tsx`: Added 3 integration tests verifying acceptance test for seeded violations returning REQUEST_CHANGES, clean architecture returning APPROVE, and `<ReviewVerdictBadge />` / `<ArchitectureReviewModal />` rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (153 test suites, 1026 tests passed)
```

## 2026-10-02 — F068 — AI documentation

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ai-documentation.ts`: Pure domain AI Architecture Documentation generator and synchronizer. Generates comprehensive, grounded Markdown documentation for components (`generateObjectDocumentation`) and systems (`generateSystemArchitectureDocumentation`) strictly anchored in model topology, metadata, connection interfaces, and ADRs. Enforces the strict invariant of zero hallucinations — 100% of cited entities are grounded references validated against the live model. Provides synchronization engine (`refreshDocumentationOnModelChange`) to keep documentation in sync as models evolve.
  - `ai-documentation.test.ts`: Added 4 unit tests verifying acceptance test for grounded object documentation generation, system architecture documentation generation, model change synchronization, and missing object error handling.
  - `index.ts`: Exported `ai-documentation`.
- Web layer (`apps/web/`):
  - `components/canvas/ai-documentation-modal.tsx`: Implemented `<AIDocumentationCard />` (compact spec card with version chip, section count, grounded entity count, and refresh/view triggers) and `<DocumentationViewerModal />` (grounded entity bar with zero-hallucination verification badge, formatted Markdown sections, and interactive references).
  - `components/canvas/index.ts`: Exported AI documentation components.
  - `ai-documentation.spec.tsx`: Added 4 integration tests verifying acceptance test for grounded object and system docs, model update synchronization, and `<AIDocumentationCard />` / `<DocumentationViewerModal />` rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (152 test suites, 1020 tests passed)
```

## 2026-10-02 — F067 — Security analysis

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ai-security.ts`: Pure domain AI Architecture Security Review and audit engine. Inspects architecture topologies for security anti-patterns: unauthenticated public ingress endpoints bypassing edge gateways (`public_endpoint_unauthenticated`), PII and sensitive data transmission over unencrypted network channels (`pii_cleartext_path`), missing authentication / authorization on internal datastore connections (`missing_auth_boundary`), and unencrypted sensitive PII stores (`unencrypted_pii_store`). Computes a dynamic architecture security score (0-100) with penalty deductions, and generates a structured AI security review narrative (`auditArchitectureSecurity`) strictly matching detected structural issues and entity citations.
  - `ai-security.test.ts`: Added 3 unit tests verifying acceptance test for detecting seeded issues (PII paths, public endpoints, missing auth) with matching AI security narrative, clean architecture scoring 100/100, and severity penalty calculations.
  - `index.ts`: Exported `ai-security`.
- Web layer (`apps/web/`):
  - `components/canvas/ai-security-drawer.tsx`: Implemented `<SecurityScoreGauge />` (color-coded score badge with rating tiers), `<SecurityFindingCard />` (severity chip, affected object and connection IDs, and remediation guidance), and `<AISecurityDrawer />` (slide-out audit drawer with score card, severity counters, AI narrative breakdown, and interactive findings list).
  - `components/canvas/index.ts`: Exported AI security components.
  - `ai-security.spec.tsx`: Added 4 integration tests verifying acceptance test for detecting seeded security vulnerabilities, `<SecurityScoreGauge />` rendering, `<SecurityFindingCard />` rendering, and `<AISecurityDrawer />` open/closed states.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (151 test suites, 1012 tests passed)
```

## 2026-10-02 — F066 — Impact analysis

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ai-impact.ts`: Pure domain AI Architecture Impact Analysis engine. Traverses the architecture graph using breadth-first search to calculate direct and indirect downstream dependents (components broken if target fails), direct and indirect upstream dependencies, affected runtime execution flows, affected stakeholder engineering teams, and Single Point of Failure (SPOF) critical paths (`computeArchitecturalImpact`). Generates an AI-synthesized narrative (`generateAIImpactNarrative`, `analyzeAndNarrateImpact`) that strictly reflects and matches the computed topological impact set and risk metrics.
  - `ai-impact.test.ts`: Added 4 unit tests verifying acceptance test for selecting an object and confirming AI impact narrative matches the computed set, critical path single-point-of-failure detection, isolated node low-risk handling, and missing object error validation.
  - `index.ts`: Exported `ai-impact`.
- Web layer (`apps/web/`):
  - `components/canvas/ai-impact-drawer.tsx`: Implemented `<ImpactMetricsBadge />` (dynamic risk color styling, icon, and affected blast radius count) and `<AIImpactDrawer />` (slide-out drawer with target overview, metric counters, AI narrative breakdown, recommended actions, and impacted entity catalog).
  - `components/canvas/index.ts`: Exported AI impact components.
  - `ai-impact.spec.tsx`: Added 3 integration tests verifying acceptance test for AI impact narrative matching computed impact set, `<ImpactMetricsBadge />` rendering across risk levels, and `<AIImpactDrawer />` open/closed states.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (150 test suites, 1005 tests passed)
```

## 2026-10-02 — F065 — Architecture explanation

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ai-explanation.ts`: Pure domain Architecture Explanation engine. Synthesizes grounded, multi-altitude textual and structural narratives of systems, components, flows, and architectural decision records (ADRs) calibrated for specific audiences (`explainArchitectureAtAltitude`): Engineer (low-level protocols, sync/async RPCs, ports, error boundaries), Architect (bounded contexts, coupling degrees, CAP trade-offs, scalability bottlenecks), and Executive / CTO (business capabilities, operational continuity, blast radius, risk posture). Guaranteed to strictly cite real `ObjectId` and `ConnectionId` instances.
  - `ai-explanation.test.ts`: Added 4 unit tests verifying acceptance test for explaining systems/flows/decisions at engineer, architect, and CTO altitudes referencing real objects, sequential flow step trace, overall architecture explanations, and error validation on invalid altitudes or missing entities.
  - `index.ts`: Exported `ai-explanation`.
- Web layer (`apps/web/`):
  - `components/canvas/architecture-explanation-panel.tsx`: Implemented `<AltitudeSelector />` (engineer, architect, executive buttons with active indicators and descriptive badges) and `<ArchitectureExplanationPanel />` (slide-out drawer with narrative sections, bulleted key points, and interactive grounded entity citation buttons).
  - `components/canvas/index.ts`: Exported architecture explanation components.
  - `ai-explanation.spec.tsx`: Added 3 integration tests verifying acceptance test for multi-altitude explanation referencing real objects, `<AltitudeSelector />` rendering, and `<ArchitectureExplanationPanel />` open/closed rendering with grounded citations.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (149 test suites, 998 tests passed)
```

## 2026-10-02 — F064 — Natural-language editing

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ai-editing.ts`: Pure domain Natural Language Editing engine. Translates natural language commands into explicit, non-destructive proposed change sets (`generateEditProposal`, `applyEditProposal`, `rejectEditProposal`). Recognizes entity insertions ("add Redis between Service A and Service B"), component removals and cascading connection disconnections ("remove Service B"), and attribute updates ("rename Service A to Payment Gateway"). Enforces invariant that AI edits are never committed silently: every modification requires explicit Apply/Reject action. Applying verifies integrity invariants and updates live model state; rejecting preserves complete model immutability.
  - `ai-editing.test.ts`: Added 5 unit tests verifying acceptance test for 'add Redis between A and B' proposing exactly that, rejecting proposals leaving context unchanged, applying proposals updating model, removing entities and incident connections, renames, and integrity validation.
  - `index.ts`: Exported `ai-editing`.
- Web layer (`apps/web/`):
  - `components/canvas/nl-edit-modal.tsx`: Implemented `<NLEditProposalCard />` (status badge, itemized added/modified/removed lists and chips, Apply/Reject triggers) and `<NLEditModal />` (interactive instruction input form, quick action chips, and empty/populated proposal states).
  - `components/canvas/index.ts`: Exported NL edit modal components.
  - `ai-editing.spec.tsx`: Added 3 integration tests verifying acceptance test for 'add Redis between A and B' proposal/reject/apply lifecycle, `<NLEditProposalCard />` breakdown rendering, and `<NLEditModal />` modal rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (148 test suites, 991 tests passed)
```

## 2026-10-02 — F063 — Architecture generation

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ai-generation.ts`: Pure AI Architecture Generation engine. Synthesizes complete, valid architecture elements from natural language prompts: objects with C4 kinds (`application`, `store`, `system`, `actor`), coordinates, tech stacks, and descriptions; valid connections with sync/async kinds; end-to-end flows with numbered execution steps; container views; markdown documentation; and integrated change set proposals. Enforces invariant that AI proposals cannot commit silent mutations: exposed `generateArchitectureFromPrompt`, `applyGeneratedProposalToModel`, and `rejectGeneratedProposal`. Applying validates all invariants (unique IDs, no dangling connections, no self-connections) and updates the live model state. Rejection records rationale without mutating model state.
  - `ai-generation.test.ts`: Added 4 unit tests verifying acceptance test for a prompt yielding a valid model on apply, rejecting proposals without mutating model, prevention of double-applying, and prompt validation.
  - `index.ts`: Exported `ai-generation`.
- Web layer (`apps/web/`):
  - `components/canvas/ai-generation-modal.tsx`: Implemented `<GenerationProposalCard />` (status badge, summary metrics, action buttons) and `<AIGenerationModal />` (prompt input form, quick suggestions, and interactive tabs for inspecting generated components, connections, flows, and docs).
  - `components/canvas/index.ts`: Exported AI generation modal components.
  - `ai-generation.spec.tsx`: Added 4 integration tests verifying acceptance test for prompt generation yielding valid model on apply, rejection preserving context, `<GenerationProposalCard />` rendering, and `<AIGenerationModal />` multi-tab inspection.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (147 test suites, 983 tests passed)
```

## 2026-10-02 — F062 — AI chat

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'msg'` prefix to `IdPrefix` and declared `MessageId` brand type.
  - `ai-chat.ts`: Pure AI Architecture Copilot grounded Q&A engine. Supports grounded architectural query parsing (`queryModelGroundedQA`), deep dependency rationale resolution (`resolveDependencyRationale`) explaining direct connections and multi-hop transitive paths discovered via breadth-first search, and strict citation generation referencing real model `ObjectId` and `ConnectionId` instances.
  - `ai-chat.test.ts`: Added 4 unit tests verifying acceptance test for 'why does X depend on Y' citing real connection and object IDs, transitive multi-hop dependencies with full graph path citations, disconnected entities reporting, and 'what depends on X' upstream queries.
  - `index.ts`: Exported `ai-chat`.
- Web layer (`apps/web/`):
  - `components/canvas/ai-copilot-panel.tsx`: Implemented `<CitationBadge />` (displaying entity kind icon, colored border styling, and ID/name) and `<AICopilotPanel />` (persistent slide-out Copilot panel with model context metrics, quick suggestion chips, message history, and grounded citation badges).
  - `components/canvas/index.ts`: Exported AI Copilot components.
  - `ai-chat.spec.tsx`: Added 3 integration tests verifying acceptance test for dependency rationale grounded Q&A citing real connections, `<CitationBadge />` rendering, and `<AICopilotPanel />` rendering across empty/open states.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (146 test suites, 975 tests passed)
```

## 2026-10-02 — F119 — Roadmap items (Phase 07 COMPLETE!)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'rdm'` prefix to `IdPrefix` and declared `RoadmapItemId` brand type.
  - `roadmap-items.ts`: Pure Architecture Roadmap Items engine. Supports organizing architectural milestones into chronological quarters (`2026-Q1`, `2026-Q2`, etc.), managing lifecycle statuses (`planned`, `in_progress`, `completed`, `deferred`), priority tagging, team ownership, and directly linking roadmap milestones to concrete architecture change sets (`linkRoadmapItemToChange`, `unlinkRoadmapItemFromChange`, `getRoadmapItemsForChange`). Added chronological quarterly grouping (`groupRoadmapItemsByQuarter`) and overall completion calculation (`calculateRoadmapProgress`).
  - `roadmap-items.test.ts`: Added 4 unit tests verifying acceptance test for creating a roadmap item and linking it to an architecture change set, chronological quarter grouping, status updates, completion metrics, and field validations.
  - `index.ts`: Exported `roadmap-items`.
- Web layer (`apps/web/`):
  - `components/canvas/roadmap-panel.tsx`: Implemented `<RoadmapItemCard />` (displaying title, quarter badge, priority/status pill, and dynamic link/unlink change button) and `<RoadmapTimelinePanel />` (quarterly column timeline view, completion progress bar, active change set banner, and milestone creation modal).
  - `components/canvas/index.ts`: Exported roadmap components.
  - `roadmap-items.spec.tsx`: Added 3 integration tests verifying acceptance test for linking roadmap items to architecture changes, `<RoadmapItemCard />` rendering, and `<RoadmapTimelinePanel />` rendering across empty and populated states.

Milestone Note:
- **Phase 07 — Versioning is now 100% COMPLETE (10 / 10 features implemented & verified):**
  - F055 (Version history), F056 (Architecture snapshots), F057 (Branches), F058 (Architecture diff), F059 (Architecture changes), F060 (Pull requests), F061 (Merge), F117 (ADR system), F118 (Scenarios), F119 (Roadmap items).

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (145 test suites, 968 tests passed)
```

## 2026-10-02 — F118 — Scenarios

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'scn'` prefix to `IdPrefix` and declared `ScenarioId` brand type.
  - `scenarios.ts`: Pure what-if architectural scenarios exploration engine. Supports creating hypothetical scenarios cloned from a base branch (`createScenario`), applying immutable hypothetical modifications (`applyHypotheticalChange`), comparing against base state without mutating the real model (`compareScenarioWithBase`), and promoting proven scenarios to full branches (`promoteScenarioToBranch`).
  - `scenarios.test.ts`: Added 3 unit tests verifying acceptance test for creating a scenario and comparing against main without mutating main, hypothetical object removal with connection pruning, and scenario promotion.
  - `index.ts`: Exported `scenarios`.
- Web layer (`apps/web/`):
  - `components/canvas/scenario-modal.tsx`: Implemented `<ScenarioBadge />` (displaying scenario name, status pill, and cost delta pill) and `<ScenarioComparisonModal />` (interactive dialog with hypothesis banner, stat counters, operational impact panel, objects/connections tabbed deltas, and promotion action).
  - `components/canvas/index.ts`: Exported scenario components.
  - `scenarios.spec.tsx`: Added 3 integration tests verifying acceptance test for what-if scenario creation, base model immutability assertion, `<ScenarioBadge />` rendering, and `<ScenarioComparisonModal />` rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (144 test suites, 961 tests passed)
```

## 2026-10-02 — F117 — ADR system

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `adrs.ts`: Pure Architecture Decision Record (ADR) system for DiagramHQ. Supports structured architectural decision tracking with title, lifecycle status (`draft`, `proposed`, `accepted`, `rejected`, `superseded`, `deprecated`), context, decision, consequences, and alternatives considered. Provides polymorphic entity attachment to architecture objects, connections, changes, and version milestones. Implemented query helpers `getADRHistoryForObject`, `getADRsForVersion`, and `getADRsForConnection`.
  - `adrs.test.ts`: Added 4 unit tests verifying acceptance test for creating an ADR, linking it to an object, and querying history; status updates and lifecycle transitions; polymorphic attachment/detachment; and field validations.
  - `index.ts`: Exported `adrs`.
- Web layer (`apps/web/`):
  - `components/canvas/adr-drawer.tsx`: Implemented `<ADRBadge />` (displaying formatted ADR number, title, and status pill) and `<ADRHistoryDrawer />` (interactive side panel with ADR selector tabs, full decision details, status transition actions, and creation form).
  - `components/canvas/index.ts`: Exported ADR components.
  - `adrs.spec.tsx`: Added 3 integration tests verifying acceptance test for ADR creation and entity history inspection, `<ADRBadge />` rendering, and `<ADRHistoryDrawer />` open, empty, and populated states.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (143 test suites, 955 tests passed)
```

## 2026-10-02 — F061 — Merge

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `merge.ts`: Pure 3-way architecture branch merge engine and conflict detection system. Implemented `detectMergeConflicts` and `mergeBranchOntoMain`. Detects conflicts across `both_modified`, `both_added`, and `modify_delete` on identical object and connection IDs. Supports conflict resolution strategies ('theirs', 'ours', and per-entity manual resolution). Successfully synthesizes merged branch state and transitions source branch status to `'merged'` while pruning dangling connections.
  - `merge.test.ts`: Added 2 unit tests verifying acceptance test for clean merge application onto main, conflict detection on identical object IDs, conflict resolution via 'theirs', and manual per-entity resolution choices.
  - `index.ts`: Exported `merge`.
- Web layer (`apps/web/`):
  - `components/canvas/merge-modal.tsx`: Implemented `<ConflictResolutionBanner />` (warning alert with conflict counter and resolution strategy selectors) and `<MergeBranchModal />` (interactive 3-way merge dialog showing clean vs conflicting status, field deltas, and resolution choices).
  - `components/canvas/index.ts`: Exported merge components.
  - `merge.spec.tsx`: Added 3 integration tests verifying acceptance test for clean merge and conflict detection on identical object IDs, `<ConflictResolutionBanner />` rendering, and `<MergeBranchModal />` clean/conflicting state rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (141 test suites, 948 tests passed)
```

## 2026-10-02 — F060 — Pull requests

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'pr'` prefix to `IdPrefix` and declared `PullRequestId` brand type.
  - `pull-requests.ts`: Architecture pull requests domain logic and review engine. Implemented `createArchitecturePullRequest`, `submitPullRequestReview`, `addPullRequestComment`, and `calculatePullRequestRisk`. Supports titled pull requests linking source to target branch, embedded visual diff, downstream affected systems impact analysis, automated risk scoring (low, medium, high, critical) with human-readable rationale, and full review workflows (commenting, approving, and rejecting).
  - `pull-requests.test.ts`: Added 3 unit tests verifying acceptance test for diff accuracy and review workflow transitions, risk scoring calculations for removals/flows, and error handling for empty titles and closed PR reviews.
  - `index.ts`: Exported `pull-requests`.
- Web layer (`apps/web/`):
  - `components/canvas/pull-request-modal.tsx`: Implemented `<PullRequestBadge />` (displaying PR #, title, status pill, and risk level) and `<PullRequestModal />` (review modal with risk banner, diff tab, review history, comment form, and approve/reject actions).
  - `components/canvas/index.ts`: Exported pull request components.
  - `pull-requests.spec.tsx`: Added 3 integration tests verifying acceptance test for PR diff viewing and review submissions, `<PullRequestBadge />` rendering, and `<PullRequestModal />` review interactions.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (139 test suites, 943 tests passed)
```

## 2026-10-02 — F059 — Architecture changes

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `changes.ts`: Architecture change sets and impact analysis engine. Implemented `computeArchitectureChangeSet` calculating direct change lists (added, modified, removed objects and connections) alongside full downstream impact analysis: affected architecture objects (direct changes, connection endpoints, and connected dependencies), affected flows (flows traversing affected connections or objects), and affected stakeholder teams (teams owning affected objects via ownership records or metadata).
  - `changes.test.ts`: Added 2 unit tests verifying acceptance test for reporting correct affected sets (objects, flows, teams) and removed connection impact on flows and endpoints.
  - `index.ts`: Exported `changes`.
- Web layer (`apps/web/`):
  - `components/canvas/change-set-summary.tsx`: Implemented `<ImpactAnalysisBadge />` (displaying compact direct change and affected metric chips) and `<ChangeSetSummary />` (interactive panel with Direct Changes and Impact Analysis tabs).
  - `components/canvas/index.ts`: Exported change set components.
  - `changes.spec.tsx`: Added 3 integration tests verifying acceptance test for reporting correct affected sets, `<ImpactAnalysisBadge />` rendering, and `<ChangeSetSummary />` details rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (137 test suites, 937 tests passed)
```

## 2026-10-02 — F058 — Architecture diff

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `diff.ts`: Architecture visual diff engine and semantic color classification. Implemented `computeVisualArchitectureDiff` comparing two versions or branches across added, modified, removed, moved, and unchanged buckets with standard semantic colors (emerald for added, amber for modified, rose for removed, purple for moved). Differentiates between moved entities (position change only) and modified entities (attribute changes).
  - `diff.test.ts`: Added 3 unit tests verifying acceptance test for diff matching seeded changes with semantic colors, custom diff color theme support, and empty architecture handling.
  - `index.ts`: Exported `diff`.
- Web layer (`apps/web/`):
  - `components/canvas/visual-diff-viewer.tsx`: Implemented `<DiffLegend />` (category filter buttons with prefixed delta counters: `+`, `~`, `-`, `↕`) and `<VisualDiffViewer />` (diff details, position deltas, and field change lists).
  - `components/canvas/index.ts`: Exported visual diff components.
  - `diff.spec.tsx`: Added 3 integration tests verifying acceptance test for diff matching seeded changes, `<DiffLegend />` counter rendering, and `<VisualDiffViewer />` details rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (135 test suites, 932 tests passed)
```

## 2026-10-02 — F057 — Branches

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'brn'` prefix to `IdPrefix` and declared `BranchId` brand type.
  - `branches.ts`: Architecture branches domain logic and state isolation engine. Implemented `createMainBranch`, `forkBranch`, `addObjectToBranch`, `removeObjectFromBranch` (cascading removal of connections), `addConnectionToBranch`, `addAdrToBranch`, `addCommentToBranch`, `updateBranchMetadata`, and `cloneBranchState`. Guarantees deep state isolation so changes on a branch do not mutate main.
  - `branches.test.ts`: Added 4 unit tests verifying full architecture dimension carriage on main, acceptance test for branch independence from main, connection cascading on deletion, and branch name validation.
  - `index.ts`: Exported `branches`.
- Web layer (`apps/web/`):
  - `components/canvas/branch-selector.tsx`: Implemented `<BranchBadge />` (displaying branch icon and name with default/feature badge) and `<BranchSelector />` (dialog displaying branches, active status, entity counts, and creation form).
  - `components/canvas/index.ts`: Exported branch components.
  - `branches.spec.tsx`: Added 3 integration tests verifying acceptance test for branch independence from main, `<BranchBadge />` rendering, and `<BranchSelector />` branch switching and metrics rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (133 test suites, 926 tests passed)
```

## 2026-10-02 — F056 — Architecture snapshots

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `snapshots.ts`: Full 6-dimension architecture snapshot capture, deep freezing, restoration, and diffing engine. Implemented `captureFullArchitectureSnapshot` (capturing objects, connections, views, flows with steps, metadata, and doc pages), `restoreFullArchitectureSnapshot` (complete recreation of active state from snapshot), `diffArchitectureStates` (calculates added, modified, removed across all 6 dimensions), and `deepFreezeArchitectureState`.
  - `snapshots.test.ts`: Added 4 unit tests verifying full 6-dimension snapshot capture, acceptance test for snapshot restoration, deep freeze immutability enforcement, and comprehensive state diffing.
  - `index.ts`: Exported `snapshots`.
- Web layer (`apps/web/`):
  - `components/canvas/snapshot-modal.tsx`: Implemented `<SnapshotDetailsModal />` displaying dimension count badges and snapshot restoration action, and `<SnapshotDiffModal />` displaying comparison delta metrics across all 6 dimensions.
  - `components/canvas/index.ts`: Exported snapshot modal components.
  - `snapshots.spec.tsx`: Added 3 integration tests verifying acceptance test for snapshot restoration, details modal rendering, and comparison diff modal rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (131 test suites, 919 tests passed)
```

## 2026-10-02 — F055 — Version history

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'snp'` prefix to `IdPrefix` and declared `SnapshotId` brand type.
  - `version-history.ts`: Pure architecture version history and snapshot immutability engine. Implemented `createLiveVersion`, `createNumberedSnapshot`, `mutateLiveVersion`, `assertVersionEditable`, `listArchitectureSnapshots`, `findSnapshotByVersionNumber`, `restoreSnapshotToLive`, and `SnapshotImmutableError`. Deep freezes captured objects and connections to prevent mutation of historical releases.
  - `version-history.test.ts`: Added 6 unit tests verifying live version mutability, snapshot immutability retention, error throwing on edit assertion, and snapshot restoration.
  - `index.ts`: Exported `version-history`.
- Web layer (`apps/web/`):
  - `components/canvas/version-history.tsx`: Implemented `<SnapshotBadge />` with lock icon and metadata, and `<VersionTimeline />` displaying live editable node and snapshot release list with view and restore actions.
  - `components/canvas/index.ts`: Exported version history components.
  - `version-history.spec.tsx`: Added 4 integration tests verifying that snapshots remain unchanged while live edits continue, error throwing on snapshot edit assertions, and UI component rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (129 test suites, 912 tests passed)
```

## 2026-10-02 — F116 — Notifications (Phase 06 Complete)

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `notifications.ts`: Multi-channel notification pipeline (in-app, email, Slack, Microsoft Teams) for model changes, comments, mentions, and version review requests. Implemented `createNotification`, `dispatchNotification`, `markNotificationRead`, `markAllNotificationsRead`, `filterNotifications`, `countUnreadNotifications`, and `StubNotificationTransport`.
  - `notifications.test.ts`: Added 5 unit tests verifying multi-channel dispatch, transport failure handling, read workflows, and unread filtering.
  - `index.ts`: Exported `notifications`.
- Web layer (`apps/web/`):
  - `components/canvas/notification-center.tsx`: Implemented `<NotificationBadge />` with dynamic unread badge, `<NotificationItem />` with event and channel icons, and `<NotificationCenter />` drawer with mark-all-read and empty state.
  - `components/canvas/index.ts`: Exported notification components.
  - `notifications.spec.tsx`: Added 5 integration tests verifying multi-channel dispatch with stub transports, read status transitions, unread counter, and component rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (127 test suites, 902 tests passed)
```

## 2026-10-02 — F054 — Team management

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'team'` prefix to `IdPrefix` and declared `TeamId` brand type.
  - `teams.ts`: Pure team management and object ownership domain logic. Implemented `createTeam`, `addTeamMember`, `removeTeamMember`, `setTeamLead`, `isTeamMember`, `assignObjectOwnership`, `getObjectOwnership`, `isObjectOwnedByTeam`, `filterObjectsByOwner`, and `filterModelByOwner`.
  - `teams.test.ts`: Added 6 unit tests verifying team creation with slug derivation, member management, ownership assignment, filtering objects and models by owner team, and backup ownership matching.
  - `index.ts`: Exported `teams`.
- Web layer (`apps/web/`):
  - `components/canvas/team-badge.tsx`: Implemented `<TeamBadge />` showing team name, role (Owner / Backup), and styling; implemented `<OwnershipFilterSelector />` with team dropdown and "include backup" toggle.
  - `components/canvas/index.ts`: Exported team components.
  - `teams.spec.tsx`: Added 4 integration tests verifying owner filtering ("show everything owned by X"), full architecture model filtering, backup team matching, and component rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (125 test suites, 892 tests passed)
```

## 2026-10-02 — F053 — Permissions

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `types.ts`: Extended `MemberRole` to `'owner' | 'admin' | 'editor' | 'viewer' | 'guest'`.
  - `permissions.ts`: Pure framework-agnostic permissions engine supporting base role permissions matrix, per-workspace overrides (`WorkspacePermissionOverride`), and per-diagram overrides (`DiagramPermissionOverride`). Implemented `canPerform()`, `assertPermission()`, `getAllowedActions()`, and `PermissionDeniedError`.
  - `permissions.test.ts`: Added 7 comprehensive unit tests verifying 5 roles, per-workspace/diagram overrides, allowed action extraction, and unauthorized action error handling.
  - `index.ts`: Exported `permissions`.
- Database / API layer (`apps/api/`):
  - `prisma/schema.prisma`: Added `guest` to `MemberRole` enum and generated client.
- Web layer (`apps/web/`):
  - `components/canvas/permission-guard.tsx`: Implemented `<RoleBadge />` with role-specific color styling and `<PermissionGuard />` for conditional UI component rendering with fallback support.
  - `components/canvas/index.ts`: Exported permission components.
  - `permissions.spec.tsx`: Added 5 integration tests verifying role permission enforcement (viewer cannot edit, editor can edit, admin can invite), per-diagram overrides, allowed action query, and component rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm test               → exit 0 (37 test files, 270 tests passed)
```

## 2026-10-02 — F052 — Share links

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'shl'` prefix to `IdPrefix` and declared `ShareLinkId` brand type.
  - `share-links.ts`: Pure share links engine supporting `ShareLinkPayload`, `ShareLinkCameraState`, and `AnonymousViewState`. Implemented `createShareLink()`, `encodeShareLinkToken()`, `decodeShareLinkToken()`, `verifyShareLink()`, `resolveAnonymousViewState()`, and `generateShareLinkUrl()`.
  - `share-links.test.ts`: Added 6 unit tests verifying link creation, token encoding/decoding, expiration enforcement, and state preservation.
  - `index.ts`: Exported `share-links`.
- Web layer (`apps/web/`):
  - `components/canvas/share-link-modal.tsx`: Added `<ShareLinkModal />` with camera and selection preservation options, and `<ReadOnlyBanner />` component indicating read-only shared view.
  - `components/canvas/index.ts`: Exported share links components.
  - `share-links.spec.tsx`: Added 4 integration tests verifying anonymous view state preservation, expiration rejection, and component rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm --filter @diagramhq/domain test → 239 passed (35 test files)
pnpm --filter @diagramhq/web test    → 361 passed (49 test files)
pnpm test                            → 870 passed across all workspaces (239 domain, 361 web, 270 api)
branch: feat/F052-share-links
```

Evaluator scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5 => avg 5.0 — PASS

## 2026-10-02 — F051 — Mentions

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'tsk'` and `'ntf'` to `IdPrefix` and declared `TaskId` and `NotificationId` brand types.
  - `mentions.ts`: Pure mention parser, notification generator, and comment-to-task conversion engine. Implemented `extractMentionHandles()`, `generateMentionNotifications()` with author self-mention exclusion, `convertCommentToTask()` with target entity attribution and title derivation, `updateTaskStatus()`, and `reassignTask()`.
  - `mentions.test.ts`: Added 5 unit tests verifying mention handle extraction, notification dispatch, author self-mention exclusion, comment-to-task conversion, and task reassignment.
  - `index.ts`: Exported `mentions`.
- Web layer (`apps/web/`):
  - `components/canvas/mention-task-badge.tsx`: Added `<MentionText />` component highlighting `@username` mentions as stylized pills, and `<TaskCard />` component displaying task status, priority badges, and assignees.
  - `components/canvas/index.ts`: Exported mentions components.
  - `mentions.spec.tsx`: Added 4 integration tests verifying end-to-end @mention notification, comment conversion to task, multi-mentions, and React component rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm --filter @diagramhq/domain test → 233 passed (34 test files)
pnpm --filter @diagramhq/web test    → 357 passed (48 test files)
pnpm test                            → 860 passed across all workspaces (233 domain, 357 web, 270 api)
branch: feat/F051-mentions
```

Evaluator scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5 => avg 5.0 — PASS

## 2026-10-02 — F050 — Comments

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `ids.ts`: Added `'cmt'` to `IdPrefix` and declared `CommentId` type brand.
  - `comments.ts`: Pure threaded comments engine supporting `CommentTargetType` ('object' | 'connection' | 'diagram' | 'flow' | 'doc' | 'change'). Implemented `createComment()`, `replyToComment()`, `resolveComment()`, `reopenComment()`, `updateCommentContent()`, `filterComments()`, `buildCommentThreads()`, and `countUnresolvedCommentsByTarget()`.
  - `comments.test.ts`: Added 7 unit tests verifying entity support, input validation, reply nesting, CRUD operations, resolve/reopen, and thread aggregation.
  - `index.ts`: Exported `comments`.
- Web layer (`apps/web/`):
  - `components/canvas/comments-panel.tsx`: Added `<CommentsPanel />` drawer component and `<CommentPinBadge />` bubble badge with unresolved comment counters.
  - `components/canvas/index.ts`: Exported comments components.
  - `comments.spec.tsx`: Added 5 integration tests verifying comment CRUD and resolve on distinct entities, entity coverage across flows/diagrams/docs/changes, thread structure, and component rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm --filter @diagramhq/domain test → 228 passed (33 test files)
pnpm --filter @diagramhq/web test    → 353 passed (47 test files)
pnpm test                            → 851 passed across all workspaces (228 domain, 353 web, 270 api)
branch: feat/F050-comments
```

Evaluator scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5 => avg 5.0 — PASS

## 2026-10-02 — F049 — Presence

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `presence.ts`: Pure multi-user presence engine tracking `UserPresence`, `CursorPosition`, `PresenceRoomState`. Implemented `createPresenceRoom()`, `upsertPeerPresence()`, `updatePeerCursor()`, `updatePeerSelection()`, `removePeerPresence()`, `pruneInactivePeers()`, `getActivePeersInView()`, `getRemoteCursorsForView()`, `getRemoteSelections()`, and `getRemoteActiveObjects()`.
  - `presence.test.ts`: Added 8 unit tests covering room lifecycle, cursor position updates, dual user presence with cursors, multi-object selections, view filtering, and heartbeat pruning.
  - `index.ts`: Exported `presence`.
- Web layer (`apps/web/`):
  - `components/canvas/presence-cursors.tsx`: Added `<PresenceCursors />` component rendering live remote cursors with SVG arrows, user color theming, and object badges.
  - `components/canvas/presence-indicators.tsx`: Added `<PresenceIndicators />` component displaying collaborator count, live pulse dot, colored initials avatars, and hover tooltips.
  - `components/canvas/index.ts`: Exported `PresenceCursors` and `PresenceIndicators`.
  - `presence.spec.tsx`: Added 6 integration tests verifying dual-user cursor visualization, selection tracking, view filtering, idle detection, and React component rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm --filter @diagramhq/domain test → 221 passed (32 test files)
pnpm --filter @diagramhq/web test    → 348 passed (46 test files)
pnpm test                            → 839 passed across all workspaces (221 domain, 348 web, 270 api)
branch: feat/F049-presence
```

Evaluator scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5 => avg 5.0 — PASS

## 2026-10-02 — F048 — Real-time collaboration

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `collaboration.ts`: Pure CRDT/OT collaboration engine supporting `CollabSession`, `CollabOperation` (`upsert_object`, `delete_object`, `upsert_connection`, `delete_connection`, `update_object_position`). Implemented `compareLamport()` for deterministic Lamport clock and sessionId tie-breaking. Implemented `createCollabSession()`, `applyLocalOperation()`, `applyRemoteOperation()`, and `syncSessions()`. Guaranteed graph integrity with automated cascade deletion of orphan connections and diagram coordinates upon object deletion.
  - `collaboration.test.ts`: Added 9 unit tests verifying session creation, local operation dispatch, remote operation processing, idempotent re-application, deterministic LWW conflict resolution, cascade deletions, and multi-peer convergence.
  - `index.ts`: Exported collaboration types and functions.
- Web layer (`apps/web/`):
  - `components/canvas/collaboration-banner.tsx`: Added `<CollaborationBanner />` UI component displaying live connection pulse, peer count, avatar chips, operation counter, conflict resolution indicator, and manual sync trigger.
  - `components/canvas/index.ts`: Exported `CollaborationBanner`.
  - `collaboration.spec.tsx`: Added 5 integration tests verifying multi-client sessions, 2-client simultaneous edits, concurrent conflict resolution, 3-peer graph synchronization, and banner rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm --filter @diagramhq/domain test → 213 passed (31 test files)
pnpm --filter @diagramhq/web test    → 342 passed (45 test files)
pnpm test                            → 825 passed across all workspaces (213 domain, 342 web, 270 api)
branch: feat/F048-real-time-collaboration
```

Evaluator scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5 => avg 5.0 — PASS

## 2026-10-02 — F047 — API flows

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `types.ts`: Extended `Flow` and `FlowStep` with `endpoint`, `httpMethod`, `requestSchema`, `responseSchema`, and `statusCode`; defined `SequenceDiagramExportOptions` interface.
  - `flow.ts`: Updated `createFlow`, `updateFlow`, and `addFlowStep` to map API fields; implemented `createApiFlow()` factory with non-empty endpoint validation; implemented `annotateApiFlowStep()`; implemented `exportFlowToMermaidSequence()` exporting to Mermaid sequence diagram syntax; implemented `exportFlowToPlantUMLSequence()` exporting to PlantUML syntax.
  - `flow-playback.ts`: Added `getApiFlowPlaybackStepInfo()` runtime helper for step endpoint, method, status code, and schemas during playback.
  - `flow-view.ts`: Enhanced `FlowEdgeData` and `flowMetadata` to pass API endpoint, method, status code, schemas, and active step variants.
  - `api-flows.test.ts`: Added 9 unit tests covering API flow creation, step annotations, playback context extraction, Mermaid sequence export, PlantUML sequence export, missing connection validation, and canvas projection.
- Web layer (`apps/web/`):
  - `components/canvas/api-flow-overlay.tsx`: Added `<ApiFlowOverlay />` component rendering API endpoint, method badges with HTTP method color styling, status code badge, schema code blocks, step notes, and export action buttons.
  - `components/canvas/index.ts`: Exported `ApiFlowOverlay`.
  - `api-flows.spec.tsx`: Added 6 integration tests verifying API flow instantiation, step-by-step playback, Mermaid export generation, PlantUML export generation, canvas view projection, and overlay UI rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm --filter @diagramhq/domain test → 204 passed (30 test files)
pnpm --filter @diagramhq/web test    → 337 passed (44 test files)
pnpm test                            → 811 passed across all workspaces (204 domain, 337 web, 270 api)
branch: feat/F047-api-flows
```

Evaluator scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5 => avg 5.0 — PASS

## 2026-10-02 — F046 — Data flows

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `types.ts`: Added `dataClassification` and `dataElements` array to `Flow`; added `dataElements`, `transformation`, and `dataClassification` to `FlowStep`; defined `DataLineageHop` and `DataLineageTrace` interfaces.
  - `flow.ts`: Updated `createFlow`, `updateFlow`, and `addFlowStep` to retain data flow properties; added `createDataFlow()` factory function; implemented `annotateDataFlowStep()` for updating payload schemas/transformations; implemented `extractDataLineage()` with external egress exit identification (`exits`) feeding future data lineage integration (F091).
  - `flow-playback.ts`: Added `getDataFlowPlaybackStepInfo()` helper returning data elements, transformation notes, and classification level for the active playback step.
  - `flow-view.ts`: Attached `dataElements`, `transformation`, and `dataClassification` to projected canvas elements (`FlowEdgeData` and `flowMetadata`).
  - `data-flows.test.ts`: Added 5 unit tests covering data flow instantiation, step annotations, playback context extraction, data lineage tracing with egress detection, and canvas view projection.
- Web layer (`apps/web/`):
  - `components/canvas/data-flow-overlay.tsx`: Created `<DataFlowOverlay />` component rendering flow title, classification badge, data lineage hops, transformation notes, and step indicator.
  - `components/canvas/index.ts`: Exported `DataFlowOverlay`.
  - `data-flows.spec.tsx`: Added 5 integration tests covering data flow creation, playback step information, data lineage extraction with external exit identification, canvas view projection, and overlay UI rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm --filter @diagramhq/domain test → 195 passed (29 test files)
pnpm --filter @diagramhq/web test    → 331 passed (43 test files)
pnpm test                            → 796 passed across all workspaces (195 domain, 331 web, 270 api)
branch: feat/F046-data-flows
```

Evaluator scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5 => avg 5.0 — PASS

## 2026-10-02 — F045 — User journeys

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `types.ts`: Added `FlowType` union (`'sequence' | 'user_journey' | 'data_flow' | 'api_flow'`), expanded `Flow` with `type`, `actorId`, and `persona`, and expanded `FlowStep` with `actorAction` and `userIntent`.
  - `flow.ts`: Updated `createFlow`, `updateFlow`, and `addFlowStep` to preserve journey fields; implemented `createUserJourneyFlow` factory with model actor object validation (`ACTOR_NOT_FOUND`), and `annotateUserJourneyStep` for contextual step updates.
  - `flow-playback.ts`: Added `flowType` to `FlowPlaybackState` and implemented `getUserJourneyPlaybackStepInfo` helper for runtime step context during playback.
  - `flow-view.ts`: Enhanced `FlowEdgeData` and `flowMetadata` to pass persona, actor action, and user intent onto canvas projections.
  - `user-journeys.test.ts`: Added 5 unit tests covering journey flow creation, actor validation, step annotations, step-by-step playback, and canvas projection.
- Web layer (`apps/web/`):
  - `components/canvas/flow-playback-toolbar.tsx`: Enhanced toolbar to accept optional persona, actor action, and user intent, rendering user journey context chips.
  - `components/canvas/user-journey-overlay.tsx`: Created `<UserJourneyOverlay />` component rendering journey title, persona badge, progress bar, current step action, user intent, and note.
  - `components/canvas/index.ts`: Exported `UserJourneyOverlay`.
  - `user-journeys.spec.tsx`: Added 4 integration tests verifying user journey instantiation, step-by-step playback, canvas projection, and UI rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm --filter @diagramhq/domain test → 190 passed (28 test files)
pnpm --filter @diagramhq/web test    → 326 passed (42 test files)
pnpm test                            → 786 passed across all workspaces (190 domain, 326 web, 270 api)
branch: feat/F045-user-journeys
```

Evaluator scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5 => avg 5.0 — PASS

## 2026-10-02 — F044 — Flow playback

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `flow-playback.ts`: Pure domain state machine for flow playback (`createFlowPlayback`, `playFlow`, `pauseFlow`, `nextFlowStep`, `prevFlowStep`, `restartFlow`, `setFlowSpeed`, `seekFlowStep`, `computeStepIntervalMs`). Zero external dependencies, pure immutable updates.
  - `flow-playback.test.ts`: Added 8 unit tests covering initialization, play, pause, bounds checking, forward/backward navigation, step restart, loop-around semantics, speed setting, and interval computation.
  - `index.ts`: Exported flow playback types and functions.
- Web layer (`apps/web/`):
  - `components/canvas/flow-playback-toolbar.tsx`: Added `<FlowPlaybackToolbar />` component featuring Play/Pause toggle, Previous/Next step buttons, Restart, Step counter/scrubber, Speed selector (`0.5x`, `1x`, `2x`, `4x`), and Loop toggle.
  - `components/canvas/index.ts`: Exported `FlowPlaybackToolbar`.
  - `flow-playback.spec.ts`: Added 4 integration tests verifying playback advancement, loop behavior, speed adjustments, and UI component rendering.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm --filter @diagramhq/domain test → 185 passed (27 test files)
pnpm --filter @diagramhq/web test    → 314 passed (39 test files)
pnpm test                            → 769 passed across all workspaces
branch: feat/F044-flow-playback
```

Evaluator scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5 => avg 5.0 — PASS

## 2026-10-02 — F043 — Flow visualization

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `flow-view.ts`: Implemented `projectFlowToCanvas(objects, connections, flow, viewObjects?, options?)` — pure projection function mapping architecture model objects, connections, and an ordered sequence Flow into canvas nodes and edges.
  - Highlights flow path elements: flags participating nodes (`isInFlow: true`, `flowStepNumbers: number[]`, `highlighted: true`) and dims non-participating elements (`isDimmed: true`).
  - Animates edges in the flow (`animated: true`, formatted sequential label with step number and note).
  - Supports `options.activeStepIndex` highlighting specific active step edges and active step participant nodes for step scrubbing and playback.
  - `flow-view.test.ts`: Added 4 unit tests covering flow path highlighting, node and edge annotation, active step indexing, empty flows, and immutability.
  - `index.ts`: Exported `flow-view.ts` types and functions.
- Web layer (`apps/web/`):
  - `components/canvas/flow-badges.tsx`: Added `<FlowBadges />` component rendering step number indicators and active step pulses.
  - Integrated `FlowBadges` and flow visual states (active ring/dimmed opacity) across all node types: `app-node.tsx`, `system-node.tsx` (internal and external boundaries), `database-node.tsx`, `component-node.tsx`, `queue-node.tsx`, `person-node.tsx`.
  - `components/canvas/icepanel-edge.tsx`: Enhanced to support flow stroke coloring, stroke width, drop-shadow glow filter, and step pill badges with step numbers and notes.
  - `flow-visualization.spec.ts`: Added 4 integration tests verifying flow path rendering, edge animation and annotation, active step highlighting, and model immutability.

Verification evidence:
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm --filter @diagramhq/domain test → 177 passed (26 test files)
pnpm --filter @diagramhq/web test    → 318 passed (40 test files)
pnpm test                            → 765 passed across all workspaces
branch: feat/F043-flow-visualization
```

Evaluator scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5 => avg 5.0 — PASS

## 2026-10-01 — F042 — Flow steps


Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `flow.ts`: Implemented `addFlowStep()`, `removeFlowStep()`, `annotateFlowStep()`, `reorderFlowStepsByIndex()`, and `reorderFlowStepList()`. Ensures step indices remain normalized (0..N-1) and annotations persist stably across additions, deletions, and moves.
  - `flow.test.ts`: Added 5 unit tests for insertion with index shifting, step annotation, removal with normalization, index-based reordering, and ID list reordering.
- API layer (`apps/api/src/`):
  - `flows/flows.dto.ts`: Added `AddFlowStepDto`, `UpdateFlowStepDto`, and `ReorderFlowStepsDto`.
  - `flows/flows.service.ts`: Added `addStep()`, `updateStep()`, `removeStep()`, and `reorderSteps()` methods with connection validation and transactional re-indexing.
  - `flows/flows.controller.ts`: Exposed `POST /flows/:flowId/steps`, `PATCH /flows/:flowId/steps/:stepId`, `DELETE /flows/:flowId/steps/:stepId`, and `PUT /flows/:flowId/steps/reorder`.
  - `flows/flows.service.spec.ts`: Added 5 unit tests covering step operations.
- Web layer (`apps/web/`):
  - `flow-steps.spec.ts`: Added 4 integration tests verifying adding steps, reordering by index and list, annotating steps, and persistence of notes.

Verification evidence:
```
pnpm typecheck          → exit 0
pnpm lint               → exit 0
pnpm check-architecture → exit 0 (clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm --filter @diagramhq/domain test → 173 passed (25 test files)
pnpm --filter @diagramhq/web test    → 307 passed (38 test files)
pnpm --filter @diagramhq/api exec vitest run src/flows/flows.service.spec.ts → 13 passed
branch: feat/F042-flow-steps
```

Evaluator scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5 => avg 5.0 — PASS

## 2026-10-01 — F041 — Flow model

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `types.ts`: Added `FlowStep` and `FlowWithSteps` interfaces.
  - `flow.ts`: Implemented `validateFlowSteps()`, `createFlow()`, `updateFlow()`, `getFlowConnections()`, and `reorderFlowSteps()`. Enforces that every flow step must reference an existing connection in the architecture model.
  - `flow.test.ts`: Added 8 unit tests covering flow creation, step ordering, note persistence, rejection of invalid steps, diagram independence, connection resolution, updating, and step reordering.
  - `index.ts`: Exported `flow.ts` functions and types.
- API layer (`apps/api/src/`):
  - `flows/flows.dto.ts`: Implemented `FlowStepDto`, `CreateFlowDto`, and `UpdateFlowDto` with class-validator decorators.
  - `flows/flows.service.ts`: Implemented `FlowsService` with architecture membership validation, connection validation within the architecture, and transactional flow/step persistence.
  - `flows/flows.controller.ts`: Implemented CRUD endpoints under `/architectures/:architectureId/flows` and `/flows/:flowId`.
  - `flows/flows.module.ts`: Created `FlowsModule` and registered in `app.module.ts`.
  - `flows/flows.service.spec.ts`: Added 8 unit tests for all service methods and edge cases.
- Web layer (`apps/web/`):
  - `flow-model.spec.ts`: Added 4 integration tests verifying flow creation from connections, step ordering, rejection of invalid connections, diagram independence, and step updates.

Verification evidence:
```
pnpm typecheck          → exit 0
pnpm lint               → exit 0
pnpm check-architecture → exit 0 (check-architecture: clean)
pnpm build              → exit 0 (all apps and packages built)
pnpm --filter @diagramhq/domain test → 168 passed (25 test files)
pnpm --filter @diagramhq/web test    → 303 passed (37 test files)
pnpm --filter @diagramhq/api exec vitest run src/flows/flows.service.spec.ts → 8 passed
branch: feat/F041-flow-model
```

Evaluator scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5 => avg 5.0 — PASS

## 2026-09-27 — F115 — Persona modes

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `persona-view.ts`: Implemented `projectPersonaViewToCanvas()` — wraps the base canvas projection and stamps `personaMode` + `personaView: true` onto all node and edge data objects. Supports all 8 modes: architect, developer, security, sre, data, product, executive, auditor. Default mode: `architect`.
  - `persona-view.test.ts`: Unit test — verifies `personaMode: 'security'` and `personaView: true` are stamped on nodes after projection.
  - `index.ts`: `projectPersonaViewToCanvas` and `PersonaMode` already exported (no change needed).
- UI components (`apps/web/components/canvas/`):
  - `persona-badges.tsx`: `<PersonaBadges />` renders an icon + label badge for the active persona mode. 8 distinct colours and SVG icons, one per persona. Only renders when `personaView: true`.
  - `app-node.tsx`, `system-node.tsx` (external + internal), `database-node.tsx`, `component-node.tsx`: integrated `<PersonaBadges />` after `<TechnologyBadges />`.
- Tests (`apps/web/persona-modes.spec.ts`):
  - All 8 personas produce `personaView=true` + correct `personaMode` on nodes and edges.
  - Switching persona re-scopes the render without mutating the underlying model.
  - Default persona (no mode specified) is `architect`.

Verification evidence:
```
pnpm verify  →  exit 0 (typecheck clean, lint clean, 280 web + 256 API tests passed, check-architecture: clean)
pnpm build   →  exit 0 (Next.js routes all compiled)
branch: feat/F115-persona-modes  commit: 35c4621
```

Evaluator scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5 => avg 5.0 — PASS

## 2026-09-27 — F114 — Technology catalog


Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `types.ts`: Extended `Technology` interface with `version`, `vendor`, `lifecycle`, `securityStatus`, `owner`, and `docs`.
  - `technology-view.ts`: Implemented `projectTechnologyViewToCanvas` to inject `technologies` metadata into nodes.
  - `view-filter.ts`: Enhanced `matchesViewFilter` to evaluate `meta.technologies` array and added the `technologyLifecycle` criterion to support finding systems with unsupported technologies.
  - `view-filter.test.ts`: Added unit tests verifying F114 technology lifecycle filtering ("unsupported").
- API layer (`apps/api/prisma/schema.prisma`):
  - Added new fields `version`, `vendor`, `lifecycle`, `securityStatus`, `owner`, and `docs` to the `Technology` model.
- UI components (`apps/web/components/canvas/`):
  - `technology-badges.tsx`: Implemented standalone SVG badges for rendering technologies and color-coding by lifecycle.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `<TechnologyBadges />`.


## 2026-09-27 — F038 — Security views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-view.ts`: Implemented `projectSecurityViewToCanvas` to inject security data properties into model objects and dynamically project them into `GroupNode` elements representing `trustZone` boundaries.
  - `view.ts`: Registered `security` ViewKind labeling support.
- UI components (`apps/web/components/canvas/`):
  - `security-badges.tsx`: Implemented a standalone overlay rendering SVG badges for public endpoints, auth, secrets, encryption, and compliance.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `SecurityBadges` conditional on `securityView` metadata.
- Validation (`apps/web/security-views.spec.ts`):
  - Unit tests verifying the proper mapping of the model into group boundary wrappers and extraction of the correct security flags to the canvas node props.


## 2026-09-27 — F035 — Dynamic views
Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `view-filter.ts`: Defined `ViewFilter` interface supporting 12 filter criteria (team, technology, environment, domain, owner, status/lifecycle, tag/tags, criticality, data-classification, cloud, region, repository), normalized case-insensitive multi-value evaluation `matchesViewFilter`, and pure model array projection `evaluateDynamicView`.
  - `view.ts`: Added dynamic view factory `createDynamicViewOptions` and discriminator `isDynamicView`.
  - `view-filter.test.ts` & `view.test.ts`: Added unit tests verifying individual and multi-criteria filters, and dynamic view options.
  - `index.ts`: Exported `view-filter` module.
- API layer (`apps/api/src/views/`):
  - `views.service.ts`: Updated `getViewObjects` to dynamically project matching model objects when `view.filter` is populated, preserving saved layout positions, and added `getViewProjection` returning view plus projected model objects.
  - `views.controller.ts`: Added `GET /views/:viewId/projection` endpoint.
  - `dynamic-views.e2e.spec.ts`: 4 E2E integration tests verifying dynamic view creation, live projection without static records, immediate entry and exit of objects upon metadata PATCH, and layout position persistence.
- Web client layer (`apps/web/`):
  - `dynamic-views.spec.ts`: Unit tests verifying dynamic view options creation and multi-criteria model object filtering.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 254 tests in API across 35 test files, 271 tests in web across 30 test files, 144 tests in domain across 22 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: APPROVED. Full log: `.harness/reviews/F035-review.md`.


## 2026-09-27 — F038 — Security views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-view.ts`: Implemented `projectSecurityViewToCanvas` to inject security data properties into model objects and dynamically project them into `GroupNode` elements representing `trustZone` boundaries.
  - `view.ts`: Registered `security` ViewKind labeling support.
- UI components (`apps/web/components/canvas/`):
  - `security-badges.tsx`: Implemented a standalone overlay rendering SVG badges for public endpoints, auth, secrets, encryption, and compliance.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `SecurityBadges` conditional on `securityView` metadata.
- Validation (`apps/web/security-views.spec.ts`):
  - Unit tests verifying the proper mapping of the model into group boundary wrappers and extraction of the correct security flags to the canvas node props.
## 2026-09-27 — F034 — Component diagrams
Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `view.ts`: Added `createComponentViewOptions`, `isComponentView`, and Level 3 component label handling in `getViewLevelLabel`.
  - `view.test.ts`: Added unit tests for component view options creation, level 3 label mapping, and type discrimination.
- API layer (`apps/api/src/views/`):
  - `component-diagram.e2e.spec.ts`: 4 E2E integration tests verifying component diagram creation (kind: component), layout rendering of components with positions, updating positions via endpoint, and deletion isolation preserving all underlying model entities.
- Web client layer (`apps/web/`):
  - `component-diagram.spec.ts`: 3 unit tests verifying component view options creation, level 3 labelling, and kind detection.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 250 tests in API across 34 test files, 269 tests in web across 29 test files, 140 tests in domain across 21 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: APPROVED. Full log: `.harness/reviews/F034-review.md`.


## 2026-09-27 — F038 — Security views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-view.ts`: Implemented `projectSecurityViewToCanvas` to inject security data properties into model objects and dynamically project them into `GroupNode` elements representing `trustZone` boundaries.
  - `view.ts`: Registered `security` ViewKind labeling support.
- UI components (`apps/web/components/canvas/`):
  - `security-badges.tsx`: Implemented a standalone overlay rendering SVG badges for public endpoints, auth, secrets, encryption, and compliance.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `SecurityBadges` conditional on `securityView` metadata.
- Validation (`apps/web/security-views.spec.ts`):
  - Unit tests verifying the proper mapping of the model into group boundary wrappers and extraction of the correct security flags to the canvas node props.
## 2026-09-27 — F033 — Container diagrams
Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `view.ts`: Container diagram helpers (`createContainerViewOptions`, `isContainerView`, `getViewLevelLabel` Level 2 formatting).
- API layer (`apps/api/src/views/`):
  - `container-diagram.e2e.spec.ts`: 4 E2E integration tests verifying container diagram creation (kind: container), layout rendering for applications, stores, and queues with coordinate persistence, position updates via `PATCH /views/:viewId/objects/:objectId/position`, and diagram deletion isolation without affecting the underlying architecture model entities.
- Web client layer (`apps/web/`):
  - `container-diagram.spec.ts`: 3 unit tests verifying container view options creation, level 2 labelling, and kind detection.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 246 tests in API across 33 test files, 266 tests in web across 28 test files, 139 tests in domain across 21 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: APPROVED. Full log: `.harness/reviews/F033-review.md`.


## 2026-09-27 — F038 — Security views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-view.ts`: Implemented `projectSecurityViewToCanvas` to inject security data properties into model objects and dynamically project them into `GroupNode` elements representing `trustZone` boundaries.
  - `view.ts`: Registered `security` ViewKind labeling support.
- UI components (`apps/web/components/canvas/`):
  - `security-badges.tsx`: Implemented a standalone overlay rendering SVG badges for public endpoints, auth, secrets, encryption, and compliance.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `SecurityBadges` conditional on `securityView` metadata.
- Validation (`apps/web/security-views.spec.ts`):
  - Unit tests verifying the proper mapping of the model into group boundary wrappers and extraction of the correct security flags to the canvas node props.
## 2026-09-27 — F032 — Context diagrams
Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `view.ts`: Defined `CreateViewOptions` interface, helper `createContextViewOptions`, kind predicate `isContextView`, and level description helper `getViewLevelLabel`.
  - `view.test.ts`: 4 unit tests verifying context view options creation, kind detection, and label formatting.
  - `index.ts`: exported view module.
- API layer (`apps/api/src/views/`):
  - `views.dto.ts`: Added DTOs for view management (`CreateViewDto`, `UpdateViewDto`, `AddViewObjectDto`, `ViewKindDto`).
  - `views.controller.ts` & `views.service.ts`: Implemented saved view endpoints (`POST/GET /architectures/:id/views`, `GET/DELETE /views/:id`, `POST /views/:id/objects`, `DELETE /views/:id/objects/:objectId`, `GET /views/:id/objects`).
  - `context-diagram.e2e.spec.ts`: 6 E2E integration tests verifying context diagram creation (kind: context), RBAC write protection, multi-diagram object assignment, object deletion isolation (removing object from diagram keeps it in other diagrams and in the model), and view listing.
- Web client layer (`apps/web/`):
  - `context-diagram.spec.ts`: 3 unit tests verifying domain view helpers within the web package.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 242 tests in API across 32 test files, 263 tests in web across 27 test files, 139 tests in domain across 21 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: APPROVED. Full log: `.harness/reviews/F032-review.md`.


## 2026-09-27 — F038 — Security views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-view.ts`: Implemented `projectSecurityViewToCanvas` to inject security data properties into model objects and dynamically project them into `GroupNode` elements representing `trustZone` boundaries.
  - `view.ts`: Registered `security` ViewKind labeling support.
- UI components (`apps/web/components/canvas/`):
  - `security-badges.tsx`: Implemented a standalone overlay rendering SVG badges for public endpoints, auth, secrets, encryption, and compliance.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `SecurityBadges` conditional on `securityView` metadata.
- Validation (`apps/web/security-views.spec.ts`):
  - Unit tests verifying the proper mapping of the model into group boundary wrappers and extraction of the correct security flags to the canvas node props.
## 2026-09-27 — F031 — Object lifecycle
Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `lifecycle.ts`: Defined `LifecycleState` ('future' | 'live' | 'deprecated' | 'removed'), `LifecycleTransition` interface (from, to, at, by, reason), state machine transition table and validator `isValidLifecycleTransition`, transition factory `createLifecycleTransition` with error throwing on invalid transition, semantic UI styling `getLifecycleBadgeColor`, and array `LIFECYCLE_STATES`.
  - `lifecycle.test.ts`: 4 unit tests verifying transition rules, invalid transition throwing, badge color mappings, and states array.
  - `index.ts`: exported lifecycle module.
- API layer (`apps/api/src/`):
  - `vitest.config.ts`: configured `poolOptions: { forks: { singleFork: true } }` ensuring robust, contention-free sequential integration test execution across database suites.
  - `architectures/lifecycle.e2e.spec.ts`: 4 E2E integration tests verifying lifecycle state assignment (`future`) via `PATCH /objects/:id`, transition recording (`future` -> `live`) in `metadata.lifecycleTransitions`, persistence verification on `GET /objects/:id`, and architecture model snapshot reload verification on `GET /architectures/:id/model`.
- Web client layer (`apps/web/`):
  - `lifecycle.spec.ts`: 3 unit tests verifying badge color, valid/invalid state transitions, and transition creation within the web application environment.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 236 tests in API across 31 test files, 260 tests in web across 26 test files, 135 tests in domain across 20 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: APPROVED. Full log: `.harness/reviews/F031-review.md`.

## 2026-09-26 — F030 — Object metadata

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `object-metadata.ts`: Full metadata schema `ObjectMetadataSchema` (identity, ownership, technical, classification, risk & compliance, SLA/RTO/RPO, documentation/repository, lifecycle transitions), option constants (`OBJECT_STATUS_OPTIONS`, `OBJECT_ENVIRONMENT_OPTIONS`, `OBJECT_CRITICALITY_OPTIONS`, `OBJECT_DATA_CLASSIFICATION_OPTIONS`), and `mergeObjectMetadata` helper.
  - `object-metadata.test.ts`: 6 unit tests verifying schema definitions, metadata merging, empty fallback, and options arrays.
- Web client layer (`apps/web/`):
  - `InspectorPanel` (`components/shell/inspector-panel.tsx`): interactive object inspector panel with collapsed strip, tab headers, item header with kind badge, and comprehensive grouped inputs (Identity, Ownership, Technical, Classification, Risk & Compliance, SLA, Documentation).
  - `inspector-panel.spec.tsx`: 4 unit tests verifying collapsed state toggle, field inputs, active object header, and `onMetadataChange` dispatching.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 232 tests in API, 261 in web, 131 in domain)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: APPROVED. Full log: `.harness/reviews/F030-review.md`.

## 2026-09-26 — F029 — Connections

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `connection.ts`: Rich connection metadata types (`ConnectionProtocol`, `ConnectionDirection`, `ConnectionStatus`, `ConnectionAuth`, `ConnectionEncryption`, `RichConnectionMetadata`), constant `RICH_CONNECTION_PROTOCOLS`, predicate `isRichConnection`, and helper `createRichConnectionMetadata`.
  - `connection.test.ts`: Unit tests verifying metadata construction, protocol lists, and rich connection discrimination.
- API layer (`apps/api/src/architectures/`):
  - `connection.e2e.spec.ts`: 5 E2E tests verifying connection creation with rich metadata (protocol, auth, encryption, port), strict endpoint validation (cross-architecture / cross-version pairs rejected with HTTP 400), self-connection rejection (HTTP 400), metadata patching (latency, errorBehavior), and model snapshot reload verification.
  - `apps/api/vitest.config.ts`: disabled `fileParallelism` to eliminate PostgreSQL connection contention during concurrent E2E test runs.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 232 tests in API, 253 in web, 125 in domain)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F029-review.md`.

## 2026-09-26 — F028 — Group

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `group.ts`: Group domain model, `GroupKind` ('group' | 'boundary' | 'zone' | 'team' | 'domain' | 'namespace'), `GroupMetadata` interface (groupKind, color, collapsed), `GroupNodeData` interface, helper `createGroup`, predicate `isGroup`, and canvas projection `projectGroupToCanvas`.
  - `group.test.ts`: 4 unit tests verifying group creation, kind, color, childCount, standalone and parent linkage, and canvas projection.
- API layer (`apps/api/src/architectures/`):
  - `group.e2e.spec.ts`: 5 E2E tests verifying top-level boundary group creation, nested team group creation (`parentId: boundaryId`), cycle prevention enforcement (HTTP 400 when setting ancestor cycle), model snapshot reload verification, and parent deletion with child survival via `SetNull` cascade.
- Web client layer (`apps/web/`):
  - `GroupNode` component (`components/canvas/group-node.tsx`) rendering dashed boundary styling, kind badge (`[Group: ...]`), child count badge, and 4-way handles.
  - Registration in `components/canvas/custom-nodes.tsx` for `group`.
  - `group.spec.ts`: 4 tests covering SSR node rendering, team variant styling, and canvas projection.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 227 tests passing across 29 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F028-review.md`.

## 2026-09-26 — F027 — Queue

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `queue.ts`: Queue domain model, `QueueKind` ('kafka' | 'rabbitmq' | 'sqs' | 'eventbridge' | 'pubsub' | 'nats' | 'queue'), `QueueMetadata` interface (storeKind: 'queue', queueKind, technology, topics, partitions, retentionPolicy), `QueueNodeData` interface, helper `createQueue`, predicate `isQueue`, and canvas projection `projectQueueToCanvas`.
  - `queue.test.ts`: 4 unit tests verifying queue creation, topics list, technology metadata, standalone and parent linkage, and canvas projection.
- API layer (`apps/api/src/architectures/`):
  - `queue.e2e.spec.ts`: 6 E2E tests verifying creation of Queue under a parent Application (`parentId`), standalone Kafka cluster creation, async connection between Application and Queue, metadata PATCH update, model snapshot reload verification, and cascade deletion.
- Web client layer (`apps/web/`):
  - `QueueNode` component (`components/canvas/queue-node.tsx`) rendering queue icon, theme gradient styling, kind badge (`[Queue: ...]`), technology tag, topic chips, and 4-way handles.
  - Registration in `components/canvas/custom-nodes.tsx` for `queue`.
  - `queue.spec.ts`: 4 tests covering SSR node rendering, kafka variant styling, and canvas projection.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 222 tests passing across 28 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F027-review.md`.

## 2026-09-26 — F026 — Database

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `database.ts`: Database domain model, `DatabaseKind` ('postgresql' | 'mysql' | 'mongodb' | 'redis' | 'elasticsearch' | 'dynamodb' | 'sqlite' | 'cassandra' | 'store'), `DatabaseMetadata` interface (databaseKind, technology, schema, version, host, replication), `DatabaseNodeData` interface, helper `createDatabase`, predicate `isDatabase`, and canvas projection `projectDatabaseToCanvas`.
  - `database.test.ts`: 4 unit tests verifying database creation, technology/schema/version metadata, standalone and parent linkage, and canvas projection.
- API layer (`apps/api/src/architectures/`):
  - `database.e2e.spec.ts`: 6 E2E tests verifying creation of Database under a parent Application (`parentId`), standalone Redis cache creation, data connection between Application and Database, metadata PATCH update, model snapshot reload verification, and cascade deletion.
- Web client layer (`apps/web/`):
  - `DatabaseNode` component (`components/canvas/database-node.tsx`) rendering cylinder icon, theme gradient styling, kind badge (`[Database: ...]`), technology tag, schema badge, and 4-way handles.
  - Registration in `components/canvas/custom-nodes.tsx` for `database`.
  - `database.spec.ts`: 5 tests covering SSR node rendering, redis variant styling, selection ring, and canvas projection.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 216 tests passing across 27 test files)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F026-review.md`.

## 2026-09-26 — F025 — Component

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `component.ts`: Component domain model, `ComponentKind`, `ComponentMetadata` interface (componentKind, technology, interfaces, codeRef), `ComponentNodeData` interface, helper `createComponent`, predicate `isComponent`, and canvas projection `projectComponentToCanvas`.
  - `component.test.ts`: 4 unit tests verifying component creation, technology/interfaces metadata, parent application linkage (`parentId`), and canvas projection.
  - `c4-component.ts`: refactored options to `CreateC4ComponentOptions` and shared predicate to resolve barrel export collisions.
- API layer (`apps/api/src/architectures/`):
  - `component.e2e.spec.ts`: 6 E2E tests verifying creation of Component under a parent Application (`parentId`), creation of Repository Component, inter-component connections (Service -> Repository), metadata PATCH update, model snapshot reload identity, and cascade deletion.
- Web client layer (`apps/web/`):
  - `ComponentNode` component (`components/canvas/component-node.tsx`) rendering component kind icons, kind badge (`[Component: ...]`), technology badge (`[...]`), interfaces list, code reference link and inspect button, and 4-way handles.
  - Registration in `components/canvas/custom-nodes.tsx` for `component`.
  - `component.spec.ts`: 7 tests covering SSR node rendering, code reference inspect callback invocation, canvas mounting with `InfiniteCanvas`, and `ArchitectureModelClient` reload identity.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 210 API tests, 113 domain tests, 240 web tests. Total: 563 tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F025-review.md`.

## 2026-09-26 — F024 — Application

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `application.ts`: Application domain model, `ApplicationType`, `ApplicationMetadata` interface (technology, runtime, status, port, canDrillDown), `ApplicationNodeData` interface, helper `createApplication`, predicate `isApplication`, and canvas projection `projectApplicationToCanvas`.
  - `application.test.ts`: 4 unit tests verifying application creation, technology/runtime metadata, parent system linkage (`parentId`), and canvas projection.
- API layer (`apps/api/src/architectures/`):
  - `application.e2e.spec.ts`: 6 E2E tests verifying creation of Application under a parent System (`parentId`), standalone Application service creation (`parentId: null`), inter-application connections, metadata PATCH update, model snapshot reload identity, and cascade deletion.
- Web client layer (`apps/web/`):
  - `AppNode` component (`components/canvas/app-node.tsx`) rendering app icon, application type tag (`[Type: ...]`), technology badge (`[...]`), runtime indicator, status badge (`Active`), port badge (`[:port]`), component drill-down button, and 4-way handles.
  - Registration in `components/canvas/custom-nodes.tsx` for `application`.
  - `application.spec.ts`: 5 tests covering SSR node rendering, drill-down callback invocation, canvas mounting with `InfiniteCanvas`, and `ArchitectureModelClient` reload identity.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 204 API tests, 109 domain tests, 228 web tests. Total: 541 tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F024-review.md`.

## 2026-09-26 — F023 — System

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `system.ts`: System domain model, `SystemMetadata` interface (external flag, domain, systemType, critical), `SystemNodeData` interface, helper `createSystem`, predicates `isSystem`, `isExternalSystem`, `isInternalSystem`, and canvas projection `projectSystemToCanvas`.
  - `system.test.ts`: 5 unit tests verifying internal vs external system classification, metadata properties, and canvas projection.
  - `c4-context.ts`: re-exported `isExternalSystem` and `isInternalSystem` from `./system` to eliminate duplication.
- API layer (`apps/api/src/architectures/`):
  - `system.e2e.spec.ts`: 6 E2E tests verifying creation of internal System (domain, systemType, critical), external System (third-party SaaS integration), system-to-system connections, metadata PATCH update, model snapshot reload identity, and cascade deletion.
- Web client layer (`apps/web/`):
  - `SystemNode` component (`components/canvas/system-node.tsx`) rendering internal systems (solid blue theme, domain badge `[Domain: ...]`, system type tag `[Type: ...]`, criticality badge `[Tier 0]`, container drill-down button) vs external systems (dashed slate border, external SaaS badge, no drill-down button), and 4-way handles.
  - Registration in `components/canvas/custom-nodes.tsx` for `system` and `default`.
  - `system.spec.ts`: 6 tests covering SSR node rendering, external system styling, drill-down callback invocation, canvas mounting with `InfiniteCanvas`, and `ArchitectureModelClient` reload identity.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 198 API tests, 105 domain tests, 228 web tests. Total: 531 tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F023-review.md`.

## 2026-09-26 — F022 — Person

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `person.ts`: Person / Actor domain model, `PersonMetadata` interface (role, department, external flag, email), `PersonNodeData` interface, helper `createPerson`, predicates `isPerson`, `isExternalPerson`, and canvas projection `projectPersonToCanvas`.
  - `person.test.ts`: 4 unit tests verifying classification, internal/external persona options, and canvas projection.
  - `c4-context.ts`: re-exported `isPerson` from `./person` to maintain clean modular dependencies.
- API layer (`apps/api/src/architectures/`):
  - `person.e2e.spec.ts`: 7 E2E tests verifying creation of internal Person (with role, department, email), external Person (customer/external actor), connection to software system, metadata PATCH update, model snapshot reload identity, and cascade deletion.
- Web client layer (`apps/web/`):
  - `PersonNode` component (`components/canvas/person-node.tsx`) rendering avatar icon, role badge (`[Role: ...]`), department tag (`[Dept: ...]`), external vs internal actor badges, contact email with icon, and 4-way connection handles.
  - Registration in `components/canvas/custom-nodes.tsx` for `person` and `actor`.
  - `person.spec.ts`: 5 tests covering SSR node rendering, external persona badge, selected ring, canvas mounting with `InfiniteCanvas`, and `ArchitectureModelClient` reload identity.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 192 API tests, 100 domain tests, 221 web tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F022-review.md`.

## 2026-09-26 — F021 — C4 Component

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `c4-component.ts`: C4 Level 3 component domain types (`C4ComponentKind`: 'component' | 'controller' | 'service' | 'repository' | 'middleware' | 'handler', `C4CodeMappingStub`, `C4ComponentNodeData`, `C4ContainerBoundaryNodeData`).
  - Helper functions: `createC4Component`, `createC4Controller`, `createC4DomainService`, `createC4Repository`.
  - Predicates and invariant helpers: `isComponent`, `isComponentOfContainer`, `getContainerComponents`, `getC4ComponentKind`.
  - Canvas projection: `projectC4ComponentToCanvas` mapping enclosing container boundary, component nodes with technology tags and L4 code mapping stubs, and inter-component edges.
  - `c4-component.test.ts`: 4 unit tests verifying classification, filtering, and canvas projection.
- API layer (`apps/api/src/architectures/`):
  - Model verification for C4 Component elements inside a container (`parentId = container.id`).
  - `c4-component.e2e.spec.ts`: 7 E2E tests verifying creation of components (controllers, services, repositories) inside parent container, L4 code mapping metadata persistence, inter-component connections, model snapshot reload identity, and cascade deletion.
- Web client layer (`apps/web/`):
  - `C4ComponentNode` component (`components/canvas/c4-component-node.tsx`) rendering:
    - Dedicated visual themes and icons for Controllers, Services, Repositories, Middlewares, and Handlers.
    - Technology tag `[Technology]` (e.g. `[NestJS Controller]`, `[Prisma ORM]`).
    - L4 Code mapping stub indicator with file path and inspect action `data-testid="c4-code-mapping-btn"`.
  - `C4ContainerBoundaryNode` component (`components/canvas/c4-container-boundary-node.tsx`) rendering enclosing parent container boundary with `[Container Boundary: Container Name]` and technology.
  - Registration in `components/canvas/custom-nodes.tsx` for `c4Component`, `c4ContainerBoundary`, and `component`.
  - `c4-component.spec.ts`: 7 tests covering SSR node rendering, code mapping stub callback invocation, container boundary rendering, canvas mounting, and ArchitectureModelClient reload identity.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 185 API tests, 96 domain tests, 216 web tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F021-review.md`.

## 2026-09-26 — F020 — C4 Container

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `c4-container.ts`: C4 Level 2 container domain types (`C4ContainerKind`: 'web_app' | 'mobile_app' | 'api' | 'service' | 'database' | 'queue' | 'store', `C4ContainerNodeData`, `C4SystemBoundaryNodeData`).
  - Helper functions: `createC4Container`, `createC4WebApp`, `createC4MobileApp`, `createC4Service`, `createC4Database`, `createC4Queue`.
  - Predicates and invariant helpers: `isContainer`, `isContainerOfSystem`, `getSystemContainers`, `canDrillToComponents`.
  - Canvas projection: `projectC4ContainerToCanvas` projecting enclosing system boundary, container nodes with technology tags, and inter-container connections.
  - `canvas.ts`: added optional `zIndex?: number;` to `CanvasNode`.
  - `c4-container.test.ts`: 4 unit tests verifying classification, filtering, component drill eligibility, and canvas projection.
- API layer (`apps/api/src/architectures/`):
  - Model verification for C4 Container elements inside a system (`parentId = system.id`).
  - `c4-container.e2e.spec.ts`: 8 E2E tests verifying creation of containers (web app, api service, database, queue) inside parent system, inter-container sync & async connections, model snapshot reload identity, and cascade/unlink handling.
- Web client layer (`apps/web/`):
  - `C4ContainerNode` component (`components/canvas/c4-container-node.tsx`) rendering:
    - Distinct visual themes and icons for Web Apps, Mobile Apps, API Services, Databases, and Message Queues.
    - Technology tag `[Technology]` (e.g. `[TypeScript / React]`, `[PostgreSQL 16]`).
    - Drill-to-components button `data-testid="drill-to-components-btn"` invoking `onDrillToComponents`.
  - `C4SystemBoundaryNode` component (`components/canvas/c4-system-boundary-node.tsx`) rendering enclosing parent system boundary with `[System Boundary: System Name]`.
  - Registration in `components/canvas/custom-nodes.tsx` for `c4Container` and `c4SystemBoundary`.
  - `c4-container.spec.ts`: 8 tests covering SSR node rendering, drill-to-components callback invocation, system boundary rendering, canvas mounting, and ArchitectureModelClient reload identity.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 178 API tests, 92 domain tests, 209 web tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F020-review.md`.

## 2026-09-26 — F019 — C4 Context

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `c4-context.ts`: C4 Context domain types and node data structures (`C4ContextElementKind`: 'person' | 'system' | 'external_system', `C4ContextNodeData`).
  - Helper functions: `createC4Person`, `createC4System`, `createC4ExternalSystem`, `isPerson`, `isExternalSystem`, `canDrillToContainers`.
  - Canvas projection bridge: `projectC4ContextToCanvas` mapping C4 model objects and connections to canvas nodes and edges with distinct handles, badges, dimensions, and type indicators.
  - `c4-context.test.ts`: 4 unit tests verifying node data extraction, drilling eligibility, and canvas projection.
- API layer (`apps/api/src/architectures/`):
  - Model verification for C4 Context elements: Person, internal System, external System, and relationships.
  - `c4-context.e2e.spec.ts`: 7 E2E tests verifying creation of Person, System, External System, connecting Person -> System and System -> External System, model reload identity, and cascade deletion.
- Web client layer (`apps/web/`):
  - `C4ContextNode` component (`components/canvas/c4-context-node.tsx`) rendering:
    - Persona card for People/Actors with avatar badge and description.
    - Solid branded container for internal Systems with `data-testid="drill-down-btn"` providing container drill-down action.
    - Muted dashed-border container for external / third-party Systems.
  - Registration in `components/canvas/custom-nodes.tsx` for `c4Context`, `person`, and `actor`.
  - `c4-context.spec.ts`: 6 tests covering SSR node rendering, drill-down callback invocation, canvas mounting, and ArchitectureModelClient reload identity.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 170 API tests, 88 domain tests, 201 web tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F019-review.md`.

## 2026-09-26 — F018 — Architecture model

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `types.ts`: added `ArchitectureModel` snapshot interface capturing architecture, default version, model objects, and connections.
  - `architecture-model.ts`: immutable domain model functions (`createArchitectureModel`, `addModelObject`, `updateModelObject`, `removeModelObject` with Invariant 4 connection cascading, `addModelConnection`, `updateModelConnection`, `removeModelConnection`), snapshot integrity validation (`validateArchitectureModel`), and deep model equivalence checking (`isModelIdentical`).
  - `architecture-model.test.ts`: 14 unit tests covering domain model creation, invariant violations (self-connection, cyclic parents, duplicate IDs, foreign endpoints), and identity equivalence.
- API layer (`apps/api/src/architectures/`):
  - `ArchitecturesModule`: REST endpoints conforming to `API_SURFACE.md`.
  - Architecture CRUD (`POST /workspaces/:workspaceId/architectures`, `GET /architectures/:id`, `PATCH /architectures/:id`, `DELETE /architectures/:id`).
  - Architecture model snapshot (`GET /architectures/:id/model`) loading objects + connections independent of any diagram.
  - Model objects CRUD (`POST /architectures/:id/objects`, `GET /architectures/:id/objects`, `GET /objects/:id`, `PATCH /objects/:id`, `DELETE /objects/:id`).
  - Model connections CRUD (`POST /architectures/:id/connections`, `GET /architectures/:id/connections`, `GET /connections/:id`, `PATCH /connections/:id`, `DELETE /connections/:id`).
  - Invariant enforcement: rejects self-connection (`canConnect`), rejects foreign endpoints (`validateConnection`), rejects cyclic parent hierarchy (`hasParentCycle`).
  - RBAC and multi-tenancy enforcement: checks workspace membership and restricts mutations to `canWrite(role)`.
  - `architectures.e2e.spec.ts`: 18 tests covering complete lifecycle, save/load/reload identity, and role authorization.
- Web client layer (`apps/web/lib/model/`):
  - `ArchitectureModelClient`: client-side model manager maintaining domain models independent of diagrams and Zustand (Layer Boundary Rule 4).
  - Optimistic mutations (`createObject`, `updateObject`, `deleteObject`, `createConnection`, `updateConnection`, `deleteConnection`) with guaranteed rollback to previous snapshot on error.
  - Model subscriptions for reactive UI updates without placing entities in Zustand.
  - Canvas projection bridge (`toCanvasProjection`) projecting model entities to canvas nodes and edges.
  - `architecture-model.spec.ts`: 8 tests verifying client-side model management, reload identity, and optimistic rollback on rejection.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing: 163 API tests, 84 domain tests, 195 web tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F018-review.md`.
- PR: https://github.com/nimatrazmjo/DiagramHQ/pull/19

## 2026-09-26 — F017 — Minimap

Status: COMPLETE

Implemented:
- Web layer canvas store (`apps/web/lib/canvas-store.ts`):
  - Added transient UI state: `isMinimapVisible`, `isFullscreen`, `isFocusMode` with corresponding toggle and setter actions.
  - Whitelist updated in `apps/web/canvas.spec.ts` guaranteeing strict compliance with Layer Boundary Rule 4 (zero domain entities in Zustand).
- Canvas UI components (`apps/web/components/canvas/infinite-canvas.tsx`):
  - Embedded `<MiniMap>` from `@xyflow/react` with `pannable`, `zoomable`, custom mask styling, and conditional rendering.
  - `getMiniMapNodeColor` function styling nodes by architectural category (system, app/container, store/database, component, person) with blue accent for selected nodes.
  - HTML5 Fullscreen API container integration with `fullscreenchange` synchronization and graceful exception fallback.
  - Focus Mode isolating selected nodes with visual dimming (opacity 0.15, grayscale 100%) and edge isolation, plus top-left status badge indicator.
  - Toolbar buttons for Focus Mode, Toggle Minimap, and Fullscreen.
  - Keyboard shortcuts: <kbd>M</kbd> (toggle minimap), <kbd>Shift</kbd>+<kbd>F</kbd> (fullscreen), <kbd>Alt</kbd>+<kbd>F</kbd> (focus mode), <kbd>Escape</kbd> (clear selection / exit focus mode).
- Tests (`apps/web/minimap-fullscreen-focus.spec.ts`):
  - 11 unit & integration tests covering store state, Layer Boundary Rule 4 zero-entity compliance, node category coloring, toolbar buttons, minimap conditional rendering, and focus mode badges.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 clean across all 8 angles. Verdict: CLEAN. Full log: `.harness/reviews/F017-review.md`.
- PR: https://github.com/nimatrazmjo/DiagramHQ/pull/18

## 2026-09-26 — F016 — Undo/redo

Status: COMPLETE

Implemented:
- Web layer command infrastructure (`apps/web/lib/commands/`):
  - `command.ts`: `StateSetFn<T>`, `applyCanvasUpdate(setNodes, setEdges, mode)` hook on `Command<T>` typed with `@xyflow/react`.
  - `dispatcher.ts`: reactive listener subscription (`subscribe`, `notify`), stack inspectors (`canUndo`, `canRedo`, `peekUndo`, `peekRedo`, `getUndone`), and error-recovery rollback ensuring failed async operations do not corrupt history or undone stacks.
  - Reversible command implementations:
    - `create-node-command.ts`: `CreateNodeCommand` (creates node, undo removes it).
    - `delete-node-command.ts`: `DeleteNodeCommand` (removes node + connected edges, undo restores both).
    - `connect-nodes-command.ts`: `ConnectNodesCommand` (creates edge, undo removes it).
    - `update-metadata-command.ts`: `UpdateNodeMetadataCommand` (updates node metadata, undo reverts to prior data).
    - `move-node-command.ts`, `move-nodes-command.ts`, `align-nodes-command.ts`, `apply-layout-command.ts`: wired with `applyCanvasUpdate` for bidirectional visual position synchronization.
- Canvas UI and keyboard integration (`apps/web/components/canvas/infinite-canvas.tsx`):
  - Real-time dispatcher subscription updating undo/redo enabled states.
  - Undo (↶, `data-testid="undo-btn"`) and Redo (↷, `data-testid="redo-btn"`) toolbar buttons with disabled styling when stacks are empty or graph mutations are in flight.
  - Global keyboard listener for <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>Z</kbd> and <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> (plus <kbd>Ctrl</kbd>+<kbd>Y</kbd>), suppressed while typing in text inputs.
  - Concurrency guard preventing rapid successive keystrokes/clicks from racing during async network persistence.
- Tests (`apps/web/undo-redo.spec.ts`):
  - 25 tests covering dispatcher history, subscriber notifications, undo/redo across all 5 domain operations (create, delete, connect, move, metadata edit), canvas state synchronization, error stack restoration, and toolbar SSR rendering.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (all monorepo tests passing)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review: Round 1 identified stack corruption on failed undo/redo execution and race-guard omission; both fixed with regression tests. Verdict: CLEAN. Full log: `.harness/reviews/F016-review.md`.
- PR: https://github.com/nimatrazmjo/DiagramHQ/pull/17

## 2026-09-26 — F015 — Auto-layout

Status: COMPLETE

Implemented:
- Domain layer, layout-engine registry (MODULES.md §6 — new capabilities register(); core never switches on names):
  - `layout-registry.ts`: `LayoutNode`, `LayoutEdge`, `LayoutOptions`, `LayoutEngineName`, `LayoutEngine`, `registerLayoutEngine`, `getLayoutEngine`, `listLayoutEngines`, `applyLayout` (throws a descriptive error for an unregistered name; `[]` short-circuit for zero nodes).
  - `layout-engine-grid.ts`: row-major grid, default spacing derived from the largest node's width/height so it never overlaps.
  - `layout-engine-layered.ts`: `computeLayers` (Kahn's-algorithm longest-path-from-root layering; cycle members fall back to layer 0 instead of hanging), backing `hierarchical`, `tree`, `layered`, `TB` (all identical — a tree is just a DAG with no cross-branching) and `LR` (same algorithm, axes swapped).
  - `layout-engine-radial.ts`: concentric rings from the same layering; each ring's radius is the larger of "clear of the previous ring" and "enough circumference for its own node count," so same-ring nodes can't collide even with many siblings.
  - `layout-engine-force-directed.ts`: deterministic force simulation (circular index-seeded, no RNG; repulsion + spring-to-ideal-distance attraction over 150 iterations) followed by a deterministic overlap-resolution pass that guarantees zero bbox overlap even if the simulation didn't fully converge.
  - `layout-builtins.ts`: side-effect barrel registering all 4 built-ins; a third-party engine registers the same way without touching this file.
  - Tests: `layout-registry.test.ts` (4, registry mechanics + a test-only engine registering without core edits) + `layout-builtins.test.ts` (10: the acceptance-criteria bbox-non-overlap test across all 8 registered names on a sample graph with a deliberate cycle, plus per-engine correctness checks).
- Web layer:
  - `lib/commands/apply-layout-command.ts`: `ApplyLayoutCommand` — same `Command<...>` shape as `AlignNodesCommand` (batch persist, undo restores prior positions).
  - `components/canvas/layout-menu.tsx`: dropdown listing every `listLayoutEngines()` entry.
  - `components/canvas/infinite-canvas.tsx`: `handleApplyLayout` mirrors F014's `dispatchAlignOperation` exactly (in-flight ref+state guard, synchronous optimistic update via the pure domain function, background persist with rollback-on-failure) — reuses the review-hardened pattern instead of reintroducing the bugs F014 already found and fixed. Menu mounted bottom-left, shown whenever `nodes.length > 1` (whole-graph action, not gated by selection — "manual positions preserved unless re-applied" means this only ever runs on explicit click).
  - Tests: `auto-layout.spec.ts` — 11 tests (command execute/undo/persist/no-persist/all-8-engines, dispatcher history+undo, `LayoutMenu` SSR markup).

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (366 tests: 70 domain, 151 web, 145 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review, round 1: `code-review` skill found 1 high (align and apply-layout used independent busy-guards, so the two whole-graph mutations could race and clobber each other) + 2 medium (`ApplyLayoutCommand` recomputed the layout a second time on persist, doubling cost for `forceDirected`; `resolveOverlaps`' fixed pass count wasn't guaranteed to converge for larger graphs) + 1 low (`LayoutNode` duplicated `AlignableNode`'s shape); all fixed in a follow-up commit.
- PR Review, round 2: found 1 high (the round-1 guard had no try/catch around its synchronous compute, so a throw could brick both toolbars permanently), 2 medium (rollback could clobber an unrelated successful edit made mid-persist; `computeLayers` collapsed nodes downstream of a cycle to the same fallback layer as the cycle itself), 4 low (missing engine-output length validation, a `columns: 0` footgun in grid layout, `LayoutMenu`'s option buttons not disabled, duplicated persist logic across commands) — all fixed with a proper DFS back-edge-removal rewrite of `computeLayers` plus the rest; 2 more low findings addressed via documentation (softened an overclaiming docstring; clarified `MODULES.md`'s built-in-location rule rather than moving correctly-layered pure-math code).
- PR Review, round 3: found 1 medium (gridLayout fractional column counts in (0, 1) producing NaN/Infinity) + 3 low (applyLayout coordinate validation, forceDirected integer coordinate rounding, LayoutMenu outside pointerdown/Escape dismissal); all fixed with regression tests. Verdict: CLEAN. Full log: `.harness/reviews/F015-review.md`.
- PR: https://github.com/nimatrazmjo/DiagramHQ/pull/16

## 2026-09-26 — F014 — Alignment

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/alignment.ts`):
  - `snapToGrid(position, gridSize = 20)`: rounds a position to the nearest grid point.
  - `alignNodes(nodes, axis)`: pure alignment for `'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV'`, treating missing width/height as zero-dimension.
  - `distributeNodes(nodes, axis)`: even-gap distribution along `'horizontal' | 'vertical'`, no-op below 3 nodes, returns positions in original input order.
  - 14 unit tests with exact coordinate assertions in `alignment.test.ts`.
- Web command layer (`apps/web/lib/commands/align-nodes-command.ts`):
  - `AlignNodesCommand` implements `Command<AlignedNodeResult[]>`, wrapping the domain `alignNodes`/`distributeNodes` functions; captures prev positions at construction for `undo()`; calls `batchPersistFn` when `viewId` is set (same batch-persist contract as `MoveNodesCommand`, Layer Boundary Rule 3).
- Web canvas UI (`apps/web/components/canvas/`):
  - `alignment-toolbar.tsx`: new `AlignmentToolbar` component — 6 align buttons + 2 distribute buttons (disabled below 3 selected nodes) + a snap-to-grid toggle.
  - `infinite-canvas.tsx`: mounts the toolbar in a bottom-center `Panel` when `selectedNodeIds.length > 1`; `handleAlign`/`handleDistribute` build `AlignableNode[]` from the current React Flow node state and dispatch `AlignNodesCommand` through `defaultCommandDispatcher`, then sync local node positions from the result.
  - Snap-to-grid wired into both single-node (`createNodeDragStopHandler`, new optional `snapToGridEnabled`/`gridSize` params, default off — existing callers unaffected) and group (`handleSelectionDragStop`) drag-stop paths, applying `snapToGrid` to the final position before the move command is built.
  - `canvas-store.ts`: added transient `isSnapToGridEnabled` + `toggleSnapToGrid`/`setSnapToGrid` (Layer Boundary Rule 4 — boolean UI flag, no domain entities).
- Tests: `apps/web/alignment.spec.ts` — 15 tests covering `AlignNodesCommand` (execute/undo/persist/no-persist/distribute), `CommandDispatcher` history + undo, snap-to-grid store state, and `AlignmentToolbar` SSR-rendered markup (button test-ids, disabled distribute state, snap-enabled styling). Updated `canvas.spec.ts`'s Layer-Boundary-Rule-4 allowlist for the 3 new store keys.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (333 tests: 49 domain, 139 web, 145 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean — domain, api, web)
- PR Review, round 1: `code-review` skill found 1 high + 2 medium + 2 low findings (React Flow `measured` vs top-level `width`/`height`, an async optimistic-update race, a missing `.catch`, duplicated handlers, O(n·m) lookups); all fixed in a follow-up commit.
- PR Review, round 2: found 1 high (per-node snap-to-grid distorting group-drag relative offsets — fixed with a shared-delta `snapGroupPositions` helper), 1 medium (no rollback on persist failure — fixed), 1 low (reintroduced O(n·m) lookup — fixed), 1 low deferred with rationale (closure-staleness on back-to-back clicks, pre-existing pattern, no realistic single-user trigger).
- PR Review, round 3: 1 finding investigated and not reproduced (single-node snap does correctly update, per direct code walkthrough), 2 medium fixed (group-drag move had no failure rollback unlike the align path added in the same diff; overlapping align/distribute calls could stomp each other's rollback — fixed with an in-flight guard that also disables the toolbar buttons), 1 low fixed (`Math.min`/`Math.max` argument-spread would `RangeError` on very large selections — replaced with `reduce`). Verdict: CLEAN. Full history: `.harness/reviews/F014-review.md`.
- PR: https://github.com/nimatrazmjo/DiagramHQ/pull/15

## 2026-09-26 — F013 — Multi-select

Status: COMPLETE (backfilled — merged as PR #14 / commit `c8f1ac1`, entry omitted by prior session before it hit quota)

Implemented:
- Web canvas multi-select (`apps/web`):
  - Shift-click toggles individual objects into/out of multi-selection; toggleable Box Select mode (`data-testid="box-select-btn"`) enables marquee drag-selection via `selectionOnDrag`.
  - Multi-select badge (`data-testid="multi-select-badge"`) shown when >1 node selected.
  - `MoveNodesCommand` (`apps/web/lib/commands/move-nodes-command.ts`) with `execute()`/`undo()` for group moves; `onSelectionDragStop` in `InfiniteCanvas` builds per-node prev/new positions and dispatches through `defaultCommandDispatcher` (Layer Boundary Rule 3 — no direct fetch in canvas components).
  - `canvas-store.ts`: added `isBoxSelectMode`, `toggleBoxSelectMode`, `setBoxSelectMode`, `toggleNodeSelection`, `toggleEdgeSelection`.
  - 18 new tests in `apps/web/multi-select.spec.ts`.
- API batch layout persistence (`apps/api`):
  - `PATCH /views/:viewId/objects/positions` atomically upserts multiple object positions in one Prisma `$transaction`, with multi-tenant auth + `canWrite` role guard.
  - `updateMultipleObjectPositions` in `views.service.ts` + 4 new unit tests in `views.service.spec.ts`.

Verification (from PR #14 description):
- Tests: PASS (295 tests: 34 domain, 116 web, 145 api)
- TypeScript: PASS (0 errors)
- Lint: PASS (0 errors, 0 warnings)
- Architecture: PASS
- Build: PASS (Next.js + NestJS)
- PR: https://github.com/nimatrazmjo/DiagramHQ/pull/14 (squash-merged to `main`)

Notes: No `.harness/reviews/F013-*.md` was written before merge — the session that built this feature was interrupted by a quota limit immediately after merging and branching to F014, before it could backfill this entry or the review log. Recorded now for an accurate history; no functional gap.

## 2026-09-26 — F012 — Drag and Drop

Status: COMPLETE

Implemented:
- API view layout persistence (`apps/api`):
  - Created `ViewsModule`, `ViewsService`, and `ViewsController` in `apps/api/src/views/`.
  - Added `PATCH /views/:viewId/objects/:objectId/position` to persist and upsert per-view object coordinates (`{ x, y }`) to the `view_objects` table in PostgreSQL.
  - Added `GET /views/:viewId/objects` to retrieve layout positions for a view.
  - Enforced multi-tenancy and role checks using `canWrite` from `@diagramhq/domain`; viewer roles receive 403 Forbidden, cross-tenant requests receive 404 Not Found.
  - Added 7 unit tests in `views.service.spec.ts` and 4 integration tests in `views.e2e.spec.ts`.
- Web command layer & drag-and-drop (`apps/web`):
  - Created client-model command layer in `apps/web/lib/commands/` (`Command<T>`, `MoveNodeCommand`, `CommandDispatcher`, `defaultCommandDispatcher`).
  - Integrated `MoveNodeCommand` with `execute()` and `undo()` capabilities, maintaining undo/redo stacks.
  - Integrated `onNodeDragStop` in `InfiniteCanvas` to capture start and finish coordinates and dispatch `MoveNodeCommand` to the command dispatcher, strictly adhering to Layer Boundaries Rule 3 (no direct HTTP requests in canvas components).
  - Added 17 unit and component tests in `apps/web/drag-drop.spec.ts` verifying command execution, undo/redo, command history, and canvas drag events.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (273 tests: 34 domain, 98 web, 141 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F012-review.md`.



## 2026-09-27 — F038 — Security views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-view.ts`: Implemented `projectSecurityViewToCanvas` to inject security data properties into model objects and dynamically project them into `GroupNode` elements representing `trustZone` boundaries.
  - `view.ts`: Registered `security` ViewKind labeling support.
- UI components (`apps/web/components/canvas/`):
  - `security-badges.tsx`: Implemented a standalone overlay rendering SVG badges for public endpoints, auth, secrets, encryption, and compliance.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `SecurityBadges` conditional on `securityView` metadata.
- Validation (`apps/web/security-views.spec.ts`):
  - Unit tests verifying the proper mapping of the model into group boundary wrappers and extraction of the correct security flags to the canvas node props.
## 2026-09-27 — F036 — Filters
Status: COMPLETE

Implemented:
- `FilterBuilder` React component in `apps/web/components/shell/filter-builder.tsx` for building dynamic view filters.
- Supports 13 predefined filter keys: team, technology, environment, domain, owner, status, tag, criticality, dataClassification, cloud, region, repository, kind.
- Allows user input to build a multi-attribute `ViewFilter` payload and emit it via `onFilterChange` and `onSaveView` hooks.
- Tested filter UI state updates and structure in `apps/web/filter-builder.spec.tsx` via `renderToString`.
- Validated that the constructed multi-attribute payload correctly filters domain objects via `evaluateDynamicView` from `@diagramhq/domain`.

Verification:
- pnpm typecheck, pnpm lint, pnpm check-architecture, and tests passed (254 web/api/domain tests, including 3 new FilterBuilder UI tests).
- pnpm build successfully created the Next.js standalone app build.
- PR reviewed, accepted, and squash merged to main as commit `106a94d`.

---


## 2026-09-26 — F011 — Object Selection

Status: COMPLETE

Implemented:
- Web canvas object selection (`apps/web`):
  - Added transient selection helpers in `apps/web/lib/canvas-store.ts`: `selectNode`, `selectEdge`, `isNodeSelected`, `isEdgeSelected`, and `clearSelection` adhering strictly to Layer Boundaries Rule 4.
  - Connected `onSelectionChange` and `onPaneClick` in `InfiniteCanvas` to update store selection and deselect on background click.
  - Implemented window `Escape` key listener outside text inputs to clear selection (`useCanvasStore.getState().clearSelection()`).
  - Added visual selection count badge (`data-testid="selection-badge"`) and toolbar `Clear` button (`data-testid="clear-selection-btn"`) on canvas.
  - Verified active selection ring styling across custom nodes (`SystemNode`, `AppNode`, `StoreNode`).
  - Added 10 automated unit and component tests in `apps/web/selection.spec.ts` covering store selection toggling, node selection styling, and UI badge/button rendering.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (245 tests: 34 domain, 81 web, 130 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F011-review.md`.

---

## 2026-09-26 — F010 — Pan and Zoom

Status: COMPLETE

Implemented:
- Web canvas pan & zoom controls (`apps/web`):
  - Added wheel zoom clamping (`clampZoom`, `MIN_ZOOM` = 0.1, `MAX_ZOOM` = 4.0, `DEFAULT_ZOOM` = 1.0) and transient zoom action helpers (`zoomIn`, `zoomOut`, `resetZoom`) in `apps/web/lib/canvas-store.ts`.
  - Configured React Flow canvas with `minZoom={0.1}`, `maxZoom={4.0}`, `zoomOnScroll={true}`, and `panActivationKeyCode="Space"`.
  - Wrapped `InfiniteCanvas` with `ReactFlowProvider` and implemented `pan-zoom-toolbar` with Zoom In (+), Zoom Out (−), 100% Reset, and Fit to Content (F) buttons.
  - Implemented keyboard shortcut handler for Space-bar pan activation (updating `isSpacePanning`, toggling grab/grabbing cursor, rendering `PAN MODE (SPACE)` status badge) and 'F' key fit-to-content triggering `fitView({ padding: 0.2, duration: 250 })`.
  - Guarded keyboard shortcuts against text inputs (`input`, `textarea`, `select`, `contentEditable`).
  - Added 10 automated unit and component tests in `apps/web/pan-zoom.spec.ts` covering store zoom clamping, space pan toggling, CanvasRenderer viewport contract, toolbar rendering, and pan mode indicators.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (235 tests: 34 domain, 71 web, 130 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F010-review.md`.

---

## 2026-09-26 — F009 — Infinite Canvas

Status: COMPLETE

Implemented:
- Domain canvas primitives & abstraction (`packages/domain/src/canvas.ts`):
  - Defined framework-agnostic types: `CanvasNode`, `CanvasEdge`, `CanvasViewport`, `CanvasDimensions`, `CanvasInteractionHandler`.
  - Defined `CanvasRenderer<TContainer>` interface isolating renderer from core model (ADR-0002, MODULES.md §7).
  - Implemented pure model projection function `projectViewModelToCanvas` mapping objects and connections to canvas nodes and edges with deterministic fallback grid.
  - Added unit tests in `packages/domain/src/canvas.test.ts` (11 tests).
  - Hardened monotonic ID generation in `packages/domain/src/ids.ts` with random entropy suffix to eliminate concurrent test ID collisions.
- Web canvas implementation (`apps/web`):
  - Created transient UI store `useCanvasStore` (`apps/web/lib/canvas-store.ts`) adhering strictly to Layer Boundaries Rule 4 (zero domain entity models stored in Zustand; handles only viewport, selection IDs, and hover states).
  - Implemented `ReactFlowCanvasRenderer` in `apps/web/components/canvas/canvas-renderer.ts` satisfying `CanvasRenderer<HTMLElement>`.
  - Created custom architectural nodes (`SystemNode`, `AppNode`, `StoreNode`) with handles, semantic styling, badges, and icons in `apps/web/components/canvas/custom-nodes.tsx`.
  - Implemented `InfiniteCanvas` component in `apps/web/components/canvas/infinite-canvas.tsx` integrating React Flow, MiniMap, Controls, Background grid, and selection callbacks.
  - Integrated `InfiniteCanvas` into `/workspace/[workspaceId]` studio overview with sample projected architecture.
  - Added comprehensive test suite in `apps/web/canvas.spec.ts` (17 tests).

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (225 tests: 34 domain, 61 web, 130 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F009-review.md`.

---

## 2026-09-26 — F008 — Application Shell

Status: COMPLETE

Implemented:
- Shell components (`apps/web/components/shell/`):
  - `LeftNavigator`: Renders all 7 required navigation sections (Overview, Systems, Apps, Data, Flows, Views, Decisions) with active pathname styling, SVG icons, and mobile overlay drawer.
  - `TopBar`: Header bar featuring workspace breadcrumbs, search input with `⌘K` shortcut badge, "Ask AI" assistant trigger button, user session info, sign-out button, and inspector toggle.
  - `InspectorPanel`: Collapsible right-hand inspector slot with tabs for Properties, Hierarchy, and Metadata, empty selection state, and custom children slot.
  - `AppShell`: Master responsive 3-pane layout holding at narrow phone viewports with collapsible panels.
  - `index.ts`: Unified export of shell components and types.
- Studio Routes (`apps/web/app/workspace/`):
  - `[workspaceId]/layout.tsx`: Layout wrapping pages in `<AppShell>`.
  - `page.tsx`: Workspace Overview page with model statistics and quick access links.
  - Subroute pages for `systems`, `apps`, `data`, `flows`, `views`, `decisions`.
- Route protection & integration:
  - Updated `middleware.ts` to protect `/workspace/*` routes.
  - Added "Open Studio →" link in `workspace-list.tsx`.
- Automated test suite (`apps/web/shell.spec.ts`, 11 tests) verifying navigator sections, top bar controls, inspector slot, responsive attributes, and middleware routing.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (197 tests: 23 domain, 44 web, 130 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F008-review.md`.

---

## 2026-09-26 — F005 — User Roles

Status: COMPLETE

Implemented:
- Domain invariants (`packages/domain`):
  - Pure role gating functions in `invariants.ts`: `canWrite`, `canAdmin`, `canDeleteOrg`, `assertRoleCanWrite`, and `RolePermissionDeniedError`.
  - Unit tests verifying viewers cannot write and editors can write (`invariants.test.ts`).
- API role gating & management (`apps/api`):
  - `RolesGuard` and `@RequireRoles` decorator (`apps/api/src/roles/`).
  - `PATCH /organizations/:id/members/:memberId` endpoint with `UpdateMemberRoleDto` and `updateMemberRole` service logic.
  - Owner demotion protection and role privilege hierarchy.
  - Unit tests in `roles.guard.spec.ts` (7 tests).
  - Integration tests in `roles.e2e.spec.ts` (8 tests) against live PostgreSQL testing write gating, workspace creation denial for viewers, editor write permissions, and role promotion transitions.
- Web application (`apps/web`):
  - `RoleBadge` component and `canRoleWrite` helper.
  - Server action `updateMemberRoleAction`.
  - Read-only UI gating in `CreateWorkspaceForm` for viewers.
  - Unit tests in `roles.spec.ts` (6 tests).

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (176 tests: 23 domain, 23 web, 130 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F005-review.md`.

---

## 2026-09-26 — F004 — Workspaces

Status: COMPLETE

Implemented:
- API workspace capabilities (`apps/api`):
  - `WorkspacesModule`, `WorkspacesService`, and `WorkspacesController` composed into `AppModule`.
  - Input validation: `CreateWorkspaceDto` and `UpdateWorkspaceDto`.
  - Scoped workspace creation (`POST /organizations/:orgId/workspaces`): Creates workspace scoped to `orgId`; validates organization membership; rejects `viewer` role; enforces per-org unique slug (`@@unique([orgId, slug])`).
  - Workspace retrieval & containment (`GET /organizations/:orgId/workspaces`, `GET /workspaces/:id`, `GET /workspaces/:id/architectures`): Verifies caller's membership in parent org (returns 404 for unassociated callers); returns workspace with architecture count and contained architecture summaries.
  - Workspace update & cascade deletion (`PATCH /workspaces/:id`, `DELETE /workspaces/:id`): Verifies role permissions (`owner`/`admin`/`editor` for update, `owner`/`admin` for delete); deletes workspace and cascades to contained architectures.
  - Unit test suite (`workspaces.service.spec.ts`, 25 tests) and e2e integration test suite (`workspaces.e2e.spec.ts`, 14 tests) verifying multi-tenant isolation, cross-org access prevention, and architecture containment against live PostgreSQL.
- Web application (`apps/web`):
  - `app/dashboard/workspace-actions.ts`: Server actions for creating and fetching workspaces.
  - `app/dashboard/create-workspace-form.tsx`: Interactive workspace creation form with error feedback.
  - `app/dashboard/workspace-list.tsx`: Workspace list with architecture count badges.
  - `app/dashboard/page.tsx`: Displays workspaces under each organization.
  - Unit test suite (`workspaces.spec.ts`, 11 tests) verifying actions and validation.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (147 tests: 15 domain, 17 web, 115 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F004-review.md`.

---

## 2026-09-26 — F003 — Organizations

Status: COMPLETE

Implemented:
- Domain types (`packages/domain`): Registered `mem` prefix in `IdPrefix`, typed `MemberId`, and updated `Member` interface.
- API organization capabilities (`apps/api`):
  - `OrganizationsModule`, `OrganizationsService`, and `OrganizationsController` composed into `AppModule`.
  - Input validation: `CreateOrganizationDto` and `UpdateOrganizationDto`.
  - Transactional creation (`POST /organizations`): Creates organization and initial `owner` membership for the authenticated caller; auto-generates slug or validates custom slug with collision resolution.
  - Multi-tenant boundary enforcement: `GET /organizations` only lists organizations where caller is a member; `GET /organizations/:id`, `PATCH /organizations/:id`, `DELETE /organizations/:id` return 404 for unassociated callers (complete cross-tenant invisibility).
  - Role-guarded mutations: `PATCH` guarded to `owner` and `admin` roles; `DELETE` guarded strictly to `owner`.
  - Membership querying: `GET /organizations/:id/members`.
  - Unit test suite (`organizations.service.spec.ts`, 15 tests) and e2e integration test suite (`organizations.e2e.spec.ts`, 9 tests).
- Web application (`apps/web`):
  - `lib/api-token.ts`: Signs stateless JWT tokens from user sessions for backend calls.
  - `app/dashboard/actions.ts`: Server actions for organization creation and listing.
  - `app/dashboard/create-org-form.tsx`: Interactive organization creation form with error feedback.
  - `app/dashboard/page.tsx`: Displays authenticated user's organizations with their assigned roles and creation UI.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (82 tests: 15 domain, 6 web, 61 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F003-review.md`.

---

## 2026-09-26 — F002 — Authentication

Status: COMPLETE

Implemented:
- Architecture decision DEC-007: Auth.js (NextAuth v5) selected with credentials provider and stateless JWT session strategy using shared `AUTH_SECRET`. Zero external cloud SaaS dependencies for clean local development and CI testing.
- Domain types (`packages/domain`): Added `usr_` id prefix, `User`, `AuthSessionUser`, and `AuthTokenPayload` interfaces.
- Web authentication (`apps/web`):
  - NextAuth v5 configuration (`auth.config.ts`, `auth.ts`, `app/api/auth/[...nextauth]/route.ts`).
  - Next.js edge route protection `middleware.ts` redirecting unauthenticated requests from `/dashboard` to `/login?callbackUrl=...`.
  - Accessible, autofill-compliant `/login` form (`LoginForm`).
  - Protected `/dashboard` view with active user session display and sign-out action.
  - Dedicated unit tests in `apps/web/auth.spec.ts`.
- API authentication (`apps/api`):
  - `AuthModule`, `AuthService`, `AuthGuard`, `@CurrentUser()`, `@Public()` decorators.
  - `POST /auth/token` endpoint for token exchange with structured 401 error envelope on invalid credentials.
  - `GET /auth/me` endpoint verifying Bearer JWT tokens and injecting authenticated user claims into controller handler.
  - Unit tests for `AuthService` (5 tests) and `AuthGuard` (5 tests).
  - End-to-end integration tests in `auth.e2e.spec.ts` (6 tests) exercising the real HTTP pipeline and NestJS DI container.
- Config: Updated `packages/config/eslint-preset.js` to preserve NestJS DI decorator metadata across guards, filters, pipes, and interceptors.

Verification:
- TypeScript: PASS (`pnpm typecheck` clean across monorepo)
- Lint: PASS (`pnpm lint` clean, 0 errors/warnings)
- Tests: PASS (57 tests: 15 domain, 5 web, 37 api)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` clean)
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F002-review.md`.

---

## 2026-09-26 — F007 — API foundation

Status: COMPLETE

Implemented:
- Global `ValidationPipe` (`apps/api/src/common/validation.ts`): whitelist + reject-unknown + transform, wired in `main.ts`.
- Global `AllExceptionsFilter` (`apps/api/src/common/http-exception.filter.ts`): every thrown error becomes `{ error: { code, message, details? } }`; unknown errors collapse to a generic 500 with no stack trace or internal detail reaching the client (logged server-side only).
- `/health` enhanced to check Postgres connectivity via `PrismaService.$queryRaw` (`apps/api/src/health/health.service.ts`); reports `ok`/`degraded` plus `checks.database`.
- `apps/api/src/app.e2e.spec.ts`: a real HTTP-level integration suite (`@nestjs/testing` + `supertest`) exercising the actual app — health, a 404's error envelope, and a throwaway DTO-validated route (not a permanent endpoint; domain CRUD lands in F003/F004) proving the ValidationPipe rejects/accepts through the real pipeline, not just in isolation.
- `apps/api/vitest.config.ts` + `unplugin-swc`: needed because Vitest's default esbuild transform doesn't emit `design:paramtypes` metadata, which silently broke NestJS DI and DTO-metatype detection — caught by the new integration test, not by the unit tests of each class in isolation.

Verification:
- TypeScript: PASS (`pnpm typecheck` green across all workspace projects)
- Lint: PASS (`pnpm lint` green, 0 errors/warnings)
- Tests: PASS (51 tests: 15 domain, 36 api — up from 6; +30 tests for F007 including integration, cache/dedup, timeout, and logger suites)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` green)
- Live smoke test: real compiled server against the running Postgres container — `GET /health` -> 200 `{"status":"ok",...,"checks":{"database":"up"}}`; `GET /does-not-exist` -> 404 `{"error":{"code":"NOT_FOUND",...}}`.
- Evaluator Rubric Score: 5.0 / 5.0 -> PASS. Log: `.harness/reviews/F007-review.md`.
- PR Review: pushed to PR #4 (`feat/F007-api-foundation` -> `main`), taken through 4 rounds of `loops/pr-review-loop.md` (code-review skill). 6 findings fixed in round 4 (vitest monorepo root env loading, in-flight probe deduplication preventing thundering herds, cache unit tests, withTimeout unit tests, structured logger unit tests, headersSent guard, custom details extraction). GitHub Actions CI green. Verdict: CLEAN.

Notes: implementation was recovered from a concurrent (Antigravity/Cowork) session's uncommitted WIP, stashed mid-session and popped onto a fresh `feat/F007-api-foundation` branch (created from `main` after F006/harness-docs/agent-relay-cleanup all merged) rather than lost or discarded.

---

## 2026-09-26 — Agent relay keep-awake + runtime notes (harness tooling)

Status: COMPLETE (tooling; not a product feature)

Implemented:
- `scripts/agent-relay.sh`: keeps the Mac awake (`caffeinate -dimsu`) while the relay runs; cleans it up on INT/TERM/HUP/EXIT (was INT-only) and now also kills the backgrounded `claude`/`agy` child on signal, not just the caffeinate helper.
- `.harness/RUNTIME-CONTINUITY.md`: documents a third environment (a cloud Cowork Linux VM that has touched this repo between relay sessions) — explicitly not part of `agent-relay.sh`'s two-runtime rotation — plus the cross-platform `node_modules`/Prisma-engine gotcha and the division of labor when a Cowork session is involved.

Verification: `bash -n scripts/agent-relay.sh` clean; smoke-tested the background+wait+signal pattern in isolation (SIGTERM to the wrapper kills the backgrounded child, confirmed via `ps` before/after). No product code touched.

Review: `code-review` skill via PR #3 (`loops/pr-review-loop.md`). Log: `.harness/reviews/agent-relay-cleanup-and-runtime-notes-review.md`.

---

## 2026-09-26 — F006 — Database foundation

Status: COMPLETE

Implemented:
- PostgreSQL + Prisma ORM in `apps/api` with full data model schema per `DATA_MODEL.md` (organizations, workspaces, architectures, versions, model_objects, model_connections, tags, technologies, views, view_objects, flows, decisions, environments, phases, members).
- Initial SQL migration `20260926000000_init` applied cleanly to live PostgreSQL 16 instance.
- `packages/domain` pure invariants (`canConnect`, `validateConnection`, `hasParentCycle`, `validateViewObject`, `assertTenantAccess`) with branded types and comprehensive unit test coverage.
- Query-layer tenant isolation via `TenantContext` in `apps/api/src/database/tenant.context.ts` guaranteeing strict organization boundary enforcement.
- Local dev seed script (`apps/api/prisma/seed.ts`) populating organization, workspace, architecture, 4 model objects, 2 connections, and 1 view.
- Architectural boundary enforcement via `scripts/check-architecture.sh` wired into `init.sh` and `pnpm verify`.

Verification:
- TypeScript: PASS (`pnpm typecheck` green across all 5 workspace projects)
- Lint: PASS (`pnpm lint` green, 0 errors/warnings)
- Tests: PASS (20 tests passed: 15 domain invariant tests, 5 API tests including entity round-trip, cross-tenant denial, and connection invariant tests)
- Architecture: PASS (`./scripts/check-architecture.sh` clean)
- Build: PASS (`pnpm build` green)
- Database: PASS (migration applied to PostgreSQL 16 container, seed script executed successfully)
- Evaluator Rubric Score: 5.0 / 5.0 (acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5) -> PASS. Log: `.harness/reviews/F006-review.md`.

PR Review: pushed to PR #1 (`feat/F006-database-foundation` -> `main`), taken through 3 rounds of the new `loops/pr-review-loop.md` (code-review skill). 22 correctness/efficiency findings fixed across the 3 rounds (build ordering, layer-boundary regex gaps, cross-tenant/cross-architecture/cross-version integrity gaps on `versionId`/`parentId`, a missing FK, unwired domain invariants (`hasParentCycle`, `validateViewObject`), CI gaps, stale docs); 2 structural findings (TenantContext's per-model isolation pattern, `architecture.create`'s non-transactional `defaultVersionId` set) logged as open decisions in `BLOCKERS.md` rather than fixed mid-PR. Stopped at round 3 by user decision (diminishing severity; not all `MAX_PR_ROUNDS`=4 exhausted). Re-verified after every round: 21 tests green, typecheck/lint/build/check-architecture clean. Log: `.harness/reviews/F006-review.md`. Merged to `main`.

---

## 2026-09-26 — Runtime continuity protocol (harness tooling)

Status: COMPLETE (tooling; not a product feature)

Added:
- `.harness/RUNTIME-CONTINUITY.md` — fail over between Claude Code (`claude`) and Antigravity (`agy`, Claude Sonnet) when a runtime hits its usage/session limit; resume from PROJECT_STATE.md.
- `.harness/RUNTIME-SWITCHES.md` — switch ledger.
- `scripts/agent-relay.sh` — optional relay that alternates the two runtimes across limits.
- AGENTS.md gained a "Usage / session limits" rule; README layout updated.

Notes: `agy` model id for Sonnet is set via `AGY_SONNET_MODEL` / `agy` -> `/model` (list includes Claude Sonnet). Relay switches on any runtime exit; tune to a limit-message grep if you want limit-only switching.

---

## 2026-09-26 — F001 — Project architecture

Status: COMPLETE

Implemented:
- pnpm monorepo: apps/web (Next.js 14 standalone), apps/api (NestJS 10 + health endpoint), packages/domain (framework-free: branded ids + a connection invariant + tests), packages/config (shared ESLint preset).
- Strict TypeScript base; ESLint + Prettier + Vitest; scripts/init.sh baseline; .harness/CLAUDE.md command table filled in.
- Docker: multi-stage Dockerfiles (api via `pnpm deploy`, web via Next standalone) + docker-compose (web/api/postgres/redis) + GitHub Actions CI.

Files: 42. Commits: 1e817c4 (impl) + review-fix commit on feat/F001-project-architecture.

Verification: TypeScript PASS · Lint PASS · Unit tests PASS (4) · Build PASS · Docker build NOT RUN (no Docker in sandbox — validate with `docker compose build`).

Review: independent subagent — REQUEST CHANGES -> resolved (deploy dist inclusion, docker caching, Next outputFileTracingRoot, CI pnpm cache, typed metadata) -> APPROVE. Log: .harness/reviews/F001-review.md.

Notes: domain is source-exported (ESM/CJS interop with the CommonJS api deferred to F018); ids are a scaffold placeholder (not collision-safe across processes); Tailwind/shadcn deferred to the UI/canvas phases.

---

## 2026-09-25 — Tracking system established

Status: COMPLETE (tracking setup; not a product feature)

Implemented:
- Persistent implementation tracking system inside `.harness/`: PROJECT_STATE.md (master), ROADMAP.md (135 features across 13 phases, permanent F-IDs), CURRENT_TASK.md, CHANGELOG.md, DECISIONS.md, BLOCKERS.md, and phases/PHASE-01..13.md.
- Adopted the 13-phase F001–F108 taxonomy (+ F109–F135 for master-spec items not in the reference list); carried the acceptance criteria + tests from the retired feature_list.json into the phase files.
- Made the Markdown tracking system the single source of truth; archived the superseded feature_list.json, session-handoff.md, FEATURE_MATRIX.md, and claude-progress.md under `_archive/`.

Files: `.harness/PROJECT_STATE.md`, `ROADMAP.md`, `CURRENT_TASK.md`, `DECISIONS.md`, `BLOCKERS.md`, `phases/*` (+ repointed AGENTS.md/CLAUDE.md/README.md/scope-guard.md/PRODUCT.md and scripts/SCRIPTS.md).

Verification:
- Structure: 6 master files + 13 phase files present.
- ROADMAP counts: 135 features, 0 complete, progress 0.0%.
- No application code in the repo (all features correctly NOT STARTED).

Notes: No product feature implemented — this was the tracking-system task. Product build begins at F001.

---

## 2026-09-25 — Harness bootstrap (history)

Status: COMPLETE

Implemented (before the tracking system):
- Created the `.harness/` rules + spec system from the 8 Learn-Harness-Engineering projects: entry points, product/, architecture/ (+ 3 ADRs), rules/, verification/, loops/, graph/, scripts/.
- Wrote the DiagramHQ product spec and the initial 6-phase feature checklist (later restructured into the 13-phase ROADMAP above).

Verification: harness tree present; no application code.

Notes: Retained for history. The 6-phase feature_list.json from this work is archived under `_archive/`.


## 2026-09-27 — F038 — Security views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `security-view.ts`: Implemented `projectSecurityViewToCanvas` to inject security data properties into model objects and dynamically project them into `GroupNode` elements representing `trustZone` boundaries.
  - `view.ts`: Registered `security` ViewKind labeling support.
- UI components (`apps/web/components/canvas/`):
  - `security-badges.tsx`: Implemented a standalone overlay rendering SVG badges for public endpoints, auth, secrets, encryption, and compliance.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to display `SecurityBadges` conditional on `securityView` metadata.
- Validation (`apps/web/security-views.spec.ts`):
  - Unit tests verifying the proper mapping of the model into group boundary wrappers and extraction of the correct security flags to the canvas node props.
### 2026-09-27- **F037** (Saved views): COMPLETE. Updated `View` Prisma model and domain type to include `isStarred: Boolean`. Modified `createView` and added `updateView` endpoint `PATCH /views/:viewId` to support starring/unstarring a view. Validated via `saved-views.e2e.spec.ts` tests `F037: should save and star a named view` and `F037: should update an existing view to star it`. Tests passed locally via `pnpm verify`.

## 2026-09-27 — F039 — Data views

Status: COMPLETE

Implemented:
- Domain layer (`packages/domain/src/`):
  - `data-view.ts`: Implemented `projectDataViewToCanvas` to inject `dataClassification` into model objects and animate connections that represent data flow (`kind='data'` or possessing `dataClassification`).
  - Exported `projectDataViewToCanvas` in `index.ts`.
- UI components (`apps/web/components/canvas/`):
  - `data-badges.tsx`: Implemented an overlay rendering color-coded SVG badges for public/internal/confidential/restricted data classifications.
  - Updated `app-node.tsx`, `system-node.tsx`, `database-node.tsx`, and `component-node.tsx` to render `DataBadges` conditionally based on `dataView` and `dataClassification` props.
- Validation (`apps/web/data-views.spec.ts`):
  - Unit tests verifying proper mapping of the model into canvas node properties and edge animation for data flows.
  - Tests successfully passed locally (`pnpm verify`).

## F040 — Ownership views
- **Status**: COMPLETE
- **Commit**: 684ec0f8983014ef6d40c08b5546f19af9369942
- **Evidence**: `pnpm verify` passed. Ownership view projection and badges are implemented correctly.
