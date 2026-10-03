import { describe, expect, it } from 'vitest';
import { createId } from './ids';
import {
  createTestIdpConfig,
  extractDomainFromEmail,
  extractSsoClaims,
  findSsoProviderForEmail,
  generateSsoChallenge,
  isSsoEnforcedForEmail,
  mapSsoClaimsToRole,
  normalizeDomain,
  processSsoCallback,
  provisionSsoUser,
  simulateTestIdpLogin,
  validateSsoProviderConfig,
  type SsoClaims,
} from './sso';

describe('SSO Domain Logic (F101)', () => {
  const orgId = createId('org');

  describe('validateSsoProviderConfig', () => {
    it('passes for a valid provider configuration', () => {
      const config = createTestIdpConfig(orgId);
      const res = validateSsoProviderConfig(config);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('identifies invalid domains, missing names, and bad endpoints', () => {
      const res = validateSsoProviderConfig({
        name: '',
        orgId: undefined,
        issuerUrl: 'invalid-url',
        domains: ['not-a-domain', '@@invalid'],
      });
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Provider name is required');
      expect(res.errors).toContain('Organization ID is required');
      expect(res.errors).toContain('Valid issuer URL is required (must start with http:// or https://)');
    });
  });

  describe('domain extraction and routing', () => {
    it('normalizes domain strings with or without @', () => {
      expect(normalizeDomain('@acme.com')).toBe('acme.com');
      expect(normalizeDomain('ACME.COM ')).toBe('acme.com');
    });

    it('extracts domain from email addresses accurately', () => {
      expect(extractDomainFromEmail('alice@acme.com')).toBe('acme.com');
      expect(extractDomainFromEmail('bob@sub.domain.co.uk')).toBe('sub.domain.co.uk');
      expect(extractDomainFromEmail('invalid-email')).toBeNull();
    });

    it('routes email to the matching active SSO provider', () => {
      const provider1 = createTestIdpConfig(orgId, {
        name: 'Acme Okta',
        domains: ['acme.com'],
        status: 'active',
      });
      const provider2 = createTestIdpConfig(orgId, {
        name: 'Subsidiary Azure',
        domains: ['subsidiary.org'],
        status: 'active',
      });
      const inactiveProvider = createTestIdpConfig(orgId, {
        name: 'Old Ping',
        domains: ['oldcorp.com'],
        status: 'inactive',
      });

      const providers = [provider1, provider2, inactiveProvider];

      expect(findSsoProviderForEmail('alice@acme.com', providers)?.name).toBe('Acme Okta');
      expect(findSsoProviderForEmail('carol@subsidiary.org', providers)?.name).toBe('Subsidiary Azure');
      expect(findSsoProviderForEmail('dan@oldcorp.com', providers)).toBeNull();
      expect(findSsoProviderForEmail('eve@gmail.com', providers)).toBeNull();
    });

    it('evaluates whether SSO is strictly enforced for a domain', () => {
      const strictProvider = createTestIdpConfig(orgId, {
        domains: ['strictcorp.com'],
        enforceSso: true,
        status: 'active',
      });
      const optionalProvider = createTestIdpConfig(orgId, {
        domains: ['flexiblecorp.com'],
        enforceSso: false,
        status: 'active',
      });

      expect(isSsoEnforcedForEmail('user@strictcorp.com', [strictProvider, optionalProvider])).toBe(true);
      expect(isSsoEnforcedForEmail('user@flexiblecorp.com', [strictProvider, optionalProvider])).toBe(false);
      expect(isSsoEnforcedForEmail('user@other.com', [strictProvider, optionalProvider])).toBe(false);
    });
  });

  describe('generateSsoChallenge', () => {
    it('builds a secure OIDC authorization URL with PKCE parameters', () => {
      const provider = createTestIdpConfig(orgId);
      const challenge = generateSsoChallenge(provider, {
        loginHint: 'alice@acme.com',
        redirectUri: 'https://diagramhq.com/api/auth/sso/callback',
      });

      expect(challenge.state.startsWith('sso_st_')).toBe(true);
      expect(challenge.nonce.startsWith('sso_nc_')).toBe(true);
      expect(challenge.codeVerifier.length).toBeGreaterThan(30);

      const parsedUrl = new URL(challenge.authorizationUrl);
      expect(parsedUrl.origin + parsedUrl.pathname).toBe(provider.authorizationEndpoint);
      expect(parsedUrl.searchParams.get('client_id')).toBe(provider.clientId);
      expect(parsedUrl.searchParams.get('response_type')).toBe('code');
      expect(parsedUrl.searchParams.get('state')).toBe(challenge.state);
      expect(parsedUrl.searchParams.get('nonce')).toBe(challenge.nonce);
      expect(parsedUrl.searchParams.get('login_hint')).toBe('alice@acme.com');
      expect(parsedUrl.searchParams.get('redirect_uri')).toBe('https://diagramhq.com/api/auth/sso/callback');
    });

    it('rejects generating challenge for inactive providers', () => {
      const provider = createTestIdpConfig(orgId, { status: 'inactive' });
      expect(() => generateSsoChallenge(provider)).toThrow(/inactive/);
    });
  });

  describe('attribute mapping & role resolution', () => {
    const provider = createTestIdpConfig(orgId);

    it('maps enterprise IdP groups to DiagramHQ MemberRoles', () => {
      const adminClaims: SsoClaims = {
        sub: 'sub_123',
        email: 'admin@acme.com',
        groups: ['admins', 'engineering'],
      };
      expect(mapSsoClaimsToRole(adminClaims, provider.attributeMapping, 'viewer')).toBe('admin');

      const architectClaims: SsoClaims = {
        sub: 'sub_456',
        email: 'arch@acme.com',
        groups: ['architects'],
      };
      expect(mapSsoClaimsToRole(architectClaims, provider.attributeMapping, 'viewer')).toBe('editor');

      const unmappedClaims: SsoClaims = {
        sub: 'sub_789',
        email: 'other@acme.com',
        groups: ['marketing'],
      };
      expect(mapSsoClaimsToRole(unmappedClaims, provider.attributeMapping, 'viewer')).toBe('viewer');
    });

    it('extracts claims from custom OIDC payloads', () => {
      const raw = {
        sub: 'idp_user_99',
        upn: 'lead.dev@acme.com',
        displayName: 'Lead Developer',
        memberOf: ['Admins', 'Staff'],
      };

      const customMapping = {
        emailField: 'upn',
        nameField: 'displayName',
        groupsField: 'memberOf',
      };

      const extracted = extractSsoClaims(raw, customMapping);
      expect(extracted.email).toBe('lead.dev@acme.com');
      expect(extracted.name).toBe('Lead Developer');
      expect(extracted.groups).toEqual(['Admins', 'Staff']);
    });
  });

  describe('provisionSsoUser', () => {
    const provider = createTestIdpConfig(orgId, {
      domains: ['acme.com'],
      allowJitProvisioning: true,
      defaultRole: 'editor',
    });

    it('provisions a new enterprise user when JIT is allowed', () => {
      const claims: SsoClaims = {
        sub: 'auth0|123456',
        email: 'newuser@acme.com',
        name: 'New Enterprise User',
        groups: ['architects'],
      };

      const user = provisionSsoUser({ claims, provider });
      expect(user.isNewUser).toBe(true);
      expect(user.id.startsWith('usr_')).toBe(true);
      expect(user.email).toBe('newuser@acme.com');
      expect(user.role).toBe('editor');
      expect(user.orgId).toBe(orgId);
      expect(user.externalSubject).toBe('auth0|123456');
    });

    it('links an existing user without duplicating account id', () => {
      const existingUserId = createId('usr');
      const existingUsers = [
        { id: existingUserId, email: 'existing@acme.com', role: 'admin' as const },
      ];

      const claims: SsoClaims = {
        sub: 'okta|987654',
        email: 'existing@acme.com',
        name: 'Updated Name',
      };

      const user = provisionSsoUser({ claims, provider, existingUsers });
      expect(user.isNewUser).toBe(false);
      expect(user.id).toBe(existingUserId);
      expect(user.role).toBe('admin');
    });

    it('rejects emails from unauthorized corporate domains', () => {
      const claims: SsoClaims = {
        sub: 'hacker_123',
        email: 'intruder@evilcorp.com',
      };

      expect(() => provisionSsoUser({ claims, provider })).toThrow(/not authorized/);
    });

    it('rejects new users if JIT provisioning is disabled', () => {
      const strictNoJit = { ...provider, allowJitProvisioning: false };
      const claims: SsoClaims = {
        sub: 'unregistered|1',
        email: 'unregistered@acme.com',
      };

      expect(() => provisionSsoUser({ claims, provider: strictNoJit })).toThrow(/JIT provisioning is disabled/);
    });
  });

  describe('processSsoCallback', () => {
    const provider = createTestIdpConfig(orgId);

    it('validates state parameter for CSRF mitigation', () => {
      const challenge = generateSsoChallenge(provider);
      const res = processSsoCallback({
        code: 'mock_code:alice@acme.com',
        state: 'tampered-state-token',
        expectedChallenge: challenge,
        provider,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('STATE_MISMATCH');
      }
    });

    it('rejects expired authorization challenges', () => {
      const expiredChallenge = {
        ...generateSsoChallenge(provider),
        expiresAt: new Date(Date.now() - 1000), // 1s ago
      };

      const res = processSsoCallback({
        code: 'mock_code:alice@acme.com',
        state: expiredChallenge.state,
        expectedChallenge: expiredChallenge,
        provider,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('SESSION_EXPIRED');
      }
    });

    it('successfully processes callback and generates SsoAuthSession', () => {
      const challenge = generateSsoChallenge(provider);
      const res = processSsoCallback({
        code: 'mock_code:alice@acme.com:admin',
        state: challenge.state,
        expectedChallenge: challenge,
        provider,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.session.sessionId.startsWith('sso_')).toBe(true);
        expect(res.session.user.email).toBe('alice@acme.com');
        expect(res.session.user.role).toBe('admin');
        expect(res.session.expiresAt.getTime()).toBeGreaterThan(Date.now());
      }
    });
  });

  describe('simulateTestIdpLogin (Test IdP)', () => {
    it('executes a full end-to-end SSO login with the test IdP', () => {
      const { challenge, session } = simulateTestIdpLogin({
        email: 'lead-architect@acme-enterprise.com',
        name: 'Lead Architect',
        groups: ['architects'],
        orgId,
      });

      expect(challenge.authorizationUrl).toContain('https://identity.acme-enterprise.test');
      expect(session.sessionId.startsWith('sso_')).toBe(true);
      expect(session.user.email).toBe('lead-architect@acme-enterprise.com');
      expect(session.user.name).toBe('Lead Architect');
      expect(session.user.role).toBe('editor');
      expect(session.providerType).toBe('mock_idp');
      expect(session.user.isNewUser).toBe(true);
    });

    it('supports linking existing user in simulateTestIdpLogin', () => {
      const existingUserId = createId('usr');
      const existingUsers = [
        { id: existingUserId, email: 'cto@acme.com', role: 'owner' as const },
      ];

      const { session } = simulateTestIdpLogin({
        email: 'cto@acme.com',
        existingUsers,
      });

      expect(session.user.id).toBe(existingUserId);
      expect(session.user.role).toBe('owner');
      expect(session.user.isNewUser).toBe(false);
    });
  });
});
