import { describe, it, expect } from 'vitest';
import {
  generateEditProposal,
  applyEditProposal,
  rejectEditProposal,
} from './ai-editing';
import type {
  ArchitectureId,
  VersionId,
  ObjectId,
  ConnectionId,
} from './ids';
import type { ModelObject, ModelConnection } from './types';

describe('AI Natural-Language Editing (F064)', () => {
  const archId = 'arch-demo' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  const serviceA: ModelObject = {
    id: 'app-service-a' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Service A',
    kind: 'application',
    position: { x: 100, y: 200 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const serviceB: ModelObject = {
    id: 'app-service-b' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Service B',
    kind: 'application',
    position: { x: 500, y: 200 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const directConn: ModelConnection = {
    id: 'con-ab-direct' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: serviceA.id,
    targetObjectId: serviceB.id,
    label: 'Direct RPC',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const initialObjects = [serviceA, serviceB];
  const initialConnections = [directConn];

  it('1. Acceptance Test: "add Redis between A and B" proposes exactly that; Reject changes nothing', () => {
    // 1. Generate Proposal
    const proposal = generateEditProposal({
      instruction: 'add Redis between Service A and Service B',
      architectureId: archId,
      versionId: v1,
      currentObjects: initialObjects,
      currentConnections: initialConnections,
    });

    expect(proposal.id).toBeDefined();
    expect(proposal.status).toBe('proposed');
    expect(proposal.instruction).toBe('add Redis between Service A and Service B');
    expect(proposal.rationale).toContain('Redis');
    expect(proposal.rationale).toContain('Service A');
    expect(proposal.rationale).toContain('Service B');

    // Changeset assertions:
    // Added: 1 Redis store object, 2 connections (A->Redis, Redis->B)
    expect(proposal.changes.added.objects).toHaveLength(1);
    const redisObj = proposal.changes.added.objects[0];
    expect(redisObj).toBeDefined();
    expect(redisObj?.name).toBe('Redis');
    expect(redisObj?.kind).toBe('store');
    expect(redisObj?.position.x).toBe(300); // midpoint (100 + 500) / 2
    expect(redisObj?.position.y).toBe(200);

    expect(proposal.changes.added.connections).toHaveLength(2);
    const connAtoRedis = proposal.changes.added.connections[0];
    const connRedisToB = proposal.changes.added.connections[1];
    expect(connAtoRedis?.sourceObjectId).toBe(serviceA.id);
    expect(connAtoRedis?.targetObjectId).toBe(redisObj?.id);
    expect(connRedisToB?.sourceObjectId).toBe(redisObj?.id);
    expect(connRedisToB?.targetObjectId).toBe(serviceB.id);

    // Removed: 1 connection (the direct A->B connection)
    expect(proposal.changes.removed.connectionIds).toContain(directConn.id);
    expect(proposal.changes.removed.objectIds).toHaveLength(0);

    // 2. Rejecting proposal changes nothing
    const rejected = rejectEditProposal(proposal, 'Decided to keep direct gRPC communication');
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('Decided to keep direct gRPC communication');

    // Context remains completely identical
    expect(initialObjects).toHaveLength(2);
    expect(initialConnections).toHaveLength(1);

    // 3. Applying proposal yields updated valid model
    const applied = applyEditProposal(proposal, initialObjects, initialConnections);
    expect(applied.appliedProposal.status).toBe('applied');

    // Model now contains Service A, Service B, and Redis
    expect(applied.updatedObjects).toHaveLength(3);
    const updatedIds = applied.updatedObjects.map((o) => o.id);
    expect(updatedIds).toContain(serviceA.id);
    expect(updatedIds).toContain(serviceB.id);
    expect(updatedIds).toContain(redisObj?.id);

    // Model now contains 2 connections, direct connection was removed
    expect(applied.updatedConnections).toHaveLength(2);
    expect(applied.updatedConnections.some((c) => c.id === directConn.id)).toBe(false);
  });

  it('2. "remove [X]" proposes removing object and all incident connections', () => {
    const proposal = generateEditProposal({
      instruction: 'remove Service B',
      architectureId: archId,
      versionId: v1,
      currentObjects: initialObjects,
      currentConnections: initialConnections,
    });

    expect(proposal.changes.removed.objectIds).toContain(serviceB.id);
    expect(proposal.changes.removed.connectionIds).toContain(directConn.id);

    const { updatedObjects, updatedConnections } = applyEditProposal(
      proposal,
      initialObjects,
      initialConnections
    );
    expect(updatedObjects).toHaveLength(1);
    expect(updatedObjects[0]?.id).toBe(serviceA.id);
    expect(updatedConnections).toHaveLength(0);
  });

  it('3. "rename [X] to [Y]" proposes modifying the object name', () => {
    const proposal = generateEditProposal({
      instruction: 'rename Service A to Payment Gateway',
      architectureId: archId,
      versionId: v1,
      currentObjects: initialObjects,
      currentConnections: initialConnections,
    });

    expect(proposal.changes.modified.objects).toHaveLength(1);
    const mod = proposal.changes.modified.objects[0];
    expect(mod?.id).toBe(serviceA.id);
    expect(mod?.name).toBe('Payment Gateway');

    const { updatedObjects } = applyEditProposal(proposal, initialObjects, initialConnections);
    const updatedA = updatedObjects.find((o) => o.id === serviceA.id);
    expect(updatedA?.name).toBe('Payment Gateway');
  });

  it('4. throws when instruction is empty or object not found', () => {
    expect(() =>
      generateEditProposal({
        instruction: '   ',
        architectureId: archId,
        versionId: v1,
        currentObjects: initialObjects,
        currentConnections: initialConnections,
      })
    ).toThrow('Instruction cannot be empty');

    expect(() =>
      generateEditProposal({
        instruction: 'remove NonExistentService',
        architectureId: archId,
        versionId: v1,
        currentObjects: initialObjects,
        currentConnections: initialConnections,
      })
    ).toThrow("Cannot find object to remove matching 'NonExistentService'");
  });

  it('5. throws when applying an already applied proposal', () => {
    const proposal = generateEditProposal({
      instruction: 'remove Service B',
      architectureId: archId,
      versionId: v1,
      currentObjects: initialObjects,
      currentConnections: initialConnections,
    });

    const { appliedProposal, updatedObjects, updatedConnections } = applyEditProposal(
      proposal,
      initialObjects,
      initialConnections
    );

    expect(() =>
      applyEditProposal(appliedProposal, updatedObjects, updatedConnections)
    ).toThrow('Proposal has already been applied');
  });
});
