import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SsoSettingsModal } from './components/enterprise/sso-settings-modal';
import { LoginForm } from './app/login/login-form';
import {
  buildSpMetadataXml,
  createId,
  createTestSamlIdpConfig,
  parseIdpMetadataXml,
  simulateTestSamlLogin,
  type SamlSpConfig,
} from '@diagramhq/domain';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn((key: string) => (key === 'callbackUrl' ? '/dashboard' : null)),
  }),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(async () => ({ ok: true })),
  signOut: vi.fn(async () => {}),
}));

describe('SAML 2.0 Web Browser SSO Integration (F102)', () => {
  const orgId = createId('org');
  const spConfig: SamlSpConfig = {
    entityId: 'https://app.diagramhq.com/api/auth/saml/metadata',
    acsUrl: 'https://app.diagramhq.com/api/auth/saml/acs',
    singleLogoutUrl: 'https://app.diagramhq.com/api/auth/saml/slo',
  };

  describe('Service Provider (SP) Metadata', () => {
    it('generates standard SAML 2.0 metadata containing SP EntityID and ACS URL', () => {
      const xml = buildSpMetadataXml(spConfig);
      expect(xml).toContain('https://app.diagramhq.com/api/auth/saml/metadata');
      expect(xml).toContain('https://app.diagramhq.com/api/auth/saml/acs');
      expect(xml).toContain('urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST');
    });

    it('parses external IdP metadata XML successfully', () => {
      const sampleIdpXml = `<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://idp.okta.com/exk123">
        <md:SingleSignOnService Location="https://idp.okta.com/sso/saml" Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"/>
      </md:EntityDescriptor>`;

      const parsed = parseIdpMetadataXml(sampleIdpXml);
      expect(parsed.entityId).toBe('https://idp.okta.com/exk123');
      expect(parsed.singleSignOnServiceUrl).toBe('https://idp.okta.com/sso/saml');
    });
  });

  describe('LoginForm with SAML 2.0', () => {
    it('renders login form with SAML 2.0 action button', () => {
      const html = renderToString(<LoginForm />);
      expect(html).toContain('Enterprise SSO');
      expect(html).toContain('Password');
      expect(html).toContain('Sign in');
    });
  });

  describe('SsoSettingsModal with SAML 2.0 Configuration Tab', () => {
    it('renders SAML 2.0 SP config tab and endpoints when opened', () => {
      const html = renderToString(
        <SsoSettingsModal
          isOpen={true}
          onClose={() => {}}
          orgName="Acme Global Corporation"
        />
      );

      expect(html).toContain('SAML 2.0 SP Config');
      expect(html).toContain('F102');
      expect(html).toContain('Configured IdPs');
      expect(html).toContain('⚡ Test Simulation');
    });
  });

  describe('End-to-End Test SAML IdP Simulation', () => {
    it('simulates complete SAML assertion exchange issuing an enterprise session', () => {
      const testIdp = createTestSamlIdpConfig(orgId);
      const sim = simulateTestSamlLogin({
        email: 'lead-dev@acme-enterprise.com',
        name: 'Lead Developer',
        groups: ['DiagramHQ-Architects'],
        idp: testIdp,
        sp: spConfig,
      });

      expect(sim.request.id.startsWith('saml_')).toBe(true);
      expect(sim.responseXml).toContain('<saml:Assertion');
      expect(sim.session.user.email).toBe('lead-dev@acme-enterprise.com');
      expect(sim.session.user.role).toBe('editor');
      expect(sim.session.user.isNewUser).toBe(true);
      expect(sim.session.providerType).toBe('saml2');
    });
  });
});
