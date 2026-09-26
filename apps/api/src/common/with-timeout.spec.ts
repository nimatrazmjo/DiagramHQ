import { describe, expect, it, vi } from 'vitest';
import { withTimeout } from './with-timeout';

describe('withTimeout', () => {
  it('resolves if the inner promise settles before timeout', async () => {
    const result = await withTimeout(Promise.resolve('done'), 1000, 'timed out');
    expect(result).toBe('done');
  });

  it('rejects if the inner promise rejects before timeout', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000, 'timed out')).rejects.toThrow('boom');
  });

  it('rejects with timeout error if the promise takes too long', async () => {
    vi.useFakeTimers();
    try {
      const neverEnding = new Promise<string>(() => {});
      const timed = withTimeout(neverEnding, 100, 'operation timed out');
      const assertion = expect(timed).rejects.toThrow('operation timed out');
      await vi.advanceTimersByTimeAsync(100);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('cleans up timeout timer upon resolution without leaking', async () => {
    vi.useFakeTimers();
    try {
      expect(vi.getTimerCount()).toBe(0);
      await withTimeout(Promise.resolve(42), 5000, 'timed out');
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
