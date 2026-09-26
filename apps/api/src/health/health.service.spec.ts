import { describe, expect, it, vi } from 'vitest';
import { HealthService } from './health.service';
import type { PrismaService } from '../database/prisma.service';

const prismaUp = { $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }]) } as unknown as PrismaService;
const prismaDown = { $queryRaw: vi.fn().mockRejectedValue(new Error('no db')) } as unknown as PrismaService;

describe('HealthService', () => {
  it('reports ok when the database responds', async () => {
    const status = await new HealthService(prismaUp).getStatus();
    expect(status.status).toBe('ok');
    expect(status.checks.database).toBe('up');
    expect(status.service).toBe('diagramhq-api');
  });

  it('reports degraded when the database check fails', async () => {
    const status = await new HealthService(prismaDown).getStatus();
    expect(status.status).toBe('degraded');
    expect(status.checks.database).toBe('down');
  });

  it('stamps a round-trippable ISO timestamp', async () => {
    const { timestamp } = await new HealthService(prismaUp).getStatus();
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });
});
