import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

function createMockContext(headers: Record<string, string> = {}): {
  context: ExecutionContext;
  req: { headers: Record<string, string>; user?: unknown };
} {
  const req = { headers, user: undefined };
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
  return { context, req };
}

describe('AuthGuard', () => {
  const authService = new AuthService();
  const reflector = new Reflector();

  it('allows access without token when handler is marked @Public()', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const guard = new AuthGuard(reflector, authService);
    const { context } = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException when no Authorization header or cookie is present', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const guard = new AuthGuard(reflector, authService);
    const { context } = createMockContext();

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('authenticates and attaches user payload when valid Bearer token is provided', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const guard = new AuthGuard(reflector, authService);
    const token = authService.signToken({
      sub: 'usr_architect',
      email: 'architect@diagramhq.com',
      name: 'Architect',
    });

    const { context, req } = createMockContext({
      authorization: `Bearer ${token}`,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(req.user).toMatchObject({
      sub: 'usr_architect',
      email: 'architect@diagramhq.com',
      name: 'Architect',
    });
  });

  it('authenticates and attaches user payload when valid session cookie is provided', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const guard = new AuthGuard(reflector, authService);
    const token = authService.signToken({
      sub: 'usr_cookie_user',
      email: 'cookie@diagramhq.com',
    });

    const { context, req } = createMockContext({
      cookie: `authjs.session-token=${token}; other=value`,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(req.user).toMatchObject({
      sub: 'usr_cookie_user',
      email: 'cookie@diagramhq.com',
    });
  });

  it('throws UnauthorizedException when Bearer token is invalid or forged', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const guard = new AuthGuard(reflector, authService);
    const { context } = createMockContext({
      authorization: 'Bearer bad.token.here',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
