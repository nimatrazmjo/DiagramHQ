import { SetMetadata } from '@nestjs/common';
import type { MemberRole } from '@diagramhq/domain';

export const ROLES_KEY = 'roles';

export const RequireRoles = (...roles: MemberRole[]) => SetMetadata(ROLES_KEY, roles);
