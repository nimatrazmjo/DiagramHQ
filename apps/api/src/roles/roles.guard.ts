import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MemberRole } from '@diagramhq/domain';
import { ROLES_KEY } from './roles.decorator';

export interface RequestUser {
  sub: string;
  email?: string;
  name?: string | null;
  role?: MemberRole;
  roles?: MemberRole[];
}

interface RequestWithUser {
  user?: RequestUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<MemberRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request?.user;

    if (!user) {
      return false;
    }

    if (user.role && requiredRoles.includes(user.role)) {
      return true;
    }

    if (Array.isArray(user.roles) && user.roles.some((role) => requiredRoles.includes(role))) {
      return true;
    }

    return false;
  }
}
