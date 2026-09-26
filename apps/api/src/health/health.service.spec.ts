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

  it('caches the result within TTL and does not re-query database', async () => {
    const mockQuery = vi.fn().mockResolvedValue([{ result: 1 }]);
    const mockPrisma = { $queryRaw: mockQuery } as unknown as PrismaService;
    const service = new HealthService(mockPrisma);

    const first = await service.getStatus();
    const second = await service.getStatus();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('refreshes the result after TTL expires', async () => {
    vi.useFakeTimers();
    try {
      const mockQuery = vi.fn().mockResolvedValue([{ result: 1 }]);
      const mockPrisma = { $queryRaw: mockQuery } as unknown as PrismaService;
      const service = new HealthService(mockPrisma);

      await service.getStatus();
      expect(mockQuery).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(2500); // Past 2000ms TTL

      await service.getStatus();
      expect(mockQuery).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('deduplicates concurrent in-flight checks to prevent thundering herd', async () => {
    let resolveQuery: (val: unknown) => void;
    const slowQuery = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveQuery = resolve;
        }),
    );
    const mockPrisma = { $queryRaw: slowQuery } as unknown as PrismaService;
    const service = new HealthService(mockPrisma);

    const call1 = service.getStatus();
    const call2 = service.getStatus();
    const call3 = service.getStatus();

    expect(slowQuery).toHaveBeenCalledTimes(1);

    resolveQuery!([{ result: 1 }]);
    const [res1, res2, res3] = await Promise.all([call1, call2, call3]);

    expect(res1.status).toBe('ok');
    expect(res2).toBe(res1);
    expect(res3).toBe(res1);
    expect(slowQuery).toHaveBeenCalledTimes(1);
  });
});
