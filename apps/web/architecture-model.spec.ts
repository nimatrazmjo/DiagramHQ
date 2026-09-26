import { describe, expect, it, vi } from 'vitest';
import {
  createArchitectureModel,
  createId,
  isModelIdentical,
  type Architecture,
  type ArchitectureModel,
  type ModelObject,
  type Version,
} from '@diagramhq/domain';
import { ArchitectureModelClient } from './lib/model/architecture-model-client';

describe('ArchitectureModelClient & Optimistic Rollback (F018)', () => {
  const workspaceId = createId('ws');
  const archId = createId('arch');
  const verId = createId('ver');

  const initialArch: Architecture = {
    id: archId,
    workspaceId,
    name: 'Logistics Architecture',
    description: 'Fleet and warehouse management',
    defaultVersionId: verId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const initialVersion: Version = {
    id: verId,
    architectureId: archId,
    name: 'main',
    kind: 'main',
    status: 'draft',
    createdAt: new Date(),
  };

  const sampleObjSys: ModelObject = {
    id: createId('sys'),
    architectureId: archId,
    versionId: verId,
    kind: 'system',
    name: 'Warehouse Management System',
    description: 'Tracks inventory and pallets',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleObjApp: ModelObject = {
    id: createId('app'),
    architectureId: archId,
    versionId: verId,
    kind: 'application',
    name: 'Inventory Scanner API',
    description: 'Barcodes & RFID ingestion',
    parentId: sampleObjSys.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createInitialModel = (): ArchitectureModel =>
    createArchitectureModel(initialArch, initialVersion, [sampleObjSys, sampleObjApp]);

  describe('1. Model State & Layer Boundary Isolation (Rule 4)', () => {
    it('initializes with model snapshot and provides getModel()', () => {
      const client = new ArchitectureModelClient(createInitialModel());
      const model = client.getModel();
      expect(model).not.toBeNull();
      expect(model?.architecture.id).toBe(archId);
      expect(model?.objects).toHaveLength(2);
      expect(model?.connections).toHaveLength(0);
    });

    it('notifies subscribers on model updates', async () => {
      const client = new ArchitectureModelClient(createInitialModel());
      const listener = vi.fn();
      const unsubscribe = client.subscribe(listener);

      await client.createObject({ name: 'Forklift Telemetry', kind: 'store' });
      expect(listener).toHaveBeenCalled();

      unsubscribe();
      await client.createObject({ name: 'Delivery Dispatcher', kind: 'application' });
      expect(listener).toHaveBeenCalledTimes(1); // not called again after unsubscribe
    });
  });

  describe('2. Optimistic Writes & Rollback on Error (Acceptance Criteria)', () => {
    it('optimistically adds an object, and rolls back if persistFn rejects', async () => {
      const client = new ArchitectureModelClient(createInitialModel());
      expect(client.getModel()?.objects).toHaveLength(2);

      const failingPersist = vi.fn().mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(
        client.createObject(
          { name: 'Failing Store', kind: 'store' },
          failingPersist,
        ),
      ).rejects.toThrow('500 Internal Server Error');

      // Verified rollback: object count restored to 2, failing store not in model
      const model = client.getModel();
      expect(model?.objects).toHaveLength(2);
      expect(model?.objects.some((o) => o.name === 'Failing Store')).toBe(false);
    });

    it('optimistically updates an object, and rolls back if persistFn rejects', async () => {
      const client = new ArchitectureModelClient(createInitialModel());
      const origName = sampleObjSys.name;

      const failingPersist = vi.fn().mockRejectedValue(new Error('Network timeout'));

      await expect(
        client.updateObject(
          sampleObjSys.id,
          { name: 'Tentative Name Change' },
          failingPersist,
        ),
      ).rejects.toThrow('Network timeout');

      // Verified rollback: name reverted to original
      const updated = client.getModel()?.objects.find((o) => o.id === sampleObjSys.id);
      expect(updated?.name).toBe(origName);
    });

    it('optimistically deletes an object with cascade, and rolls back on failure', async () => {
      const client = new ArchitectureModelClient(createInitialModel());

      // Create a connection first
      const conn = await client.createConnection({
        sourceObjectId: sampleObjApp.id,
        targetObjectId: sampleObjSys.id,
        kind: 'sync',
      });
      expect(client.getModel()?.connections).toHaveLength(1);

      const failingPersist = vi.fn().mockRejectedValue(new Error('Delete forbidden'));

      // Attempt to delete sampleObjApp
      await expect(
        client.deleteObject(sampleObjApp.id, failingPersist),
      ).rejects.toThrow('Delete forbidden');

      // Verified rollback: both the object AND its cascaded connection are restored
      const model = client.getModel();
      expect(model?.objects.find((o) => o.id === sampleObjApp.id)).toBeDefined();
      expect(model?.connections.find((c) => c.id === conn.id)).toBeDefined();
    });

    it('optimistically creates a connection, and rolls back if persistFn rejects', async () => {
      const client = new ArchitectureModelClient(createInitialModel());
      expect(client.getModel()?.connections).toHaveLength(0);

      const failingPersist = vi.fn().mockRejectedValue(new Error('Connection persist error'));

      await expect(
        client.createConnection(
          {
            sourceObjectId: sampleObjApp.id,
            targetObjectId: sampleObjSys.id,
            kind: 'data',
          },
          failingPersist,
        ),
      ).rejects.toThrow('Connection persist error');

      // Verified rollback: connections remains empty
      expect(client.getModel()?.connections).toHaveLength(0);
    });
  });

  describe('3. Save, Reload, and Model Identity (F018 Acceptance Criteria)', () => {
    it('proves create -> reload yields an identical model', async () => {
      const client = new ArchitectureModelClient(createInitialModel());

      // 1. Mutate client model: add a store and a connection
      const storeObj = await client.createObject({
        name: 'Postgres DB',
        kind: 'store',
        description: 'Inventory relational DB',
      });

      const conn = await client.createConnection({
        sourceObjectId: sampleObjApp.id,
        targetObjectId: storeObj.id,
        kind: 'data',
        label: 'Reads and writes inventory',
      });

      const savedSnapshot = client.getModel()!;

      // 2. Simulate reloading the model from server/database
      const reloadedModel: ArchitectureModel = {
        architecture: { ...savedSnapshot.architecture },
        version: { ...savedSnapshot.version },
        // Reordered objects and connections as might come from DB query
        objects: [savedSnapshot.objects[2]!, savedSnapshot.objects[0]!, savedSnapshot.objects[1]!],
        connections: [conn],
      };

      // 3. Verify identical model
      expect(client.isIdenticalTo(reloadedModel)).toBe(true);
      expect(isModelIdentical(savedSnapshot, reloadedModel)).toBe(true);
    });
  });

  describe('4. Canvas Projection Bridge', () => {
    it('projects model objects and connections to canvas nodes and edges', async () => {
      const client = new ArchitectureModelClient(createInitialModel());
      await client.createConnection({
        sourceObjectId: sampleObjApp.id,
        targetObjectId: sampleObjSys.id,
        kind: 'sync',
      });

      const { nodes, edges } = client.toCanvasProjection([
        { objectId: sampleObjSys.id, x: 100, y: 100 },
        { objectId: sampleObjApp.id, x: 200, y: 200 },
      ]);

      expect(nodes).toHaveLength(2);
      expect(edges).toHaveLength(1);
      expect(nodes.find((n) => n.id === sampleObjSys.id)?.position).toEqual({ x: 100, y: 100 });
      expect(nodes.find((n) => n.id === sampleObjApp.id)?.position).toEqual({ x: 200, y: 200 });
    });
  });
});
