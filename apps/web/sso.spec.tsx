import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SsoSettingsModal } from './components/enterprise/sso-settings-modal';
import { LoginForm } from './app/login/login-form';
import {
  createId,
  createTestIdpConfig,
  simulateTestIdpLogin,
  type SsoProviderConfig,
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

describe('Enterprise SSO Web Integration (F101)', () => {
  const orgId = createId('org');

  const testProviders: SsoProviderConfig[] = [
    createTestIdpConfig(orgId, {
      id: createId('idp'),
      name: 'Acme Enterprise Okta',
      domains: ['acme.com', 'acme-enterprise.com'],
      status: 'active',
      enforceSso: false,
      allowJitProvisioning: true,
      defaultRole: 'editor',
    }),
    createTestIdpConfig(orgId, {
      id: createId('idp'),
      name: 'Stark Industries Entra ID',
      domains: ['stark.com', 'stark-industries.com'],
      status: 'active',
      enforceSso: true,
      allowJitProvisioning: true,
      defaultRole: 'admin',
    }),
  ];

  describe('LoginForm with Enterprise SSO', () => {
    it('renders login form with Password and Enterprise SSO modes', () => {
      const html = renderToString(<LoginForm />);
      expect(html).toContain('Password');
      expect(html).toContain('Enterprise SSO');
      expect(html).toContain('1-Click Sign In as Admin');
      expect(html).toContain('Enterprise SSO Settings');
    });

    it('displays demo accounts and credentials input fields', () => {
      const html = renderToString(<LoginForm />);
      expect(html).toContain('Email or Username');
      expect(html).toContain('admin@diagramhq.com');
      expect(html).toContain('Lead Architect');
      expect(html).toContain('Architect');
    });
  });

  describe('SsoSettingsModal UI', () => {
    it('renders enterprise IdP list when open', () => {
      const html = renderToString(
        <SsoSettingsModal
          isOpen={true}
          onClose={() => {}}
          orgName="Acme Global Corporation"
          initialProviders={testProviders}
        />
      );

      expect(html).toContain('Enterprise Single Sign-On');
      expect(html).toContain('Acme Global Corporation');
      expect(html).toContain('Acme Enterprise Okta');
      expect(html).toContain('Stark Industries Entra ID');
      expect(html).toContain('Configured IdPs');
      expect(html).toContain('Test Simulation');
      expect(html).toContain('+ Add Provider');
    });

    it('displays enforcement badge for enforced SSO providers', () => {
      const html = renderToString(
        <SsoSettingsModal
          isOpen={true}
          onClose={() => {}}
          initialProviders={testProviders}
        />
      );

      expect(html).toContain('Enforced');
      expect(html).toContain('SSO Enforced');
    });

    it('returns null when isOpen is false', () => {
      const html = renderToString(
        <SsoSettingsModal
          isOpen={false}
          onClose={() => {}}
          initialProviders={testProviders}
        />
      );

      expect(html).toBe('');
    });
  });

  describe('Test IdP End-to-End Simulation Flow', () => {
    it('successfully generates challenge and authenticates user via Test IdP', () => {
      const sim = simulateTestIdpLogin({
        email: 'devops-lead@acme-enterprise.com',
        name: 'DevOps Lead',
        groups: ['architects'],
        provider: testProviders[0],
      });

      expect(sim.challenge.authorizationUrl).toContain('https://identity.acme-enterprise.test');
      expect(sim.session.user.email).toBe('devops-lead@acme-enterprise.com');
      expect(sim.session.user.role).toBe('editor');
      expect(sim.session.user.isNewUser).toBe(true);
      expect(sim.session.sessionId.startsWith('sso_')).toBe(true);
    });
  });
});
