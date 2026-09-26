import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService, type HealthStatus } from './health.service';

/**
 * Thin transport layer: maps the HTTP route onto the service. The one bit of
 * logic here is deliberate -- a degraded check must fail the HTTP status too
 * (503), not just the body, so readiness/liveness probes that key off status
 * codes (not body content) actually notice.
 *
 * This uses @Res() instead of throwing through AllExceptionsFilter on
 * purpose: throwing would replace this diagnostic body (which check failed,
 * when) with the filter's generic `{ error: { code, message } }` envelope --
 * fine for an actual error, but health reporting "degraded" isn't an error
 * in that sense, and losing the detail is exactly what a probe/operator
 * needs to see.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthStatus> {
    const result = await this.health.getStatus();
    res.status(result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return result;
  }
}
