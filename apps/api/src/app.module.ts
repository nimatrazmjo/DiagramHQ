import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { OrganizationsModule } from './organizations/organizations.module';

/**
 * Root module. Feature modules are composed here, one per bounded capability,
 * so the app grows by adding modules rather than editing a monolith.
 */
@Module({
  imports: [AuthModule, DatabaseModule, HealthModule, OrganizationsModule],
})
export class AppModule {}
