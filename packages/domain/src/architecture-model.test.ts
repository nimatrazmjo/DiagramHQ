import { describe, expect, it } from 'vitest';
import { createId } from './ids';
import type {
  Architecture,
  ModelConnection,
  ModelObject,
  Version,
} from './types';
import {
  addModelConnection,
  addModelObject,
  createArchitectureModel,
  isModelIdentical,
  removeModelConnection,
  removeModelObject,
  updateModelConnection,
  updateModelObject,
  validateArchitectureModel,
} from './architecture-model';
import { InvariantViolationError } from './invariants';

describe('ArchitectureModel Domain Logic (F018)', () => {
  const workspaceId = createId('ws');
  const archId = createId('arch');
  const verId = createId('ver');

  const baseArch: Architecture = {
    id: archId,
    workspaceId,
    name: 'Core Payment System',
    description: 'Handles cards, transfers, and ledger',
    defaultVersionId: verId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseVersion: Version = {
    id: verId,
    architectureId: archId,
    name: 'main',
    kind: 'main',
    status: 'draft',
    createdAt: new Date(),
  };

  const objSys: ModelObject = {
    id: createId('sys'),
    architectureId: archId,
    versionId: verId,
    kind: 'system',
    name: 'Payment Gateway',
    description: 'External payment boundary',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const objApp: ModelObject = {
    id: createId('app'),
    architectureId: archId,
    versionId: verId,
    kind: 'application',
    name: 'Auth Service',
    description: 'JWT token issuer',
    parentId: objSys.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const objStore: ModelObject = {
    id: createId('sto'),
    architectureId: archId,
    versionId: verId,
    kind: 'store',
    name: 'PostgreSQL Database',
    description: 'Primary relational store',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const conn1: ModelConnection = {
    id: createId('con'),
    architectureId: archId,
    versionId: verId,
    sourceObjectId: objApp.id,
    targetObjectId: objStore.id,
    kind: 'data',
    label: 'Queries user credentials',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('creates an architecture model snapshot independent of any diagram (DEC-001)', () => {
    const model = createArchitectureModel(baseArch, baseVersion, [objSys, objApp, objStore], [conn1]);
    expect(model.architecture.id).toBe(archId);
    expect(model.version.id).toBe(verId);
    expect(model.objects).toHaveLength(3);
    expect(model.connections).toHaveLength(1);

    const validation = validateArchitectureModel(model);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  describe('Model Object operations', () => {
    it('adds a model object with valid architectureId and versionId', () => {
      const model = createArchitectureModel(baseArch, baseVersion, [objSys]);
      const next = addModelObject(model, objStore);
      expect(next.objects).toHaveLength(2);
      expect(next.objects[1]?.id).toBe(objStore.id);
    });

    it('rejects adding an object with mismatching architectureId or versionId', () => {
      const model = createArchitectureModel(baseArch, baseVersion);
      const foreignObj: ModelObject = {
        ...objSys,
        architectureId: createId('arch'),
      };
      expect(() => addModelObject(model, foreignObj)).toThrow(InvariantViolationError);
    });

    it('rejects duplicate object ID', () => {
      const model = createArchitectureModel(baseArch, baseVersion, [objSys]);
      expect(() => addModelObject(model, objSys)).toThrow(InvariantViolationError);
    });

    it('rejects adding an object with a non-existent parentId', () => {
      const model = createArchitectureModel(baseArch, baseVersion);
      const objWithMissingParent: ModelObject = {
        ...objApp,
        parentId: createId('sys'),
      };
      expect(() => addModelObject(model, objWithMissingParent)).toThrow(InvariantViolationError);
    });

    it('updates a model object', () => {
      const model = createArchitectureModel(baseArch, baseVersion, [objSys]);
      const next = updateModelObject(model, objSys.id, {
        name: 'Updated Payment Gateway',
        description: 'New description',
      });
      expect(next.objects[0]?.name).toBe('Updated Payment Gateway');
      expect(next.objects[0]?.description).toBe('New description');
    });

    it('removes a model object and cascades removal of its connections (Invariant 4)', () => {
      const model = createArchitectureModel(
        baseArch,
        baseVersion,
        [objSys, objApp, objStore],
        [conn1],
      );
      expect(model.connections).toHaveLength(1);

      // Remove objApp which is source of conn1
      const next = removeModelObject(model, objApp.id);
      expect(next.objects).toHaveLength(2);
      expect(next.objects.find((o) => o.id === objApp.id)).toBeUndefined();
      expect(next.connections).toHaveLength(0); // cascaded
    });
  });

  describe('Model Connection operations', () => {
    it('adds a valid connection between existing objects in model', () => {
      const model = createArchitectureModel(baseArch, baseVersion, [objApp, objStore]);
      const next = addModelConnection(model, conn1);
      expect(next.connections).toHaveLength(1);
      expect(next.connections[0]?.id).toBe(conn1.id);
    });

    it('rejects self-connection (Invariant 1)', () => {
      const model = createArchitectureModel(baseArch, baseVersion, [objApp]);
      const selfConn: ModelConnection = {
        ...conn1,
        sourceObjectId: objApp.id,
        targetObjectId: objApp.id,
      };
      expect(() => addModelConnection(model, selfConn)).toThrow(InvariantViolationError);
    });

    it('rejects connection if source or target does not exist in model', () => {
      const model = createArchitectureModel(baseArch, baseVersion, [objApp]); // objStore is missing
      expect(() => addModelConnection(model, conn1)).toThrow(InvariantViolationError);
    });

    it('updates and removes a connection', () => {
      const model = createArchitectureModel(baseArch, baseVersion, [objApp, objStore], [conn1]);
      const updated = updateModelConnection(model, conn1.id, { label: 'Updated Label' });
      expect(updated.connections[0]?.label).toBe('Updated Label');

      const removed = removeModelConnection(updated, conn1.id);
      expect(removed.connections).toHaveLength(0);
    });
  });

  describe('isModelIdentical equality helper', () => {
    it('returns true for two identical models regardless of object order', () => {
      const m1 = createArchitectureModel(baseArch, baseVersion, [objSys, objApp], [conn1]);
      const m2 = createArchitectureModel(baseArch, baseVersion, [objApp, objSys], [conn1]);
      expect(isModelIdentical(m1, m2)).toBe(true);
    });

    it('returns false if an object attribute differs', () => {
      const m1 = createArchitectureModel(baseArch, baseVersion, [objSys]);
      const m2 = createArchitectureModel(baseArch, baseVersion, [
        { ...objSys, name: 'Different Name' },
      ]);
      expect(isModelIdentical(m1, m2)).toBe(false);
    });

    it('returns false if connections differ', () => {
      const m1 = createArchitectureModel(baseArch, baseVersion, [objApp, objStore], [conn1]);
      const m2 = createArchitectureModel(baseArch, baseVersion, [objApp, objStore], []);
      expect(isModelIdentical(m1, m2)).toBe(false);
    });
  });
});
