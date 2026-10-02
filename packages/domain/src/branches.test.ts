import { describe, it, expect } from 'vitest';
import {
  createMainBranch,
  forkBranch,
  addObjectToBranch,
  removeObjectFromBranch,
  addConnectionToBranch,
  addAdrToBranch,
  addCommentToBranch,
  updateBranchMetadata,
  type BranchAdr,
} from './branches';
import type {
  WorkspaceId,
  ArchitectureId,
  ObjectId,
  ConnectionId,
  VersionId,
  ViewId,
  FlowId,
} from './ids';
import type { ModelObject, ModelConnection, View, FlowWithSteps } from './types';
import type { Comment } from './comments';

describe('Architecture Branches Domain Engine (F057)', () => {
  const wsId = 'ws_mock123' as WorkspaceId;
  const archId = 'arch_mock123' as ArchitectureId;
  const verId = 'ver_mock123' as VersionId;

  const mockObject1: ModelObject = {
    id: 'app-gateway' as ObjectId,
    architectureId: archId,
    versionId: verId,
    name: 'Auth API Gateway',
    kind: 'application',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const mockObject2: ModelObject = {
    id: 'sto-db' as ObjectId,
    architectureId: archId,
    versionId: verId,
    name: 'Primary PostgreSQL Database',
    kind: 'datastore',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const mockConnection: ModelConnection = {
    id: 'con-1' as ConnectionId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: mockObject1.id,
    targetObjectId: mockObject2.id,
    label: 'SQL Queries',
    kind: 'sync',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const mockView: View = {
    id: 'vw-1' as ViewId,
    architectureId: archId,
    name: 'Core System View',
    kind: 'context',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const mockFlow: FlowWithSteps = {
    id: 'flw-1' as FlowId,
    architectureId: archId,
    name: 'Customer Authentication',
    type: 'api_flow',
    steps: [
      {
        id: 'fst-1',
        flowId: 'flw-1' as FlowId,
        connectionId: mockConnection.id,
        order: 1,
        label: 'Submit credentials',
      },
    ],
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const mockAdr: BranchAdr = {
    id: 'adr_1',
    title: 'ADR-0001: Adopt Postgres for Relational Storage',
    status: 'accepted',
    context: 'We require ACID transactions for customer accounts.',
    decision: 'PostgreSQL 16 managed instance on AWS RDS.',
    consequences: 'Scalable horizontal read replicas; requires connection pooling.',
    createdAt: new Date('2026-10-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-01T00:00:00Z').toISOString(),
  };

  const mockComment: Comment = {
    id: 'cmt_1',
    workspaceId: wsId,
    targetType: 'object',
    targetId: mockObject1.id,
    author: { id: 'usr_1', name: 'Alice Architecture' },
    content: 'Ensure rate limiting is configured at edge.',
    parentCommentId: null,
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: 1000,
    updatedAt: 1000,
  };

  it('1. creates main branch carrying all architecture dimensions', () => {
    const mainBranch = createMainBranch(wsId, archId, {
      objects: [mockObject1, mockObject2],
      connections: [mockConnection],
      views: [mockView],
      flows: [mockFlow],
      metadata: { environment: 'production', ownerTeam: 'Platform Team' },
      adrs: [mockAdr],
      comments: [mockComment],
    });

    expect(mainBranch.name).toBe('main');
    expect(mainBranch.parentBranchId).toBeNull();
    expect(mainBranch.status).toBe('active');
    expect(mainBranch.state.objects).toHaveLength(2);
    expect(mainBranch.state.connections).toHaveLength(1);
    expect(mainBranch.state.views).toHaveLength(1);
    expect(mainBranch.state.flows).toHaveLength(1);
    expect(mainBranch.state.metadata.environment).toBe('production');
    expect(mainBranch.state.adrs).toHaveLength(1);
    expect(mainBranch.state.comments).toHaveLength(1);
  });

  it('2. Acceptance Test: a branch is independent of main', () => {
    const mainBranch = createMainBranch(wsId, archId, {
      objects: [mockObject1],
      connections: [],
      views: [mockView],
      flows: [mockFlow],
      metadata: { version: '1.0.0' },
      adrs: [mockAdr],
      comments: [mockComment],
    });

    // Fork a feature branch off main
    const featBranch = forkBranch(mainBranch, 'feat/microservices', {
      description: 'Splitting monolith into microservices',
    });

    expect(featBranch.parentBranchId).toBe(mainBranch.id);
    expect(featBranch.name).toBe('feat/microservices');

    // Mutate the feature branch by adding an object, connection, ADR, comment, and updating metadata
    const newService: ModelObject = {
      id: 'app-billing' as ObjectId,
      architectureId: archId,
      versionId: verId,
      name: 'Billing Microservice',
      kind: 'application',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    let updatedFeatBranch = addObjectToBranch(featBranch, newService);

    const newConnection: ModelConnection = {
      id: 'con-billing-grpc' as ConnectionId,
      architectureId: archId,
      versionId: verId,
      sourceObjectId: mockObject1.id,
      targetObjectId: newService.id,
      label: 'gRPC event stream',
      kind: 'sync',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };
    updatedFeatBranch = addConnectionToBranch(updatedFeatBranch, newConnection);

    const newAdr: BranchAdr = {
      id: 'adr_2',
      title: 'ADR-0002: Use Kafka for Billing Events',
      status: 'proposed',
      context: 'Decoupled billing execution requires event queue.',
      decision: 'Deploy Apache Kafka cluster.',
      createdAt: new Date('2026-10-01T00:00:00Z').toISOString(),
      updatedAt: new Date('2026-10-01T00:00:00Z').toISOString(),
    };
    updatedFeatBranch = addAdrToBranch(updatedFeatBranch, newAdr);

    const newComment: Comment = {
      id: 'cmt_2',
      workspaceId: wsId,
      targetType: 'object',
      targetId: newService.id,
      author: { id: 'usr_2', name: 'Bob Lead' },
      content: 'Needs TLS termination review.',
      parentCommentId: null,
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: 2000,
      updatedAt: 2000,
    };
    updatedFeatBranch = addCommentToBranch(updatedFeatBranch, newComment);
    updatedFeatBranch = updateBranchMetadata(updatedFeatBranch, { version: '2.0.0-preview' });

    // Assert that the feature branch has the additions
    expect(updatedFeatBranch.state.objects).toHaveLength(2);
    expect(updatedFeatBranch.state.connections).toHaveLength(1);
    expect(updatedFeatBranch.state.adrs).toHaveLength(2);
    expect(updatedFeatBranch.state.comments).toHaveLength(2);
    expect(updatedFeatBranch.state.metadata.version).toBe('2.0.0-preview');

    // CRITICAL ACCEPTANCE CRITERIA: Main branch is completely unaffected and independent
    expect(mainBranch.state.objects).toHaveLength(1);
    expect(mainBranch.state.connections).toHaveLength(0);
    expect(mainBranch.state.adrs).toHaveLength(1);
    expect(mainBranch.state.comments).toHaveLength(1);
    expect(mainBranch.state.metadata.version).toBe('1.0.0');
    expect(mainBranch.state.objects.map((o) => o.name)).not.toContain('Billing Microservice');
  });

  it('3. cascading deletion on branch does not affect main branch', () => {
    const mainBranch = createMainBranch(wsId, archId, {
      objects: [mockObject1, mockObject2],
      connections: [mockConnection],
    });

    const experimentBranch = forkBranch(mainBranch, 'experiment/remove-db');
    const prunedBranch = removeObjectFromBranch(experimentBranch, mockObject2.id);

    // Pruned branch has object and connection removed
    expect(prunedBranch.state.objects).toHaveLength(1);
    expect(prunedBranch.state.objects[0].id).toBe(mockObject1.id);
    expect(prunedBranch.state.connections).toHaveLength(0);

    // Main branch retains object and connection
    expect(mainBranch.state.objects).toHaveLength(2);
    expect(mainBranch.state.connections).toHaveLength(1);
  });

  it('4. throws on invalid branch name or duplicate names', () => {
    const mainBranch = createMainBranch(wsId, archId);

    expect(() => forkBranch(mainBranch, '')).toThrow('Branch name cannot be empty');
    expect(() => forkBranch(mainBranch, '   ')).toThrow('Branch name cannot be empty');
    expect(() => forkBranch(mainBranch, 'main')).toThrow("Cannot fork branch with identical name 'main'");
  });
});
