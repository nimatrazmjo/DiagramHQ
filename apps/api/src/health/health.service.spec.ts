import { describe, expect, it } from 'vitest';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports an ok status for the api service', () => {
    const status = new HealthService().getStatus();
    expect(status.status).toBe('ok');
    expect(status.service).toBe('diagramhq-api');
  });

  it('stamps a round-trippable ISO timestamp', () => {
    const { timestamp } = new HealthService().getStatus();
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });
});
