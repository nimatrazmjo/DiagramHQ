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

  it('reports degraded when the database check hangs past the timeout', async () => {
    vi.useFakeTimers();
    try {
      const hangingPrisma = {
        $queryRaw: vi.fn(() => new Promise(() => {})), // never resolves/rejects
      } as unknown as PrismaService;
      const statusPromise = new HealthService(hangingPrisma).getStatus();
      await vi.advanceTimersByTimeAsync(3000);
      const status = await statusPromise;
      expect(status.status).toBe('degraded');
      expect(status.checks.database).toBe('down');
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears its timeout timer once the query resolves, instead of leaking it', async () => {
    vi.useFakeTimers();
    try {
      expect(vi.getTimerCount()).toBe(0);
      await new HealthService(prismaUp).getStatus();
      // A leaked timer (the bug: no clearTimeout on the fast path) would
      // leave this at 1 until the 3s timeout it was scheduled for fires.
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
