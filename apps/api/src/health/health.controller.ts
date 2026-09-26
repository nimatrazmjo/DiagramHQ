import { Controller, Get } from '@nestjs/common';
import { HealthService, type HealthStatus } from './health.service';

/** Thin transport layer: maps the HTTP route onto the service. No logic here. */
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  check(): HealthStatus {
    return this.health.getStatus();
  }
}
