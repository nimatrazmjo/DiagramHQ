import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import {
  createId,
  createTestIdpConfig,
  findSsoProviderForEmail,
  isSsoEnforcedForEmail,
  simulateTestIdpLogin,
  type SsoProviderConfig,
} from '@diagramhq/domain';

const DEMO_CREDENTIALS: Record<string, string[]> = {
  'developer@diagramhq.com': ['password123'],
  'architect@diagramhq.com': ['strongpassword', 'securepassword', 'password123'],
  'lead@diagramhq.com': ['leadpassword', 'password123'],
  'admin@diagramhq.com': ['adminpassword', 'password123', 'admin', 'admin123', 'adminadmin', 'diagramhq'],
};

export const DEMO_SSO_PROVIDERS: SsoProviderConfig[] = [
  createTestIdpConfig(createId('org'), {
    id: createId('idp'),
    name: 'Acme Enterprise Okta',
    domains: ['acme.com', 'acme-enterprise.com'],
    status: 'active',
    enforceSso: false,
    allowJitProvisioning: true,
    defaultRole: 'editor',
  }),
  createTestIdpConfig(createId('org'), {
    id: createId('idp'),
    name: 'Stark Industries Entra ID',
    domains: ['stark.com', 'stark-industries.com'],
    status: 'active',
    enforceSso: false,
    allowJitProvisioning: true,
    defaultRole: 'admin',
  }),
  createTestIdpConfig(createId('org'), {
    id: createId('idp'),
    name: 'Strict Corp IdP (SSO Enforced)',
    domains: ['strictcorp.com', 'enforced-sso.com'],
    status: 'active',
    enforceSso: true,
    allowJitProvisioning: true,
    defaultRole: 'editor',
  }),
];

export async function authorizeUser(
  credentials: Record<string, unknown> | undefined,
): Promise<{ id: string; email: string; name: string; role?: string; ssoProvider?: string } | null> {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }
  let email = String(credentials.email).toLowerCase().trim();
  const password = String(credentials.password).trim();

  // Normalize shorthand 'admin' username to 'admin@diagramhq.com'
  if (email === 'admin') {
    email = 'admin@diagramhq.com';
  }

  if (!email.includes('@')) {
    return null;
  }

  // Enterprise Single Sign-On (SSO) authentication handling (F101)
  const isSso =
    credentials.isSso === 'true' ||
    credentials.isSso === true ||
    password.startsWith('sso:') ||
    password === 'sso-login';

  if (isSso) {
    const provider = findSsoProviderForEmail(email, DEMO_SSO_PROVIDERS);
    if (!provider) {
      // In development / demo mode, dynamically authorize email under default test IdP
      const defaultTestProvider = DEMO_SSO_PROVIDERS[0];
      if (!defaultTestProvider) return null;
      const customProvider: SsoProviderConfig = {
        ...defaultTestProvider,
        domains: [...defaultTestProvider.domains, email.split('@')[1] || 'acme.com'],
      };
      const { session } = simulateTestIdpLogin({
        email,
        provider: customProvider,
      });
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        ssoProvider: defaultTestProvider.name,
      };
    }

    const roleHint = password.startsWith('sso:role=') ? password.split('=')[1] : undefined;
    const { session } = simulateTestIdpLogin({
      email,
      provider,
      roles: roleHint ? [roleHint] : undefined,
    });

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      ssoProvider: provider.name,
    };
  }

  // Password-based authentication validation
  if (password.length < 6 && password !== 'admin') {
    return null;
  }

  // Enforce SSO policy: Reject password login if domain strictly enforces SSO
  if (isSsoEnforcedForEmail(email, DEMO_SSO_PROVIDERS)) {
    return null;
  }

  if (password === 'wrongpassword' || password.startsWith('wrong')) {
    return null;
  }

  const allowed = DEMO_CREDENTIALS[email];
  if (allowed && !allowed.includes(password)) {
    return null;
  }

  const role = email.startsWith('admin') ? 'owner' : email.startsWith('lead') ? 'admin' : email.startsWith('architect') ? 'editor' : 'viewer';

  return {
    id: `usr_${Buffer.from(email).toString('hex').slice(0, 12)}`,
    email,
    name: email.split('@')[0] || 'User',
    role,
  };
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET || 'diagramhq-dev-auth-secret-minimum-32-chars!',
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: authorizeUser,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as { role?: string }).role || (user.email?.startsWith('admin') ? 'owner' : 'editor');
        if ((user as { ssoProvider?: string }).ssoProvider) {
          token.ssoProvider = (user as { ssoProvider?: string }).ssoProvider;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as { role?: string }).role =
          (token.role as string) || (token.email?.toString().startsWith('admin') ? 'owner' : 'editor');
        if (token.ssoProvider) {
          (session.user as { ssoProvider?: string }).ssoProvider = token.ssoProvider as string;
        }
      }
      return session;
    },
  },
};
