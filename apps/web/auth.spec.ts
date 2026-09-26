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
});
