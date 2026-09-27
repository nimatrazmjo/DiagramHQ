import { describe, it, expect } from 'vitest';
import { mergeObjectMetadata, OBJECT_STATUS_OPTIONS } from './object-metadata';

describe('object-metadata domain', () => {
  it('mergeObjectMetadata merges correctly', () => {
    const existing = { foo: 'bar', version: '1.0' };
    const patch = { version: '1.1', owner: 'Team A' };
    const result = mergeObjectMetadata(existing, patch);
    expect(result).toEqual({ foo: 'bar', version: '1.1', owner: 'Team A' });
  });

  it('OBJECT_STATUS_OPTIONS includes active', () => {
    expect(OBJECT_STATUS_OPTIONS).toContain('active');
  });

  it('schema accepts all required fields', () => {
    const meta = mergeObjectMetadata({}, {
      owner: 'Alice',
      team: 'Frontend',
      criticality: 'high',
      dataClassification: 'confidential',
      compliance: ['GDPR'],
      sla: '99.9%',
      rto: '4h',
      rpo: '1h',
      domain: 'Payments',
      documentation: 'http://docs',
      costCenter: 'CC-123'
    });
    expect(meta.owner).toBe('Alice');
    expect(meta.team).toBe('Frontend');
  });
});
