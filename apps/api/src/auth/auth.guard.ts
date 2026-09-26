import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthTokenPayload } from '@diagramhq/domain';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token missing');
    }

    const payload = this.authService.verifyToken(token);
    request.user = payload;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const authorization = request.headers?.authorization;
    if (authorization) {
      const [type, token] = authorization.split(' ');
      if (type?.toLowerCase() === 'bearer' && token) {
        return token;
      }
    }

    // Also support session cookie from NextAuth
    const cookieHeader = request.headers?.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, pair) => {
        const [k, v] = pair.trim().split('=');
        if (k && v) acc[k] = decodeURIComponent(v);
        return acc;
      }, {});

      return cookies['authjs.session-token'] || cookies['__Secure-authjs.session-token'];
    }

    return undefined;
  }
}
