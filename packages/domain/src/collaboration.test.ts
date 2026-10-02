import { describe, expect, it } from 'vitest';
import { createArchitectureModel } from './architecture-model';
import {
  applyLocalOperation,
  applyRemoteOperation,
  compareLamport,
  createCollabSession,
  syncSessions,
  type LamportTag,
} from './collaboration';
import { createId } from './ids';
import type {
  Architecture,
  ArchitectureId,
  ArchitectureModel,
  ModelConnection,
  ModelObject,
  Version,
  VersionId,
  WorkspaceId,
} from './types';

describe('Real-Time Collaboration & Conflict Resolution (F048)', () => {
  const archId = createId('arch') as ArchitectureId;
  const wsId = createId('ws') as WorkspaceId;
  const verId = createId('ver') as VersionId;
  const NOW = new Date('2026-01-01T00:00:00Z');

  const arch: Architecture = {
    id: archId,
    workspaceId: wsId,
    name: 'Distributed Platform',
    createdAt: NOW,
    updatedAt: NOW,
  };

  const ver: Version = {
    id: verId,
    architectureId: archId,
    name: 'main',
    kind: 'main',
    status: 'approved',
    createdAt: NOW,
  };

  const initialModel: ArchitectureModel = createArchitectureModel(arch, ver);

  describe('compareLamport', () => {
    it('prefers higher lamport clock', () => {
      const tag1: LamportTag = { lamportClock: 1, timestamp: 100, sessionId: 'client-b' };
      const tag2: LamportTag = { lamportClock: 2, timestamp: 50, sessionId: 'client-a' };
      expect(compareLamport(tag2, tag1)).toBeGreaterThan(0);
      expect(compareLamport(tag1, tag2)).toBeLessThan(0);
    });

    it('prefers higher timestamp on clock tie', () => {
      const tag1: LamportTag = { lamportClock: 2, timestamp: 100, sessionId: 'client-b' };
      const tag2: LamportTag = { lamportClock: 2, timestamp: 200, sessionId: 'client-a' };
      expect(compareLamport(tag2, tag1)).toBeGreaterThan(0);
    });

    it('tie-breaks on session id when clock and timestamp are equal', () => {
      const tag1: LamportTag = { lamportClock: 2, timestamp: 100, sessionId: 'client-a' };
      const tag2: LamportTag = { lamportClock: 2, timestamp: 100, sessionId: 'client-b' };
      expect(compareLamport(tag2, tag1)).toBeGreaterThan(0);
    });
  });

  describe('createCollabSession & applyLocalOperation', () => {
    it('initializes session and applies local object insertion', () => {
      let session = createCollabSession({
        userId: 'usr_alice',
        userName: 'Alice',
        initialModel,
      });

      expect(session.clock).toBe(0);
      expect(session.model.objects).toHaveLength(0);

      const obj: ModelObject = {
        id: createId('app'),
        architectureId: archId,
        versionId: verId,
        name: 'Auth Gateway',
        kind: 'application',
        createdAt: NOW,
        updatedAt: NOW,
      };

      const result = applyLocalOperation(session, {
        type: 'upsert_object',
        payload: obj as unknown as Record<string, unknown>,
      });

      session = result.session;
      expect(session.clock).toBe(1);
      expect(session.model.objects).toHaveLength(1);
      expect(session.model.objects[0]?.name).toBe('Auth Gateway');
      expect(result.operation.lamportClock).toBe(1);
      expect(result.operation.userId).toBe('usr_alice');
    });
  });

  describe('applyRemoteOperation', () => {
    it('applies remote operation and syncs Lamport clock', () => {
      const sessionAlice = createCollabSession({
        userId: 'usr_alice',
        userName: 'Alice',
        initialModel,
      });

      let sessionBob = createCollabSession({
        userId: 'usr_bob',
        userName: 'Bob',
        initialModel,
      });

      const obj: ModelObject = {
        id: createId('app'),
        architectureId: archId,
        versionId: verId,
        name: 'Order Service',
        kind: 'application',
        createdAt: NOW,
        updatedAt: NOW,
      };

      const { operation } = applyLocalOperation(sessionAlice, {
        type: 'upsert_object',
        payload: obj as unknown as Record<string, unknown>,
      });

      const res = applyRemoteOperation(sessionBob, operation);
      sessionBob = res.session;

      expect(res.accepted).toBe(true);
      expect(sessionBob.model.objects).toHaveLength(1);
      expect(sessionBob.model.objects[0]?.name).toBe('Order Service');
      expect(sessionBob.clock).toBeGreaterThan(operation.lamportClock);
    });

    it('is idempotent for duplicated operations', () => {
      let sessionBob = createCollabSession({
        userId: 'usr_bob',
        userName: 'Bob',
        initialModel,
      });

      const obj: ModelObject = {
        id: createId('app'),
        architectureId: archId,
        versionId: verId,
        name: 'Inventory Svc',
        kind: 'application',
        createdAt: NOW,
        updatedAt: NOW,
      };

      const sessionAlice = createCollabSession({
        userId: 'usr_alice',
        userName: 'Alice',
        initialModel,
      });

      const { operation } = applyLocalOperation(sessionAlice, {
        type: 'upsert_object',
        payload: obj as unknown as Record<string, unknown>,
      });

      const res1 = applyRemoteOperation(sessionBob, operation);
      sessionBob = res1.session;
      expect(res1.accepted).toBe(true);
      expect(sessionBob.model.objects).toHaveLength(1);

      // Repeat application
      const res2 = applyRemoteOperation(sessionBob, operation);
      expect(res2.accepted).toBe(false);
      expect(res2.session.model.objects).toHaveLength(1);
    });
  });

  describe('conflict resolution (CRDT / LWW)', () => {
    it('resolves concurrent property updates with deterministic Last-Write-Wins', () => {
      const objId = createId('app');
      const baseObj: ModelObject = {
        id: objId,
        architectureId: archId,
        versionId: verId,
        name: 'Payment Service',
        description: 'Original description',
        kind: 'application',
        createdAt: NOW,
        updatedAt: NOW,
      };

      const baseModel = createArchitectureModel(arch, ver, [baseObj]);

      let clientA = createCollabSession({
        sessionId: 'session_A',
        userId: 'usr_alice',
        userName: 'Alice',
        initialModel: baseModel,
      });

      let clientB = createCollabSession({
        sessionId: 'session_B',
        userId: 'usr_bob',
        userName: 'Bob',
        initialModel: baseModel,
      });

      // Client A renames to "Payments V1" (clock = 1)
      const opA = applyLocalOperation(clientA, {
        type: 'upsert_object',
        payload: {
          ...baseObj,
          name: 'Payments V1',
        },
      });
      clientA = opA.session;

      // Client B performs 2 actions, advancing clock to 2, and names it "Payments Core"
      const dummyOp = applyLocalOperation(clientB, {
        type: 'update_object_position',
        payload: { objectId: objId, x: 100, y: 150 },
      });
      clientB = dummyOp.session;

      const opB = applyLocalOperation(clientB, {
        type: 'upsert_object',
        payload: {
          ...baseObj,
          name: 'Payments Core',
        },
      });
      clientB = opB.session;

      // Now sync sessions in both directions
      const synced = syncSessions(clientA, clientB);
      clientA = synced.clientA;
      clientB = synced.clientB;

      // Both must converge to "Payments Core" because B had the higher Lamport clock
      expect(clientA.model.objects[0]?.name).toBe('Payments Core');
      expect(clientB.model.objects[0]?.name).toBe('Payments Core');
      expect(clientA.model.objects[0]?.name).toBe(clientB.model.objects[0]?.name);
    });
  });

  describe('syncSessions convergence across multi-client workflow', () => {
    it('two clients: an edit in one appears in the other', () => {
      let clientA = createCollabSession({
        userId: 'usr_alice',
        userName: 'Alice',
        initialModel,
      });

      let clientB = createCollabSession({
        userId: 'usr_bob',
        userName: 'Bob',
        initialModel,
      });

      // Alice adds User Client and Web App
      const userObj: ModelObject = {
        id: createId('act'),
        architectureId: archId,
        versionId: verId,
        name: 'Browser User',
        kind: 'actor',
        createdAt: NOW,
        updatedAt: NOW,
      };

      const webAppObj: ModelObject = {
        id: createId('app'),
        architectureId: archId,
        versionId: verId,
        name: 'Web Application',
        kind: 'application',
        createdAt: NOW,
        updatedAt: NOW,
      };

      const op1 = applyLocalOperation(clientA, {
        type: 'upsert_object',
        payload: userObj as unknown as Record<string, unknown>,
      });
      clientA = op1.session;

      const op2 = applyLocalOperation(clientA, {
        type: 'upsert_object',
        payload: webAppObj as unknown as Record<string, unknown>,
      });
      clientA = op2.session;

      // Bob adds Database
      const dbObj: ModelObject = {
        id: createId('sto'),
        architectureId: archId,
        versionId: verId,
        name: 'PostgreSQL DB',
        kind: 'store',
        createdAt: NOW,
        updatedAt: NOW,
      };

      const op3 = applyLocalOperation(clientB, {
        type: 'upsert_object',
        payload: dbObj as unknown as Record<string, unknown>,
      });
      clientB = op3.session;

      // Sync A and B
      const synced1 = syncSessions(clientA, clientB);
      clientA = synced1.clientA;
      clientB = synced1.clientB;

      expect(clientA.model.objects).toHaveLength(3);
      expect(clientB.model.objects).toHaveLength(3);

      // Alice now connects Browser User -> Web App
      const conn: ModelConnection = {
        id: createId('con'),
        architectureId: archId,
        versionId: verId,
        sourceObjectId: userObj.id,
        targetObjectId: webAppObj.id,
        kind: 'sync',
        description: 'HTTPS',
        createdAt: NOW,
        updatedAt: NOW,
      };

      const op4 = applyLocalOperation(clientA, {
        type: 'upsert_connection',
        payload: conn as unknown as Record<string, unknown>,
      });
      clientA = op4.session;

      // Bob moves the Database position
      const op5 = applyLocalOperation(clientB, {
        type: 'update_object_position',
        payload: { objectId: dbObj.id, x: 500, y: 350 },
      });
      clientB = op5.session;

      // Final Sync
      const synced2 = syncSessions(clientA, clientB);
      clientA = synced2.clientA;
      clientB = synced2.clientB;

      // Assert full convergence
      expect(clientA.model.connections).toHaveLength(1);
      expect(clientB.model.connections).toHaveLength(1);
      expect(clientA.model.connections[0]?.id).toBe(conn.id);
      expect(clientB.model.connections[0]?.id).toBe(conn.id);

      const dbPosA = clientA.viewObjects.find((vo) => vo.objectId === dbObj.id);
      const dbPosB = clientB.viewObjects.find((vo) => vo.objectId === dbObj.id);
      expect(dbPosA?.x).toBe(500);
      expect(dbPosA?.y).toBe(350);
      expect(dbPosB?.x).toBe(500);
      expect(dbPosB?.y).toBe(350);
    });

    it('cascades deletion across clients in real-time', () => {
      const objA: ModelObject = {
        id: createId('app'),
        architectureId: archId,
        versionId: verId,
        name: 'Service A',
        kind: 'application',
        createdAt: NOW,
        updatedAt: NOW,
      };

      const objB: ModelObject = {
        id: createId('app'),
        architectureId: archId,
        versionId: verId,
        name: 'Service B',
        kind: 'application',
        createdAt: NOW,
        updatedAt: NOW,
      };

      const conn: ModelConnection = {
        id: createId('con'),
        architectureId: archId,
        versionId: verId,
        sourceObjectId: objA.id,
        targetObjectId: objB.id,
        kind: 'sync',
        createdAt: NOW,
        updatedAt: NOW,
      };

      const baseModel = createArchitectureModel(arch, ver, [objA, objB], [conn]);

      let clientA = createCollabSession({
        userId: 'usr_alice',
        userName: 'Alice',
        initialModel: baseModel,
      });

      let clientB = createCollabSession({
        userId: 'usr_bob',
        userName: 'Bob',
        initialModel: baseModel,
      });

      // Alice deletes Service A
      const deleteOp = applyLocalOperation(clientA, {
        type: 'delete_object',
        payload: { objectId: objA.id },
      });
      clientA = deleteOp.session;

      // Sync to Bob
      const synced = syncSessions(clientA, clientB);
      clientA = synced.clientA;
      clientB = synced.clientB;

      // Both should have removed Service A and the dangling connection
      expect(clientA.model.objects).toHaveLength(1);
      expect(clientB.model.objects).toHaveLength(1);
      expect(clientA.model.connections).toHaveLength(0);
      expect(clientB.model.connections).toHaveLength(0);
      expect(clientB.model.objects[0]?.id).toBe(objB.id);
    });
  });
});
