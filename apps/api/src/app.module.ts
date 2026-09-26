import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

/**
 * Root module. Feature modules are composed here, one per bounded capability,
 * so the app grows by adding modules rather than editing a monolith.
 */
@Module({
  imports: [DatabaseModule, HealthModule],
})
export class AppModule {}
