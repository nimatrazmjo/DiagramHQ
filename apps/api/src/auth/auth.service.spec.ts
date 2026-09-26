import { describe, expect, it } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const service = new AuthService();

  it('validates valid credentials and formats a stable user object', () => {
    const user = service.validateCredentials('architect@diagramhq.com', 'strongpassword');
    expect(user).not.toBeNull();
    expect(user?.email).toBe('architect@diagramhq.com');
    expect(user?.name).toBe('architect');
    expect(user?.id.startsWith('usr_')).toBe(true);
  });

  it('rejects invalid email formats or short passwords', () => {
    expect(service.validateCredentials('not-an-email', 'strongpassword')).toBeNull();
    expect(service.validateCredentials('architect@diagramhq.com', '123')).toBeNull();
  });

  it('signs and verifies a valid JWT payload', () => {
    const token = service.signToken({
      sub: 'usr_test123',
      email: 'test@diagramhq.com',
      name: 'Test User',
    });

    const payload = service.verifyToken(token);
    expect(payload.sub).toBe('usr_test123');
    expect(payload.email).toBe('test@diagramhq.com');
    expect(payload.name).toBe('Test User');
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
  });

  it('throws UnauthorizedException when verifying a malformed or forged token', () => {
    expect(() => service.verifyToken('not.a.valid.jwt')).toThrow(UnauthorizedException);

    const forgedToken = jwt.sign(
      { sub: 'usr_hacker', email: 'hacker@evil.com' },
      'wrong-secret-key-1234567890123456',
    );
    expect(() => service.verifyToken(forgedToken)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when verifying an expired token', () => {
    const expiredToken = service.signToken(
      { sub: 'usr_expired', email: 'expired@diagramhq.com' },
      -10, // expired 10 seconds ago
    );

    expect(() => service.verifyToken(expiredToken)).toThrow(UnauthorizedException);
  });
});
