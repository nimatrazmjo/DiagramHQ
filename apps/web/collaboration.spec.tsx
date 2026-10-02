/**
 * F048 — Real-time collaboration — integration spec.
 *
 * Verifies acceptance criteria from PHASE-06-COLLABORATION.md:
 * - Multiple users edit live; conflict resolution (CRDT/OT)
 * - Test: two clients: an edit in one appears in the other.
 */
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  createId,
  createArchitectureModel,
  createCollabSession,
  applyLocalOperation,
  applyRemoteOperation,
  syncSessions,
  type Architecture,
  type Version,
  type ArchitectureId,
  type VersionId,
  type WorkspaceId,
  type ModelObject,
  type ModelConnection,
  type ConnectionId,
} from '@diagramhq/domain';
import { CollaborationBanner } from './components/canvas/collaboration-banner';

describe('F048 — Real-time collaboration (Web / Integration)', () => {
  const archId = createId('arch') as ArchitectureId;
  const wsId = createId('ws') as WorkspaceId;
  const verId = createId('ver') as VersionId;
  const NOW = new Date('2026-01-01T00:00:00Z');

  const arch: Architecture = {
    id: archId,
    workspaceId: wsId,
    name: 'Cloud Microservices',
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

  const initialModel = createArchitectureModel(arch, ver);

  it('1. establishes multiple collaborative sessions for different team members', () => {
    const sessionAlice = createCollabSession({
      sessionId: 'session_alice',
      userId: 'usr_alice',
      userName: 'Alice Engineer',
      initialModel,
    });

    const sessionBob = createCollabSession({
      sessionId: 'session_bob',
      userId: 'usr_bob',
      userName: 'Bob Architect',
      initialModel,
    });

    expect(sessionAlice.sessionId).toBe('session_alice');
    expect(sessionAlice.userId).toBe('usr_alice');
    expect(sessionAlice.userName).toBe('Alice Engineer');
    expect(sessionAlice.clock).toBe(0);

    expect(sessionBob.sessionId).toBe('session_bob');
    expect(sessionBob.userId).toBe('usr_bob');
    expect(sessionBob.userName).toBe('Bob Architect');
    expect(sessionBob.clock).toBe(0);
  });

  it('2. two clients: an edit in one appears in the other', () => {
    let clientA = createCollabSession({
      sessionId: 'session_a',
      userId: 'usr_alice',
      userName: 'Alice',
      initialModel,
    });

    let clientB = createCollabSession({
      sessionId: 'session_b',
      userId: 'usr_bob',
      userName: 'Bob',
      initialModel,
    });

    // Client A creates an Application object
    const webApp: ModelObject = {
      id: createId('app'),
      architectureId: archId,
      versionId: verId,
      name: 'Customer Web Portal',
      kind: 'application',
      createdAt: NOW,
      updatedAt: NOW,
    };

    const opResult = applyLocalOperation(clientA, {
      type: 'upsert_object',
      payload: webApp as unknown as Record<string, unknown>,
    });

    clientA = opResult.session;
    expect(clientA.model.objects).toHaveLength(1);
    expect(clientB.model.objects).toHaveLength(0);

    // Broadcast operation to Client B
    const remoteRes = applyRemoteOperation(clientB, opResult.operation);
    clientB = remoteRes.session;

    // The edit in Client A now appears in Client B!
    expect(remoteRes.accepted).toBe(true);
    expect(clientB.model.objects).toHaveLength(1);
    expect(clientB.model.objects[0]?.id).toBe(webApp.id);
    expect(clientB.model.objects[0]?.name).toBe('Customer Web Portal');
  });

  it('3. handles concurrent edits and resolves conflicts deterministically via Lamport LWW', () => {
    const sharedObjId = createId('app');
    const baseObject: ModelObject = {
      id: sharedObjId,
      architectureId: archId,
      versionId: verId,
      name: 'Initial Name',
      description: 'Initial description',
      kind: 'application',
      createdAt: NOW,
      updatedAt: NOW,
    };

    const seedModel = createArchitectureModel(arch, ver, [baseObject]);

    let clientA = createCollabSession({
      sessionId: 'session_a',
      userId: 'usr_alice',
      userName: 'Alice',
      initialModel: seedModel,
    });

    let clientB = createCollabSession({
      sessionId: 'session_b',
      userId: 'usr_bob',
      userName: 'Bob',
      initialModel: seedModel,
    });

    // Client A updates description at clock = 1
    const opA = applyLocalOperation(clientA, {
      type: 'upsert_object',
      payload: {
        ...baseObject,
        description: 'Alice updated description',
      },
    });
    clientA = opA.session;

    // Client B updates name at clock = 1, then updates description at clock = 2
    const opB1 = applyLocalOperation(clientB, {
      type: 'upsert_object',
      payload: {
        ...baseObject,
        name: 'Bob renamed component',
      },
    });
    clientB = opB1.session;

    const opB2 = applyLocalOperation(clientB, {
      type: 'upsert_object',
      payload: {
        ...clientB.model.objects[0],
        description: 'Bob updated description later',
      },
    });
    clientB = opB2.session;

    // Synchronize both clients
    const synced = syncSessions(clientA, clientB);
    clientA = synced.clientA;
    clientB = synced.clientB;

    // Name was updated only by Bob -> accepted on both
    expect(clientA.model.objects[0]?.name).toBe('Bob renamed component');
    expect(clientB.model.objects[0]?.name).toBe('Bob renamed component');

    // Description had a concurrent collision; Bob had higher clock (2 > 1) -> Bob's wins deterministically
    expect(clientA.model.objects[0]?.description).toBe('Bob updated description later');
    expect(clientB.model.objects[0]?.description).toBe('Bob updated description later');

    // Identical models on both clients
    expect(clientA.model.objects).toEqual(clientB.model.objects);
  });

  it('4. synchronizes complex multi-entity graph mutations across three peers', () => {
    let peerA = createCollabSession({
      sessionId: 'peer_a',
      userId: 'usr_a',
      userName: 'Alice',
      initialModel,
    });

    let peerB = createCollabSession({
      sessionId: 'peer_b',
      userId: 'usr_b',
      userName: 'Bob',
      initialModel,
    });

    let peerC = createCollabSession({
      sessionId: 'peer_c',
      userId: 'usr_c',
      userName: 'Charlie',
      initialModel,
    });

    // Peer A adds API Gateway
    const gateway: ModelObject = {
      id: createId('app'),
      architectureId: archId,
      versionId: verId,
      name: 'API Gateway',
      kind: 'application',
      createdAt: NOW,
      updatedAt: NOW,
    };
    const opA = applyLocalOperation(peerA, {
      type: 'upsert_object',
      payload: gateway as unknown as Record<string, unknown>,
    });
    peerA = opA.session;

    // Peer B adds Database
    const database: ModelObject = {
      id: createId('sto'),
      architectureId: archId,
      versionId: verId,
      name: 'Postgres DB',
      kind: 'store',
      createdAt: NOW,
      updatedAt: NOW,
    };
    const opB = applyLocalOperation(peerB, {
      type: 'upsert_object',
      payload: database as unknown as Record<string, unknown>,
    });
    peerB = opB.session;

    // Sync A and B, then sync B and C, then sync A and C
    const syncAB = syncSessions(peerA, peerB);
    peerA = syncAB.clientA;
    peerB = syncAB.clientB;

    const syncBC = syncSessions(peerB, peerC);
    peerB = syncBC.clientA;
    peerC = syncBC.clientB;

    const syncAC = syncSessions(peerA, peerC);
    peerA = syncAC.clientA;
    peerC = syncAC.clientB;

    // Now Peer C creates a connection between the two objects
    const conn: ModelConnection = {
      id: createId('con') as ConnectionId,
      architectureId: archId,
      versionId: verId,
      sourceObjectId: gateway.id,
      targetObjectId: database.id,
      kind: 'sync',
      description: 'TCP :5432',
      createdAt: NOW,
      updatedAt: NOW,
    };
    const opC = applyLocalOperation(peerC, {
      type: 'upsert_connection',
      payload: conn as unknown as Record<string, unknown>,
    });
    peerC = opC.session;

    // Broadcast to A and B
    const syncCA = syncSessions(peerC, peerA);
    peerC = syncCA.clientA;
    peerA = syncCA.clientB;

    const syncCB = syncSessions(peerC, peerB);
    peerC = syncCB.clientA;
    peerB = syncCB.clientB;

    // All three peers must have identical 2 objects and 1 connection
    expect(peerA.model.objects).toHaveLength(2);
    expect(peerB.model.objects).toHaveLength(2);
    expect(peerC.model.objects).toHaveLength(2);

    expect(peerA.model.connections).toHaveLength(1);
    expect(peerB.model.connections).toHaveLength(1);
    expect(peerC.model.connections).toHaveLength(1);

    expect(peerA.model.connections[0]?.id).toBe(conn.id);
    expect(peerB.model.connections[0]?.id).toBe(conn.id);
    expect(peerC.model.connections[0]?.id).toBe(conn.id);
  });

  it('5. renders the <CollaborationBanner /> component with live indicators and peer badges', () => {
    const peers = [
      { id: '1', name: 'Alice', color: '#10b981' },
      { id: '2', name: 'Bob', color: '#6366f1' },
    ];

    const html = renderToString(
      <CollaborationBanner
        isConnected={true}
        isSyncing={false}
        peerCount={2}
        peers={peers}
        operationCount={14}
        conflictCount={2}
        currentUserName="Alice"
        onSyncNow={() => {}}
      />,
    );

    expect(html).toContain('data-testid="collab-banner"');
    expect(html).toContain('Live Collaboration');
    expect(html).toContain('2 editors');
    expect(html).toContain('14 ops');
    expect(html).toContain('2 LWW resolved');
    expect(html).toContain('as Alice');
    expect(html).toContain('Sync');
  });
});
