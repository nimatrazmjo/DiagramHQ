import { describe, it, expect } from 'vitest';
import { createRichConnectionMetadata, isRichConnection, RICH_CONNECTION_PROTOCOLS } from './connection';

describe('connection domain', () => {
  it('createRichConnectionMetadata sets fields correctly', () => {
    const meta = createRichConnectionMetadata({ protocol: 'HTTP', port: 8080 });
    expect(meta.protocol).toBe('HTTP');
    expect(meta.port).toBe(8080);
  });

  it('isRichConnection detects presence', () => {
    expect(isRichConnection({ protocol: 'REST' })).toBe(true);
    expect(isRichConnection({ foo: 'bar' })).toBe(false);
    expect(isRichConnection(null)).toBe(false);
  });

  it('RICH_CONNECTION_PROTOCOLS contains expected values', () => {
    expect(RICH_CONNECTION_PROTOCOLS).toContain('HTTP');
    expect(RICH_CONNECTION_PROTOCOLS).toContain('Kafka');
  });
});
