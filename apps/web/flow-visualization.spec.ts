/**
 * F043 — Flow visualization — integration spec.
 *
 * Verifies acceptance criteria from PHASE-05-FLOWS.md:
 * - Highlight the flow path over the existing architecture
 * - Test: flow path renders over the model
 */
import { describe, expect, it } from 'vitest';
import {
  createId,
  createArchitectureModel,
  addModelObject,
  addModelConnection,
  createFlow,
  projectFlowToCanvas,
  type Architecture,
  type Version,
  type ArchitectureId,
  type VersionId,
  type WorkspaceId,
  type ObjectId,
  type ConnectionId,
} from '@diagramhq/domain';

describe('F043 — Flow visualization (Web / Integration)', () => {
  const archId = createId('arch') as ArchitectureId;
  const wsId = createId('ws') as WorkspaceId;
  const verId = createId('ver') as VersionId;
  const NOW = new Date('2026-01-01T00:00:00Z');

  const arch: Architecture = {
    id: archId,
    workspaceId: wsId,
    name: 'Payment Processing Architecture',
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

  // Build a model: Client -> API Gateway -> Auth Service -> Postgres DB
  // Plus an isolated Log Service that does not participate in the flow
  const clientId = createId('app') as ObjectId;
  const gatewayId = createId('app') as ObjectId;
  const authId = createId('app') as ObjectId;
  const dbId = createId('sto') as ObjectId;
  const loggerId = createId('app') as ObjectId;

  const connClientToGwId = createId('con') as ConnectionId;
  const connGwToAuthId = createId('con') as ConnectionId;
  const connAuthToDbId = createId('con') as ConnectionId;
  const connGwToLogId = createId('con') as ConnectionId; // Unrelated to payment flow

  let model = createArchitectureModel(arch, ver);

  model = addModelObject(model, {
    id: clientId,
    architectureId: archId,
    versionId: verId,
    name: 'Web Client',
    kind: 'application',
    parentId: null,
    metadata: { tags: ['react'] },
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelObject(model, {
    id: gatewayId,
    architectureId: archId,
    versionId: verId,
    name: 'Edge API Gateway',
    kind: 'application',
    parentId: null,
    metadata: { tags: ['gateway'] },
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelObject(model, {
    id: authId,
    architectureId: archId,
    versionId: verId,
    name: 'Auth Service',
    kind: 'application',
    parentId: null,
    metadata: { tags: ['auth'] },
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelObject(model, {
    id: dbId,
    architectureId: archId,
    versionId: verId,
    name: 'Accounts Database',
    kind: 'store',
    parentId: null,
    metadata: { tags: ['postgres'] },
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelObject(model, {
    id: loggerId,
    architectureId: archId,
    versionId: verId,
    name: 'Audit Logger',
    kind: 'application',
    parentId: null,
    metadata: { tags: ['logging'] },
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: connClientToGwId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: clientId,
    targetObjectId: gatewayId,
    kind: 'sync',
    description: 'POST /api/pay',
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: connGwToAuthId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: gatewayId,
    targetObjectId: authId,
    kind: 'sync',
    description: 'VerifyToken()',
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: connAuthToDbId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: authId,
    targetObjectId: dbId,
    kind: 'data',
    description: 'Query session',
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: connGwToLogId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: gatewayId,
    targetObjectId: loggerId,
    kind: 'async',
    description: 'Publish access audit log',
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
  });



  const paymentFlow = createFlow(
    {
      architectureId: archId,
      name: 'Card Authorization Sequence',
      description: 'Authorization trace from browser to DB',
      steps: [
        { connectionId: connClientToGwId, stepIndex: 0, note: 'User initiates payment' },
        { connectionId: connGwToAuthId, stepIndex: 1, note: 'Validate credentials' },
        { connectionId: connAuthToDbId, stepIndex: 2, note: 'Verify ledger balance' },
      ],
    },
    model.connections,
  );

  it('projects the model with clear flow path highlighting on canvas nodes', () => {
    const projection = projectFlowToCanvas(model.objects, model.connections, paymentFlow);

    // Participating nodes (Client, Gateway, Auth, DB)
    const clientNode = projection.nodes.find((n) => n.id === clientId)!;
    const gwNode = projection.nodes.find((n) => n.id === gatewayId)!;
    const authNode = projection.nodes.find((n) => n.id === authId)!;
    const dbNode = projection.nodes.find((n) => n.id === dbId)!;
    const loggerNode = projection.nodes.find((n) => n.id === loggerId)!;

    expect(clientNode.data.flowView).toBe(true);
    expect(clientNode.data.isInFlow).toBe(true);
    expect(clientNode.data.flowStepNumbers).toEqual([1]);
    expect(clientNode.data.isDimmed).toBe(false);

    // Gateway is traversed in Step 1 (target) and Step 2 (source)
    expect(gwNode.data.isInFlow).toBe(true);
    expect(gwNode.data.flowStepNumbers).toEqual([1, 2]);

    // Auth is traversed in Step 2 (target) and Step 3 (source)
    expect(authNode.data.isInFlow).toBe(true);
    expect(authNode.data.flowStepNumbers).toEqual([2, 3]);

    // DB is target of Step 3
    expect(dbNode.data.isInFlow).toBe(true);
    expect(dbNode.data.flowStepNumbers).toEqual([3]);

    // Logger is NOT in the flow -> dimmed
    expect(loggerNode.data.isInFlow).toBe(false);
    expect(loggerNode.data.isDimmed).toBe(true);
    expect(loggerNode.data.flowStepNumbers).toEqual([]);
  });

  it('annotates and animates edges along the flow path while dimming unrelated edges', () => {
    const projection = projectFlowToCanvas(model.objects, model.connections, paymentFlow);

    const step1Edge = projection.edges.find((e) => e.id === connClientToGwId)!;
    const step2Edge = projection.edges.find((e) => e.id === connGwToAuthId)!;
    const step3Edge = projection.edges.find((e) => e.id === connAuthToDbId)!;
    const logEdge = projection.edges.find((e) => e.id === connGwToLogId)!;

    // Step 1
    expect(step1Edge.data?.flowView).toBe(true);
    expect(step1Edge.data?.isInFlow).toBe(true);
    expect(step1Edge.animated).toBe(true);
    expect(step1Edge.data?.flowStepNumber).toBe(1);
    expect(step1Edge.data?.flowStepNote).toBe('User initiates payment');
    expect(step1Edge.label).toContain('Step 1: User initiates payment');

    // Step 2
    expect(step2Edge.data?.isInFlow).toBe(true);
    expect(step2Edge.animated).toBe(true);
    expect(step2Edge.data?.flowStepNumber).toBe(2);
    expect(step2Edge.data?.flowStepNote).toBe('Validate credentials');

    // Step 3
    expect(step3Edge.data?.isInFlow).toBe(true);
    expect(step3Edge.animated).toBe(true);
    expect(step3Edge.data?.flowStepNumber).toBe(3);
    expect(step3Edge.data?.flowStepNote).toBe('Verify ledger balance');

    // Non-participating log edge
    expect(logEdge.data?.isInFlow).toBe(false);
    expect(logEdge.data?.isDimmed).toBe(true);
    expect(logEdge.animated).toBe(false);
  });

  it('supports active step highlighting for step scrubber and playback', () => {
    const projection = projectFlowToCanvas(model.objects, model.connections, paymentFlow, undefined, {
      activeStepIndex: 1, // Step 2 (Gateway -> Auth)
    });

    const step1Edge = projection.edges.find((e) => e.id === connClientToGwId)!;
    const step2Edge = projection.edges.find((e) => e.id === connGwToAuthId)!;

    expect(step1Edge.data?.isActiveStep).toBe(false);
    expect(step2Edge.data?.isActiveStep).toBe(true);

    const clientNode = projection.nodes.find((n) => n.id === clientId)!;
    const gwNode = projection.nodes.find((n) => n.id === gatewayId)!;
    const authNode = projection.nodes.find((n) => n.id === authId)!;

    expect(clientNode.data.isActiveStepParticipant).toBe(false);
    expect(gwNode.data.isActiveStepParticipant).toBe(true);
    expect(authNode.data.isActiveStepParticipant).toBe(true);
  });

  it('preserves underlying model state immutably without side effects', () => {
    const beforeObjCount = model.objects.length;
    const beforeConnCount = model.connections.length;

    const projection = projectFlowToCanvas(model.objects, model.connections, paymentFlow);

    expect(projection.nodes.length).toBe(beforeObjCount);
    expect(projection.edges.length).toBe(beforeConnCount);
    expect(model.objects.length).toBe(beforeObjCount);
    expect(model.connections.length).toBe(beforeConnCount);
  });
});
