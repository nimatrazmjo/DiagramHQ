import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from './tenant.context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Returns a tenant-isolated context for the specified organization.
   * All queries executed via TenantContext are guaranteed to be scoped
   * to the tenant organization.
   */
  forTenant(orgId: string): TenantContext {
    return new TenantContext(this, orgId);
  }
}
