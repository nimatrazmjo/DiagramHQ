import { describe, expect, it } from 'vitest';
import { createId } from './ids';
import {
  assertTenantAccess,
  canConnect,
  hasParentCycle,
  TenantAccessDeniedError,
  validateConnection,
  validateViewObject,
} from './invariants';

describe('Domain Invariants', () => {
  describe('canConnect', () => {
    it('allows connection between distinct objects', () => {
      expect(canConnect(createId('sys'), createId('app'))).toBe(true);
    });

    it('rejects self-connection', () => {
      const id = createId('sys');
      expect(canConnect(id, id)).toBe(false);
    });
  });

  describe('validateConnection', () => {
    const arch1 = createId('arch');
    const arch2 = createId('arch');
    const ver1 = createId('ver');
    const ver2 = createId('ver');
    const obj1 = createId('app');
    const obj2 = createId('sto');

    it('validates a connection where both endpoints share architecture and version', () => {
      const res = validateConnection({
        architectureId: arch1,
        versionId: ver1,
        source: { id: obj1, architectureId: arch1, versionId: ver1 },
        target: { id: obj2, architectureId: arch1, versionId: ver1 },
      });
      expect(res.valid).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it('rejects cross-architecture connection', () => {
      const res = validateConnection({
        architectureId: arch1,
        versionId: ver1,
        source: { id: obj1, architectureId: arch1, versionId: ver1 },
        target: { id: obj2, architectureId: arch2, versionId: ver1 },
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('same architecture');
    });

    it('rejects cross-version connection', () => {
      const res = validateConnection({
        architectureId: arch1,
        versionId: ver1,
        source: { id: obj1, architectureId: arch1, versionId: ver1 },
        target: { id: obj2, architectureId: arch1, versionId: ver2 },
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('same version');
    });

    it('rejects self connection in validateConnection', () => {
      const res = validateConnection({
        architectureId: arch1,
        versionId: ver1,
        source: { id: obj1, architectureId: arch1, versionId: ver1 },
        target: { id: obj1, architectureId: arch1, versionId: ver1 },
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Self-connection');
    });
  });

  describe('hasParentCycle', () => {
    it('returns false when there is no parent', () => {
      const objA = createId('grp');
      expect(hasParentCycle(objA, null, () => null)).toBe(false);
    });

    it('detects direct self-parenting', () => {
      const objA = createId('grp');
      expect(hasParentCycle(objA, objA, () => null)).toBe(true);
    });

    it('detects indirect cycles', () => {
      const objA = createId('grp');
      const objB = createId('grp');
      const objC = createId('grp');

      // Hierarchy: C -> B -> A. If we try to make A's parent C:
      const parents = new Map([
        [objB, objA],
        [objC, objB],
      ]);

      expect(hasParentCycle(objA, objC, (id) => parents.get(id))).toBe(true);
      expect(hasParentCycle(objC, objA, (id) => parents.get(id))).toBe(false);
    });
  });

  describe('validateViewObject', () => {
    it('allows an object in a view from the same architecture', () => {
      const arch = createId('arch');
      expect(
        validateViewObject({ architectureId: arch }, { architectureId: arch }),
      ).toBe(true);
    });

    it('rejects an object in a view from a different architecture', () => {
      expect(
        validateViewObject(
          { architectureId: createId('arch') },
          { architectureId: createId('arch') },
        ),
      ).toBe(false);
    });
  });

  describe('assertTenantAccess', () => {
    it('does not throw when orgs match', () => {
      const org = createId('org');
      expect(() => assertTenantAccess(org, org)).not.toThrow();
    });

    it('throws TenantAccessDeniedError when orgs differ', () => {
      const org1 = createId('org');
      const org2 = createId('org');
      expect(() => assertTenantAccess(org1, org2)).toThrow(TenantAccessDeniedError);
    });
  });
});
