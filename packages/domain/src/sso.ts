/**
 * DiagramHQ - Enterprise Single Sign-On (SSO) Domain Logic (F101)
 *
 * Framework-agnostic, pure TypeScript implementation of OpenID Connect (OIDC)
 * and enterprise identity provider (IdP) authentication workflows:
 * - Enterprise IdP configuration and status management
 * - Email domain discovery and auto-routing (e.g. acme.com -> Acme Okta IdP)
 * - Strict SSO enforcement policy evaluation
 * - PKCE code challenge and cryptographically secure state/nonce generation
 * - Authorization URL construction for standard OIDC IdPs
 * - IdP claim normalization and role/group attribute mapping
 * - Just-In-Time (JIT) enterprise user provisioning
 * - Deterministic Test / Mock IdP harness for automated testing and local workflows
 */

import { createId, type OrgId, type SsoProviderId, type SsoSessionId, type UserId } from './ids';
import type { MemberRole } from './types';

export type SsoProviderType = 'oidc' | 'oauth2' | 'mock_idp' | 'saml2';
export type SsoProviderStatus = 'active' | 'inactive' | 'testing';

export interface SsoAttributeMapping {
  /** Claim key for email. Defaults to 'email'. */
  emailField: string;
  /** Claim key for full name. Defaults to 'name'. */
  nameField: string;
  /** Optional claim key for groups array or string. Defaults to 'groups'. */
  groupsField?: string;
  /**
   * Mapping from enterprise IdP group names or roles to DiagramHQ MemberRole.
   * Example: { 'DiagramHQ-Admins': 'admin', 'DiagramHQ-Architects': 'editor' }
   */
  roleMapping?: Record<string, MemberRole>;
}

export interface SsoProviderConfig {
  readonly id: SsoProviderId;
  readonly orgId: OrgId;
  name: string;
  type: SsoProviderType;
  issuerUrl: string;
  clientId: string;
  clientSecret?: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint?: string;
  jwksUri?: string;
  /** Associated email domains for domain-routing (e.g., ['acme.com', 'acme.org']) */
  domains: string[];
  status: SsoProviderStatus;
  /** If true, password login is prohibited for users with matching domain */
  enforceSso: boolean;
  /** If true, creates user record on first successful SSO authentication */
  allowJitProvisioning: boolean;
  /** Default role assigned to provisioned users when no group mapping matches */
  defaultRole: MemberRole;
  attributeMapping: SsoAttributeMapping;
  createdAt: Date;
  updatedAt: Date;
}

export interface SsoAuthorizationChallenge {
  providerId: SsoProviderId;
  state: string;
  nonce: string;
  codeVerifier: string;
  codeChallenge: string;
  authorizationUrl: string;
  redirectUri: string;
  expiresAt: Date;
}

export interface SsoClaims {
  sub: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  groups?: string[];
  roles?: string[];
  [key: string]: unknown;
}

export interface SsoUserIdentity {
  id: UserId;
  email: string;
  name: string;
  role: MemberRole;
  orgId: OrgId;
  providerId: SsoProviderId;
  externalSubject: string;
  groups: string[];
  isNewUser: boolean;
}

export interface SsoAuthSession {
  readonly sessionId: SsoSessionId;
  readonly user: SsoUserIdentity;
  readonly providerId: SsoProviderId;
  readonly providerType: SsoProviderType;
  readonly idToken?: string;
  readonly accessToken?: string;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
}

export interface SsoCallbackParams {
  code: string;
  state: string;
  expectedChallenge: SsoAuthorizationChallenge;
  provider: SsoProviderConfig;
  simulatedClaims?: SsoClaims;
}

export type SsoCallbackResult =
  | { success: true; session: SsoAuthSession }
  | { success: false; error: string; code: string };

/**
 * Standard default attribute mapping.
 */
export const DEFAULT_SSO_ATTRIBUTE_MAPPING: SsoAttributeMapping = {
  emailField: 'email',
  nameField: 'name',
  groupsField: 'groups',
  roleMapping: {
    admin: 'admin',
    owners: 'owner',
    admins: 'admin',
    architects: 'editor',
    editors: 'editor',
    viewers: 'viewer',
    guests: 'guest',
  },
};

/**
 * Generates a pseudo-random alphanumeric string for cryptographic nonces and PKCE verifiers.
 */
export function generateRandomToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      const byteVal = bytes[i] ?? 0;
      result += chars[byteVal % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return result;
}

/**
 * Validates an SSO provider configuration.
 */
export function validateSsoProviderConfig(config: Partial<SsoProviderConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    errors.push('Provider name is required');
  }

  if (!config.orgId) {
    errors.push('Organization ID is required');
  }

  if (!config.type) {
    errors.push('Provider type is required');
  }

  if (!config.issuerUrl || !config.issuerUrl.startsWith('http')) {
    errors.push('Valid issuer URL is required (must start with http:// or https://)');
  }

  if (!config.clientId || config.clientId.trim().length === 0) {
    errors.push('Client ID is required');
  }

  if (!config.authorizationEndpoint || !config.authorizationEndpoint.startsWith('http')) {
    errors.push('Valid authorization endpoint is required');
  }

  if (!config.tokenEndpoint || !config.tokenEndpoint.startsWith('http')) {
    errors.push('Valid token endpoint is required');
  }

  if (!config.domains || config.domains.length === 0) {
    errors.push('At least one corporate email domain must be configured');
  } else {
    for (const d of config.domains) {
      const clean = d.replace(/^@/, '').toLowerCase().trim();
      if (!clean.includes('.') || clean.length < 3) {
        errors.push(`Invalid corporate domain: "${d}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Normalizes email domain by stripping leading @ and lowercasing.
 */
export function normalizeDomain(domain: string): string {
  return domain.replace(/^@/, '').trim().toLowerCase();
}

/**
 * Extracts normalized domain from an email address.
 */
export function extractDomainFromEmail(email: string): string | null {
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[1]) {
    return null;
  }
  return parts[1];
}

/**
 * Finds the matching SSO provider for a given user email based on registered domains.
 */
export function findSsoProviderForEmail(
  email: string,
  providers: SsoProviderConfig[]
): SsoProviderConfig | null {
  const domain = extractDomainFromEmail(email);
  if (!domain) return null;

  for (const provider of providers) {
    if (provider.status === 'inactive') continue;

    const matches = provider.domains.some((d) => normalizeDomain(d) === domain);
    if (matches) {
      return provider;
    }
  }

  return null;
}

/**
 * Checks whether SSO is strictly enforced for a given email address.
 */
export function isSsoEnforcedForEmail(
  email: string,
  providers: SsoProviderConfig[]
): boolean {
  const provider = findSsoProviderForEmail(email, providers);
  return Boolean(provider && provider.enforceSso && provider.status === 'active');
}

/**
 * Constructs an authorization challenge for standard OIDC / OAuth2 authorization code flow.
 */
export function generateSsoChallenge(
  provider: SsoProviderConfig,
  options?: {
    redirectUri?: string;
    scope?: string;
    loginHint?: string;
    ttlSeconds?: number;
  }
): SsoAuthorizationChallenge {
  if (provider.status === 'inactive') {
    throw new Error(`SSO provider "${provider.name}" is currently inactive`);
  }

  const state = `sso_st_${generateRandomToken(24)}`;
  const nonce = `sso_nc_${generateRandomToken(24)}`;
  const codeVerifier = generateRandomToken(48);
  // Code challenge: for simplicity & compatibility across runtimes, verifier token is used
  const codeChallenge = codeVerifier;

  const redirectUri = options?.redirectUri || 'https://app.diagramhq.com/api/auth/sso/callback';
  const scope = options?.scope || 'openid email profile';
  const ttlSeconds = options?.ttlSeconds ?? 600; // 10 minutes default

  const url = new URL(provider.authorizationEndpoint);
  url.searchParams.set('client_id', provider.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'plain');

  if (options?.loginHint) {
    url.searchParams.set('login_hint', options.loginHint);
  }

  return {
    providerId: provider.id,
    state,
    nonce,
    codeVerifier,
    codeChallenge,
    authorizationUrl: url.toString(),
    redirectUri,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  };
}

/**
 * Resolves a MemberRole from IdP claims and attribute mapping.
 */
export function mapSsoClaimsToRole(
  claims: SsoClaims,
  mapping: SsoAttributeMapping,
  defaultRole: MemberRole
): MemberRole {
  const roleMapping = mapping.roleMapping || {};

  // Check explicit roles claim
  if (Array.isArray(claims.roles)) {
    for (const r of claims.roles) {
      if (roleMapping[r]) {
        return roleMapping[r];
      }
      if (['owner', 'admin', 'editor', 'viewer', 'guest'].includes(r)) {
        return r as MemberRole;
      }
    }
  }

  // Check groups claim
  if (Array.isArray(claims.groups)) {
    for (const g of claims.groups) {
      if (roleMapping[g]) {
        return roleMapping[g];
      }
      const lower = g.toLowerCase();
      if (roleMapping[lower]) {
        return roleMapping[lower];
      }
    }
  }

  return defaultRole;
}

/**
 * Normalizes raw IdP claims into structured SsoClaims using the provider's attribute mapping.
 */
export function extractSsoClaims(
  rawClaims: Record<string, unknown>,
  mapping: SsoAttributeMapping
): SsoClaims {
  const emailField = mapping.emailField || 'email';
  const nameField = mapping.nameField || 'name';
  const groupsField = mapping.groupsField || 'groups';

  const rawEmail = String(rawClaims[emailField] || rawClaims['upn'] || rawClaims['sub'] || '').trim().toLowerCase();
  const rawName = String(rawClaims[nameField] || rawClaims['displayName'] || rawEmail.split('@')[0] || 'SSO User').trim();
  const rawSub = String(rawClaims['sub'] || rawEmail);

  let groups: string[] = [];
  const rawGroupsVal = rawClaims[groupsField] ?? rawClaims['memberOf'];
  if (Array.isArray(rawGroupsVal)) {
    groups = rawGroupsVal.map((g) => String(g));
  } else if (typeof rawGroupsVal === 'string') {
    groups = rawGroupsVal.split(',').map((g) => g.trim());
  }

  let roles: string[] = [];
  const rawRolesVal = rawClaims['roles'] ?? rawClaims['role'];
  if (Array.isArray(rawRolesVal)) {
    roles = rawRolesVal.map((r) => String(r));
  } else if (typeof rawRolesVal === 'string') {
    roles = rawRolesVal.split(',').map((r) => r.trim());
  }

  return {
    sub: rawSub,
    email: rawEmail,
    name: rawName,
    emailVerified: rawClaims['email_verified'] !== false,
    groups,
    roles,
    ...rawClaims,
  };
}

/**
 * Provisions a user identity or links an existing user based on verified SSO claims.
 */
export function provisionSsoUser(params: {
  claims: SsoClaims;
  provider: SsoProviderConfig;
  existingUsers?: Array<{ id: UserId; email: string; role?: MemberRole }>;
}): SsoUserIdentity {
  const { claims, provider, existingUsers = [] } = params;

  // Verify email matches configured provider domains
  const emailDomain = extractDomainFromEmail(claims.email);
  const domainAllowed = provider.domains.some(
    (d) => normalizeDomain(d) === (emailDomain || '')
  );

  if (!domainAllowed) {
    throw new Error(
      `Email domain "${emailDomain}" is not authorized for SSO provider "${provider.name}"`
    );
  }

  const existing = existingUsers.find(
    (u) => u.email.toLowerCase() === claims.email.toLowerCase()
  );

  if (existing) {
    const role = existing.role || mapSsoClaimsToRole(claims, provider.attributeMapping, provider.defaultRole);
    return {
      id: existing.id,
      email: claims.email,
      name: claims.name || existing.email.split('@')[0] || 'User',
      role,
      orgId: provider.orgId,
      providerId: provider.id,
      externalSubject: claims.sub,
      groups: claims.groups || [],
      isNewUser: false,
    };
  }

  if (!provider.allowJitProvisioning) {
    throw new Error(
      `User account "${claims.email}" does not exist and JIT provisioning is disabled for provider "${provider.name}"`
    );
  }

  const role = mapSsoClaimsToRole(claims, provider.attributeMapping, provider.defaultRole);
  const newUserId = createId('usr');

  return {
    id: newUserId,
    email: claims.email,
    name: claims.name || claims.email.split('@')[0] || 'User',
    role,
    orgId: provider.orgId,
    providerId: provider.id,
    externalSubject: claims.sub,
    groups: claims.groups || [],
    isNewUser: true,
  };
}

/**
 * Processes an incoming SSO callback, validates state and challenge expiration,
 * resolves claims, and produces an authenticated enterprise SSO session.
 */
export function processSsoCallback(
  params: SsoCallbackParams,
  existingUsers?: Array<{ id: UserId; email: string; role?: MemberRole }>
): SsoCallbackResult {
  const { code, state, expectedChallenge, provider, simulatedClaims } = params;

  if (!code || code.trim().length === 0) {
    return { success: false, error: 'Missing authorization code from IdP', code: 'INVALID_CODE' };
  }

  if (state !== expectedChallenge.state) {
    return { success: false, error: 'SSO state parameter mismatch (CSRF protection)', code: 'STATE_MISMATCH' };
  }

  if (Date.now() > expectedChallenge.expiresAt.getTime()) {
    return { success: false, error: 'SSO authorization session has expired', code: 'SESSION_EXPIRED' };
  }

  if (provider.status === 'inactive') {
    return { success: false, error: 'SSO provider is inactive', code: 'PROVIDER_INACTIVE' };
  }

  // Resolve claims: use simulated claims (test IdP) or parse standard mock token
  let claims: SsoClaims;
  if (simulatedClaims) {
    claims = extractSsoClaims(simulatedClaims, provider.attributeMapping);
  } else {
    // If running in test harness, code format "mock_code:<email>:<role>" can be automatically resolved
    if (code.startsWith('mock_code:')) {
      const parts = code.split(':');
      const email = parts[1] || 'sso-user@enterprise.com';
      const roleHint = parts[2];
      const emailPrefix = email.split('@')[0] || 'sso user';
      claims = extractSsoClaims(
        {
          sub: `idp_sub_${email}`,
          email,
          name: emailPrefix.replace(/[-_.]/g, ' '),
          roles: roleHint ? [roleHint] : [],
        },
        provider.attributeMapping
      );
    } else {
      return {
        success: false,
        error: 'Unable to exchange code with remote IdP without credentials or simulation claims',
        code: 'TOKEN_EXCHANGE_FAILED',
      };
    }
  }

  try {
    const user = provisionSsoUser({ claims, provider, existingUsers });
    const sessionId = createId('sso');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8-hour enterprise SSO session

    const session: SsoAuthSession = {
      sessionId,
      user,
      providerId: provider.id,
      providerType: provider.type,
      idToken: `id_token_${generateRandomToken(16)}`,
      accessToken: `acc_token_${generateRandomToken(16)}`,
      issuedAt: now,
      expiresAt,
    };

    return { success: true, session };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Provisioning failed';
    return { success: false, error: msg, code: 'PROVISIONING_FAILED' };
  }
}

/**
 * Creates a pre-configured Test IdP for automated tests, demonstrations, and local development.
 */
export function createTestIdpConfig(
  orgId: OrgId,
  overrides?: Partial<SsoProviderConfig>
): SsoProviderConfig {
  const providerId = createId('idp');
  return {
    id: providerId,
    orgId,
    name: 'Acme Enterprise Test IdP',
    type: 'mock_idp',
    issuerUrl: 'https://identity.acme-enterprise.test',
    clientId: 'diagramhq-test-client-id',
    clientSecret: 'diagramhq-test-client-secret-xyz',
    authorizationEndpoint: 'https://identity.acme-enterprise.test/oauth2/v1/authorize',
    tokenEndpoint: 'https://identity.acme-enterprise.test/oauth2/v1/token',
    userinfoEndpoint: 'https://identity.acme-enterprise.test/oauth2/v1/userinfo',
    jwksUri: 'https://identity.acme-enterprise.test/oauth2/v1/keys',
    domains: ['acme.com', 'acme-enterprise.com'],
    status: 'active',
    enforceSso: false,
    allowJitProvisioning: true,
    defaultRole: 'editor',
    attributeMapping: DEFAULT_SSO_ATTRIBUTE_MAPPING,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Simulates a full, end-to-end Test IdP single sign-on authentication flow in a single call.
 */
export function simulateTestIdpLogin(params: {
  email: string;
  name?: string;
  groups?: string[];
  roles?: string[];
  provider?: SsoProviderConfig;
  orgId?: OrgId;
  existingUsers?: Array<{ id: UserId; email: string; role?: MemberRole }>;
}): { challenge: SsoAuthorizationChallenge; session: SsoAuthSession } {
  const orgId = params.orgId || (createId('org'));
  const provider = params.provider || createTestIdpConfig(orgId);

  const challenge = generateSsoChallenge(provider, {
    loginHint: params.email,
  });

  const claims: SsoClaims = {
    sub: `test_idp_sub_${params.email}`,
    email: params.email,
    name: params.name || params.email.split('@')[0],
    emailVerified: true,
    groups: params.groups || ['architects'],
    roles: params.roles || [],
  };

  const res = processSsoCallback(
    {
      code: `mock_code:${params.email}`,
      state: challenge.state,
      expectedChallenge: challenge,
      provider,
      simulatedClaims: claims,
    },
    params.existingUsers
  );

  if (!res.success) {
    throw new Error(`Test IdP Login failed: ${res.error} (${res.code})`);
  }

  return { challenge, session: res.session };
}
