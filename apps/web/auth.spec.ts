import { describe, expect, it } from 'vitest';
import { authorizeUser } from './auth.config';

describe('authorizeUser', () => {
  it('returns null if credentials are not provided', async () => {
    expect(await authorizeUser(undefined)).toBeNull();
    expect(await authorizeUser({})).toBeNull();
  });

  it('returns null if email or password is missing', async () => {
    expect(await authorizeUser({ email: 'user@diagramhq.com' })).toBeNull();
    expect(await authorizeUser({ password: 'password123' })).toBeNull();
  });

  it('returns null if email format is invalid', async () => {
    expect(await authorizeUser({ email: 'notanemail', password: 'password123' })).toBeNull();
  });

  it('returns null if password is less than 6 characters', async () => {
    expect(await authorizeUser({ email: 'user@diagramhq.com', password: '123' })).toBeNull();
  });

  it('returns authenticated user when valid email and password are provided', async () => {
    const user = await authorizeUser({
      email: 'Architect@DiagramHQ.com',
      password: 'securepassword',
    });

    expect(user).not.toBeNull();
    expect(user?.email).toBe('architect@diagramhq.com');
    expect(user?.name).toBe('architect');
    expect(user?.id.startsWith('usr_')).toBe(true);
  });

  it('authenticates enterprise user via SSO with test IdP', async () => {
    const ssoUser = await authorizeUser({
      email: 'alex@acme-enterprise.com',
      password: 'sso-login',
      isSso: 'true',
    });

    expect(ssoUser).not.toBeNull();
    expect(ssoUser?.email).toBe('alex@acme-enterprise.com');
    expect(ssoUser?.id.startsWith('usr_')).toBe(true);
    expect(ssoUser?.ssoProvider).toBe('Acme Enterprise Okta');
    expect(ssoUser?.role).toBe('editor');
  });

  it('blocks password login when SSO is strictly enforced for domain', async () => {
    const user = await authorizeUser({
      email: 'employee@strictcorp.com',
      password: 'password123',
    });

    expect(user).toBeNull();
  });

  it('authenticates enterprise user via SAML 2.0 assertion flow', async () => {
    const samlUser = await authorizeUser({
      email: 'architect@acme-enterprise.com',
      password: 'saml-login',
      isSaml: 'true',
    });

    expect(samlUser).not.toBeNull();
    expect(samlUser?.email).toBe('architect@acme-enterprise.com');
    expect(samlUser?.id.startsWith('usr_')).toBe(true);
    expect(samlUser?.ssoProvider).toContain('SAML 2.0');
    expect(samlUser?.role).toBe('editor');
  });
});

describe('signApiToken', () => {
  it('signs a token with user claims readable by HS256', async () => {
    const { signApiToken } = await import('./lib/api-token');
    const { jwtVerify } = await import('jose');

    const token = await signApiToken({
      id: 'usr_test123',
      email: 'test@diagramhq.com',
      name: 'Test User',
    });

    const secretKey = new TextEncoder().encode(
      process.env.AUTH_SECRET || 'diagramhq-dev-auth-secret-minimum-32-chars!',
    );
    const { payload } = await jwtVerify(token, secretKey);

    expect(payload.sub).toBe('usr_test123');
    expect(payload.email).toBe('test@diagramhq.com');
    expect(payload.name).toBe('Test User');
  });
});
