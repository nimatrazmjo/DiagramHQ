import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  service: string;
  timestamp: string;
}

/**
 * Reports service liveness. Deliberately free of HTTP concerns so it can be
 * unit-tested in isolation and reused by other probes (readiness, deep checks).
 */
@Injectable()
export class HealthService {
  getStatus(): HealthStatus {
    return {
      status: 'ok',
      service: 'diagramhq-api',
      timestamp: new Date().toISOString(),
    };
  }
}
