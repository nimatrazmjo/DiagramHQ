import { Injectable } from '@nestjs/common';
import { logWarn } from '../common/logger';
import { withTimeout } from '../common/with-timeout';
import { PrismaService } from '../database/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  checks: { database: 'up' | 'down' };
}

// A network partition (as opposed to a clean connection-refused) can leave
// $queryRaw neither resolving nor rejecting; without a bound, a probe calling
// /health would hang past its own timeout instead of getting a fast "down".
const DATABASE_CHECK_TIMEOUT_MS = 3000;

// Multiple replicas/load balancers typically poll /health every few seconds;
// without this, each poll is an independent live DB round trip -- exactly
// the extra load a struggling DB doesn't need. A short cache means a burst
// of concurrent probes shares one check instead of each triggering its own.
const RESULT_TTL_MS = 2000;

/**
 * Reports service liveness plus a readiness signal for its critical dependency
 * (the database). Kept free of transport concerns so it is unit-testable and
 * reusable by other probes.
 */
@Injectable()
export class HealthService {
  private cached?: { result: HealthStatus; checkedAt: number };
  private inFlight?: Promise<HealthStatus>;

  constructor(private readonly prisma: PrismaService) {}

  async getStatus(): Promise<HealthStatus> {
    if (this.cached && Date.now() - this.cached.checkedAt < RESULT_TTL_MS) {
      return this.cached.result;
    }
    if (this.inFlight) {
      return this.inFlight;
    }
    this.inFlight = this.performCheck().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async performCheck(): Promise<HealthStatus> {
    const database = await this.checkDatabase();
    const result: HealthStatus = {
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'diagramhq-api',
      timestamp: new Date().toISOString(),
      checks: { database },
    };
    this.cached = { result, checkedAt: Date.now() };
    return result;
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await withTimeout(
        this.prisma.$queryRaw`SELECT 1`,
        DATABASE_CHECK_TIMEOUT_MS,
        `timed out after ${DATABASE_CHECK_TIMEOUT_MS}ms`,
      );
      return 'up';
    } catch (error) {
      logWarn('health.database_check_failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      return 'down';
    }
  }
}
