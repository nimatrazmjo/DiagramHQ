import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  checks: { database: 'up' | 'down' };
}

/**
 * Reports service liveness plus a readiness signal for its critical dependency
 * (the database). Kept free of transport concerns so it is unit-testable and
 * reusable by other probes.
 */
// A network partition (as opposed to a clean connection-refused) can leave
// $queryRaw neither resolving nor rejecting; without a bound, a probe calling
// /health would hang past its own timeout instead of getting a fast "down".
const DATABASE_CHECK_TIMEOUT_MS = 3000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStatus(): Promise<HealthStatus> {
    const database = await this.checkDatabase();
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'diagramhq-api',
      timestamp: new Date().toISOString(),
      checks: { database },
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`timed out after ${DATABASE_CHECK_TIMEOUT_MS}ms`)),
            DATABASE_CHECK_TIMEOUT_MS,
          ),
        ),
      ]);
      return 'up';
    } catch (error) {
      this.logger.warn(`database health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return 'down';
    }
  }
}
