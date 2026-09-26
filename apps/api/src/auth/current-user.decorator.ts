import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthTokenPayload } from '@diagramhq/domain';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthTokenPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthTokenPayload }>();
    return request.user;
  },
);
