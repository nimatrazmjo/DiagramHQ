import { describe, expect, it } from 'vitest';
import { createId } from './ids';
import {
  base64Decode,
  base64Encode,
  buildSamlAuthnRequest,
  buildSpMetadataXml,
  buildTestSamlResponseXml,
  createTestSamlIdpConfig,
  escapeXml,
  parseAndValidateSamlResponse,
  parseIdpMetadataXml,
  simulateTestSamlLogin,
  type SamlSpConfig,
} from './saml';

describe('SAML 2.0 Integration Domain Logic (F102)', () => {
  const orgId = createId('org');
  const spConfig: SamlSpConfig = {
    entityId: 'https://app.diagramhq.com/api/auth/saml/metadata',
    acsUrl: 'https://app.diagramhq.com/api/auth/saml/acs',
    singleLogoutUrl: 'https://app.diagramhq.com/api/auth/saml/slo',
  };

  describe('buildSpMetadataXml', () => {
    it('generates W3C-compliant Service Provider metadata XML', () => {
      const xml = buildSpMetadataXml(spConfig);
      expect(xml).toContain('entityID="https://app.diagramhq.com/api/auth/saml/metadata"');
      expect(xml).toContain('Location="https://app.diagramhq.com/api/auth/saml/acs"');
      expect(xml).toContain('Location="https://app.diagramhq.com/api/auth/saml/slo"');
      expect(xml).toContain('urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress');
    });

    it('escapes special characters in metadata values', () => {
      expect(escapeXml('<script>alert("xss&")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&amp;&quot;)&lt;/script&gt;'
      );
    });
  });

  describe('parseIdpMetadataXml', () => {
    it('parses entityId, SSO URL, SLO URL, and certificate from IdP XML', () => {
      const mockIdpXml = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor entityID="http://www.okta.com/exk998877" xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata">
  <md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>
            MIIDqDCCApCgAwIBAgIGAX123456
          </ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://acme.okta.com/app/slo"/>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://acme.okta.com/app/sso"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>`;

      const parsed = parseIdpMetadataXml(mockIdpXml);
      expect(parsed.entityId).toBe('http://www.okta.com/exk998877');
      expect(parsed.singleSignOnServiceUrl).toBe('https://acme.okta.com/app/sso');
      expect(parsed.singleLogoutServiceUrl).toBe('https://acme.okta.com/app/slo');
      expect(parsed.certificate).toBe('MIIDqDCCApCgAwIBAgIGAX123456');
    });

    it('throws error when required attributes are missing', () => {
      expect(() => parseIdpMetadataXml('<EntityDescriptor></EntityDescriptor>')).toThrow(
        /missing required entityID/
      );
    });
  });

  describe('buildSamlAuthnRequest', () => {
    const idp = createTestSamlIdpConfig(orgId);

    it('generates a signed AuthnRequest XML and redirect URL', () => {
      const req = buildSamlAuthnRequest({
        idp,
        sp: spConfig,
        relayState: '/workspace/ws_123',
      });

      expect(req.id.startsWith('saml_')).toBe(true);
      expect(req.xml).toContain('<samlp:AuthnRequest');
      expect(req.xml).toContain(`ID="${req.id}"`);
      expect(req.xml).toContain(`<saml:Issuer>${spConfig.entityId}</saml:Issuer>`);
      expect(req.xml).toContain(`Destination="${idp.singleSignOnServiceUrl}"`);
      expect(req.base64).toBe(base64Encode(req.xml));

      const parsedUrl = new URL(req.redirectUrl);
      expect(parsedUrl.origin + parsedUrl.pathname).toBe(idp.singleSignOnServiceUrl);
      expect(parsedUrl.searchParams.get('SAMLRequest')).toBe(req.base64);
      expect(parsedUrl.searchParams.get('RelayState')).toBe('/workspace/ws_123');
    });

    it('rejects generating AuthnRequest for inactive IdP', () => {
      const inactiveIdp = { ...idp, status: 'inactive' as const };
      expect(() => buildSamlAuthnRequest({ idp: inactiveIdp, sp: spConfig })).toThrow(/inactive/);
    });
  });

  describe('parseAndValidateSamlResponse', () => {
    const idp = createTestSamlIdpConfig(orgId);

    it('validates a successful SAML assertion and provisions a new user with mapped role', () => {
      const requestId = 'saml_req_test_123';
      const responseXml = buildTestSamlResponseXml({
        idp,
        sp: spConfig,
        nameId: 'lead-architect@acme-enterprise.com',
        displayName: 'Lead Architect',
        groups: ['architects', 'staff'],
        inResponseTo: requestId,
      });

      const b64 = base64Encode(responseXml);
      const res = parseAndValidateSamlResponse(b64, idp, {
        expectedInResponseTo: requestId,
        expectedAudience: spConfig.entityId,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.session.sessionId.startsWith('sso_')).toBe(true);
        expect(res.session.providerType).toBe('saml2');
        expect(res.session.user.email).toBe('lead-architect@acme-enterprise.com');
        expect(res.session.user.name).toBe('Lead Architect');
        expect(res.session.user.role).toBe('editor'); // mapped from 'architects'
        expect(res.session.user.isNewUser).toBe(true);
        expect(res.claims.groups).toContain('architects');
      }
    });

    it('links an existing user account by email address', () => {
      const existingUserId = createId('usr');
      const existingUsers = [
        { id: existingUserId, email: 'admin@acme.com', role: 'admin' as const },
      ];

      const responseXml = buildTestSamlResponseXml({
        idp,
        sp: spConfig,
        nameId: 'admin@acme.com',
        displayName: 'Enterprise Admin',
      });

      const res = parseAndValidateSamlResponse(
        base64Encode(responseXml),
        idp,
        { expectedAudience: spConfig.entityId },
        existingUsers
      );

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.session.user.id).toBe(existingUserId);
        expect(res.session.user.role).toBe('admin');
        expect(res.session.user.isNewUser).toBe(false);
      }
    });

    it('rejects response with IdP error status', () => {
      const errorXml = buildTestSamlResponseXml({
        idp,
        sp: spConfig,
        nameId: 'user@acme.com',
        statusCode: 'urn:oasis:names:tc:SAML:2.0:status:Responder',
      });

      const res = parseAndValidateSamlResponse(base64Encode(errorXml), idp);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('IDP_ERROR_STATUS');
      }
    });

    it('rejects InResponseTo mismatch for CSRF mitigation', () => {
      const responseXml = buildTestSamlResponseXml({
        idp,
        sp: spConfig,
        nameId: 'user@acme.com',
        inResponseTo: 'req_actual',
      });

      const res = parseAndValidateSamlResponse(base64Encode(responseXml), idp, {
        expectedInResponseTo: 'req_expected_different',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('IN_RESPONSE_TO_MISMATCH');
      }
    });

    it('rejects Issuer mismatch', () => {
      const responseXml = buildTestSamlResponseXml({
        idp,
        sp: spConfig,
        nameId: 'user@acme.com',
        overrideIssuer: 'http://rogue-idp.com',
      });

      const res = parseAndValidateSamlResponse(base64Encode(responseXml), idp);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('ISSUER_MISMATCH');
      }
    });

    it('rejects Audience mismatch', () => {
      const responseXml = buildTestSamlResponseXml({
        idp,
        sp: spConfig,
        nameId: 'user@acme.com',
        overrideAudience: 'https://different-sp.com',
      });

      const res = parseAndValidateSamlResponse(base64Encode(responseXml), idp, {
        expectedAudience: spConfig.entityId,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('AUDIENCE_MISMATCH');
      }
    });

    it('rejects expired assertion (NotOnOrAfter in the past)', () => {
      const responseXml = buildTestSamlResponseXml({
        idp,
        sp: spConfig,
        nameId: 'user@acme.com',
        notOnOrAfterMinutes: -5, // expired 5 min ago
      });

      const res = parseAndValidateSamlResponse(base64Encode(responseXml), idp, {
        clockSkewSeconds: 0,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('ASSERTION_EXPIRED');
      }
    });

    it('rejects email addresses from unauthorized corporate domains', () => {
      const responseXml = buildTestSamlResponseXml({
        idp,
        sp: spConfig,
        nameId: 'intruder@othercorp.com',
      });

      const res = parseAndValidateSamlResponse(base64Encode(responseXml), idp);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('UNAUTHORIZED_DOMAIN');
      }
    });

    it('rejects new user creation when JIT provisioning is disabled', () => {
      const noJitIdp = { ...idp, allowJitProvisioning: false };
      const responseXml = buildTestSamlResponseXml({
        idp: noJitIdp,
        sp: spConfig,
        nameId: 'unregistered@acme.com',
      });

      const res = parseAndValidateSamlResponse(base64Encode(responseXml), noJitIdp);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('JIT_DISABLED');
      }
    });
  });

  describe('simulateTestSamlLogin (Test IdP)', () => {
    it('executes a full end-to-end SAML 2.0 authentication flow', () => {
      const { request, responseXml, session } = simulateTestSamlLogin({
        email: 'saml-engineer@acme-enterprise.com',
        name: 'SAML Systems Engineer',
        groups: ['DiagramHQ-Admins'],
        orgId,
      });

      expect(request.id.startsWith('saml_')).toBe(true);
      expect(responseXml).toContain('<saml:Assertion');
      expect(session.sessionId.startsWith('sso_')).toBe(true);
      expect(session.user.email).toBe('saml-engineer@acme-enterprise.com');
      expect(session.user.name).toBe('SAML Systems Engineer');
      expect(session.user.role).toBe('admin'); // mapped from 'DiagramHQ-Admins'
      expect(session.providerType).toBe('saml2');
      expect(session.user.isNewUser).toBe(true);
    });
  });

  describe('base64 helpers', () => {
    it('accurately encodes and decodes UTF-8 strings', () => {
      const sample = 'SAML 2.0 assertion with special chars: <xml attr="value & test"/>';
      expect(base64Decode(base64Encode(sample))).toBe(sample);
    });
  });
});
