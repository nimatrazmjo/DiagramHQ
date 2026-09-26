import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ArchitecturesController } from './architectures.controller';
import { ArchitecturesService } from './architectures.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ArchitecturesController],
  providers: [ArchitecturesService],
  exports: [ArchitecturesService],
})
export class ArchitecturesModule {}
