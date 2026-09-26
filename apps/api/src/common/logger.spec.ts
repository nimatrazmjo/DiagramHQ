import { describe, expect, it, vi } from 'vitest';
import { logError, logInfo, logWarn } from './logger';

describe('structured logger', () => {
  it('formats info log with ts, level, event and fields', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      logInfo('test.event', { key: 'value' });
      expect(logSpy).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(logSpy.mock.calls[0]![0] as string);
      expect(parsed.level).toBe('info');
      expect(parsed.event).toBe('test.event');
      expect(parsed.key).toBe('value');
      expect(typeof parsed.ts).toBe('string');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('formats warn log to console.log', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      logWarn('warning.event', { reason: 'slow' });
      expect(logSpy).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(logSpy.mock.calls[0]![0] as string);
      expect(parsed.level).toBe('warn');
      expect(parsed.event).toBe('warning.event');
      expect(parsed.reason).toBe('slow');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('formats error log to console.error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      logError('failure.event', { status: 500 });
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(errorSpy.mock.calls[0]![0] as string);
      expect(parsed.level).toBe('error');
      expect(parsed.event).toBe('failure.event');
      expect(parsed.status).toBe(500);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
