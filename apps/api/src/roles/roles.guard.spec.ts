import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MemberRole } from '@diagramhq/domain';
import { RolesGuard, type RequestUser } from './roles.guard';

function createMockContext(user?: RequestUser): ExecutionContext {
  const req = { user };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = new Reflector();

  it('allows access when no roles are required on handler or class', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const guard = new RolesGuard(reflector);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when required roles list is empty', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const guard = new RolesGuard(reflector);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when no user is attached to the request and roles are required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'owner'] as MemberRole[]);
    const guard = new RolesGuard(reflector);
    const context = createMockContext(undefined);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('allows access when user.role matches one of the required roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['editor', 'admin'] as MemberRole[]);
    const guard = new RolesGuard(reflector);
    const context = createMockContext({ sub: 'usr_1', role: 'editor' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when user.roles array contains one of the required roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin'] as MemberRole[]);
    const guard = new RolesGuard(reflector);
    const context = createMockContext({ sub: 'usr_1', roles: ['viewer', 'admin'] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when user role is viewer but editor or admin is required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['editor', 'admin'] as MemberRole[]);
    const guard = new RolesGuard(reflector);
    const context = createMockContext({ sub: 'usr_1', role: 'viewer' });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('denies access when user has empty roles array and no matching role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['owner'] as MemberRole[]);
    const guard = new RolesGuard(reflector);
    const context = createMockContext({ sub: 'usr_1', roles: [] });

    expect(guard.canActivate(context)).toBe(false);
  });
});
