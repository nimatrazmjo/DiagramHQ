import { Module } from '@nestjs/common';
import { ArchitecturesModule } from './architectures/architectures.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ViewsModule } from './views/views.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

/**
 * Root module. Feature modules are composed here, one per bounded capability,
 * so the app grows by adding modules rather than editing a monolith.
 */
@Module({
  imports: [
    ArchitecturesModule,
    AuthModule,
    DatabaseModule,
    HealthModule,
    OrganizationsModule,
    ViewsModule,
    WorkspacesModule,
  ],
})
export class AppModule {}
