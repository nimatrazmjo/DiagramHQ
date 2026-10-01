/**
 * F042 — Flow steps — integration spec.
 *
 * Verifies acceptance criteria:
 * - Add/reorder/annotate steps; each step references a connection
 * - Test: steps stay ordered; notes persist.
 */
import { describe, it, expect } from 'vitest';
import {
  createId,
  createArchitectureModel,
  addModelObject,
  addModelConnection,
  createFlow,
  addFlowStep,
  annotateFlowStep,
  removeFlowStep,
  reorderFlowStepsByIndex,
  reorderFlowStepList,
  getFlowConnections,
  type Architecture,
  type Version,
  type ArchitectureId,
  type VersionId,
  type WorkspaceId,
  type ObjectId,
  type ConnectionId,
} from '@diagramhq/domain';

describe('F042 — Flow steps (Web / Integration)', () => {
  const archId = createId('arch') as ArchitectureId;
  const wsId = createId('ws') as WorkspaceId;
  const verId = createId('ver') as VersionId;
  const NOW = new Date('2026-01-01T00:00:00Z');

  const arch: Architecture = {
    id: archId,
    workspaceId: wsId,
    name: 'Multi-service Payment System',
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

  // Create 4 objects
  const clientApp = createId('app') as ObjectId;
  const gateway = createId('app') as ObjectId;
  const paymentSvc = createId('app') as ObjectId;
  const ledgerDb = createId('sto') as ObjectId;

  // Create 3 connections
  const conn1Id = createId('con') as ConnectionId;
  const conn2Id = createId('con') as ConnectionId;
  const conn3Id = createId('con') as ConnectionId;

  let model = createArchitectureModel(arch, ver);

  model = addModelObject(model, {
    id: clientApp,
    architectureId: archId,
    versionId: verId,
    kind: 'application',
    name: 'Mobile Client',
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelObject(model, {
    id: gateway,
    architectureId: archId,
    versionId: verId,
    kind: 'application',
    name: 'API Gateway',
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelObject(model, {
    id: paymentSvc,
    architectureId: archId,
    versionId: verId,
    kind: 'application',
    name: 'Payment Service',
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelObject(model, {
    id: ledgerDb,
    architectureId: archId,
    versionId: verId,
    kind: 'store',
    name: 'Ledger DB',
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: conn1Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: clientApp,
    targetObjectId: gateway,
    kind: 'sync',
    label: 'POST /pay',
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: conn2Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: gateway,
    targetObjectId: paymentSvc,
    kind: 'sync',
    label: 'gRPC ProcessPayment',
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: conn3Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: paymentSvc,
    targetObjectId: ledgerDb,
    kind: 'data',
    label: 'INSERT INTO ledger',
    createdAt: NOW,
    updatedAt: NOW,
  });

  it('adds steps to a flow and ensures each step references a connection', () => {
    let flow = createFlow(
      {
        architectureId: archId,
        name: 'Payment Processing',
        description: 'End to end payment authorization',
      },
      model.connections,
    );

    expect(flow.steps).toHaveLength(0);

    // Step 1: append
    flow = addFlowStep(
      flow,
      { connectionId: conn1Id, note: 'Client dispatches payment request' },
      undefined,
      model.connections,
    );
    expect(flow.steps).toHaveLength(1);
    expect(flow.steps[0]?.connectionId).toBe(conn1Id);
    expect(flow.steps[0]?.stepIndex).toBe(0);
    expect(flow.steps[0]?.note).toBe('Client dispatches payment request');

    // Step 2: append conn3
    flow = addFlowStep(
      flow,
      { connectionId: conn3Id, note: 'Direct database insert' },
      undefined,
      model.connections,
    );
    expect(flow.steps).toHaveLength(2);
    expect(flow.steps[1]?.connectionId).toBe(conn3Id);
    expect(flow.steps[1]?.stepIndex).toBe(1);

    // Step 3: insert conn2 at index 1 (between conn1 and conn3)
    flow = addFlowStep(
      flow,
      { connectionId: conn2Id, note: 'Gateway routes to payment service' },
      1,
      model.connections,
    );

    // Verify ordering is maintained (0, 1, 2)
    expect(flow.steps).toHaveLength(3);
    expect(flow.steps[0]?.connectionId).toBe(conn1Id);
    expect(flow.steps[0]?.stepIndex).toBe(0);
    expect(flow.steps[0]?.note).toBe('Client dispatches payment request');

    expect(flow.steps[1]?.connectionId).toBe(conn2Id);
    expect(flow.steps[1]?.stepIndex).toBe(1);
    expect(flow.steps[1]?.note).toBe('Gateway routes to payment service');

    expect(flow.steps[2]?.connectionId).toBe(conn3Id);
    expect(flow.steps[2]?.stepIndex).toBe(2);
    expect(flow.steps[2]?.note).toBe('Direct database insert');
  });

  it('annotates steps and verifies notes persist independently', () => {
    let flow = createFlow(
      {
        architectureId: archId,
        name: 'Annotation Test',
        steps: [
          { connectionId: conn1Id, stepIndex: 0, note: 'Step 1 initial' },
          { connectionId: conn2Id, stepIndex: 1, note: 'Step 2 initial' },
        ],
      },
      model.connections,
    );

    flow = annotateFlowStep(flow, 1, 'Step 2 updated with TLS 1.3 requirement');
    expect(flow.steps[1]?.note).toBe('Step 2 updated with TLS 1.3 requirement');
    expect(flow.steps[0]?.note).toBe('Step 1 initial');
  });

  it('reorders steps by index and verifies steps stay ordered while notes persist', () => {
    let flow = createFlow(
      {
        architectureId: archId,
        name: 'Reorder Test',
        steps: [
          { connectionId: conn1Id, stepIndex: 0, note: 'Step 1: Auth' },
          { connectionId: conn2Id, stepIndex: 1, note: 'Step 2: Processing' },
          { connectionId: conn3Id, stepIndex: 2, note: 'Step 3: Settlement' },
        ],
      },
      model.connections,
    );

    // Move step 2 (Settlement) to index 0
    flow = reorderFlowStepsByIndex(flow, 2, 0);

    expect(flow.steps[0]?.connectionId).toBe(conn3Id);
    expect(flow.steps[0]?.note).toBe('Step 3: Settlement');
    expect(flow.steps[0]?.stepIndex).toBe(0);

    expect(flow.steps[1]?.connectionId).toBe(conn1Id);
    expect(flow.steps[1]?.note).toBe('Step 1: Auth');
    expect(flow.steps[1]?.stepIndex).toBe(1);

    expect(flow.steps[2]?.connectionId).toBe(conn2Id);
    expect(flow.steps[2]?.note).toBe('Step 2: Processing');
    expect(flow.steps[2]?.stepIndex).toBe(2);

    // Resolving connections reflects the new order
    const orderedConns = getFlowConnections(flow, model.connections);
    expect(orderedConns[0]?.id).toBe(conn3Id);
    expect(orderedConns[1]?.id).toBe(conn1Id);
    expect(orderedConns[2]?.id).toBe(conn2Id);
  });

  it('reorders steps by ID list and removes steps cleanly', () => {
    let flow = createFlow(
      {
        architectureId: archId,
        name: 'Reorder List Test',
        steps: [
          { connectionId: conn1Id, stepIndex: 0, note: 'A' },
          { connectionId: conn2Id, stepIndex: 1, note: 'B' },
          { connectionId: conn3Id, stepIndex: 2, note: 'C' },
        ],
      },
      model.connections,
    );

    const stepIds = flow.steps.map((s) => s.id);
    const step0Id = stepIds[0] as string;
    const step1Id = stepIds[1] as string;
    const step2Id = stepIds[2] as string;

    // Reverse order: C, B, A
    flow = reorderFlowStepList(flow, [step2Id, step1Id, step0Id]);

    expect(flow.steps[0]?.id).toBe(step2Id);
    expect(flow.steps[0]?.note).toBe('C');
    expect(flow.steps[0]?.stepIndex).toBe(0);

    expect(flow.steps[1]?.id).toBe(step1Id);
    expect(flow.steps[1]?.note).toBe('B');
    expect(flow.steps[1]?.stepIndex).toBe(1);

    expect(flow.steps[2]?.id).toBe(step0Id);
    expect(flow.steps[2]?.note).toBe('A');
    expect(flow.steps[2]?.stepIndex).toBe(2);

    // Remove middle step B
    flow = removeFlowStep(flow, 1);
    expect(flow.steps).toHaveLength(2);
    expect(flow.steps[0]?.id).toBe(step2Id);
    expect(flow.steps[0]?.note).toBe('C');
    expect(flow.steps[0]?.stepIndex).toBe(0);

    expect(flow.steps[1]?.id).toBe(step0Id);
    expect(flow.steps[1]?.note).toBe('A');
    expect(flow.steps[1]?.stepIndex).toBe(1);
  });
});
