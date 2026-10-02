import { describe, expect, it } from 'vitest';
import { createId, type ArchitectureId, type ConnectionId } from './ids';
import { createFlow } from './flow';
import { projectFlowToCanvas } from './flow-view';
import type { FlowWithSteps, ModelConnection, ModelObject } from './types';

describe('projectFlowToCanvas (F043 Flow visualization)', () => {
  const archId = createId('arch') as ArchitectureId;
  const NOW = new Date('2026-01-01T00:00:00Z');

  const objWeb: ModelObject = {
    id: createId('app'),
    architectureId: archId,
    name: 'Web Frontend',
    kind: 'application',
    status: 'live',
    parentId: null,
    metadata: {},
    tags: ['react'],
    createdAt: NOW,
    updatedAt: NOW,
  };

  const objApi: ModelObject = {
    id: createId('app'),
    architectureId: archId,
    name: 'API Gateway',
    kind: 'application',
    status: 'live',
    parentId: null,
    metadata: {},
    tags: ['node'],
    createdAt: NOW,
    updatedAt: NOW,
  };

  const objDb: ModelObject = {
    id: createId('sto'),
    architectureId: archId,
    name: 'Postgres DB',
    kind: 'store',
    status: 'live',
    parentId: null,
    metadata: {},
    tags: ['db'],
    createdAt: NOW,
    updatedAt: NOW,
  };

  const objAnalytics: ModelObject = {
    id: createId('app'),
    architectureId: archId,
    name: 'Analytics Service',
    kind: 'application',
    status: 'live',
    parentId: null,
    metadata: {},
    tags: ['python'],
    createdAt: NOW,
    updatedAt: NOW,
  };

  const conn1: ModelConnection = {
    id: createId('con') as ConnectionId,
    architectureId: archId,
    sourceObjectId: objWeb.id,
    targetObjectId: objApi.id,
    kind: 'sync',
    description: 'HTTP request',
    metadata: {},
    tags: [],
    createdAt: NOW,
    updatedAt: NOW,
  };

  const conn2: ModelConnection = {
    id: createId('con') as ConnectionId,
    architectureId: archId,
    sourceObjectId: objApi.id,
    targetObjectId: objDb.id,
    kind: 'data',
    description: 'SQL query',
    metadata: {},
    tags: [],
    createdAt: NOW,
    updatedAt: NOW,
  };

  const connUnrelated: ModelConnection = {
    id: createId('con') as ConnectionId,
    architectureId: archId,
    sourceObjectId: objApi.id,
    targetObjectId: objAnalytics.id,
    kind: 'async',
    description: 'Event publish',
    metadata: {},
    tags: [],
    createdAt: NOW,
    updatedAt: NOW,
  };

  const allObjects = [objWeb, objApi, objDb, objAnalytics];
  const allConnections = [conn1, conn2, connUnrelated];

  it('highlights the flow path over the existing architecture', () => {
    const flow: FlowWithSteps = createFlow(
      {
        architectureId: archId,
        name: 'User Checkout Flow',
        description: 'End-to-end checkout request sequence',
        steps: [
          { connectionId: conn1.id, stepIndex: 0, note: 'User submits checkout' },
          { connectionId: conn2.id, stepIndex: 1, note: 'Save transaction' },
        ],
      },
      allConnections,
    );

    const result = projectFlowToCanvas(allObjects, allConnections, flow);

    expect(result.flowMetadata.flowId).toBe(flow.id);
    expect(result.flowMetadata.flowName).toBe('User Checkout Flow');
    expect(result.flowMetadata.stepCount).toBe(2);

    // Participating nodes (objWeb, objApi, objDb) are marked in flow
    const webNode = result.nodes.find((n) => n.id === objWeb.id)!;
    const apiNode = result.nodes.find((n) => n.id === objApi.id)!;
    const dbNode = result.nodes.find((n) => n.id === objDb.id)!;
    const analyticsNode = result.nodes.find((n) => n.id === objAnalytics.id)!;

    expect(webNode.data.flowView).toBe(true);
    expect(webNode.data.isInFlow).toBe(true);
    expect(webNode.data.flowStepNumbers).toEqual([1]);
    expect(webNode.data.highlighted).toBe(true);
    expect(webNode.data.isDimmed).toBe(false);

    expect(apiNode.data.isInFlow).toBe(true);
    expect(apiNode.data.flowStepNumbers).toEqual([1, 2]);
    expect(apiNode.data.highlighted).toBe(true);

    expect(dbNode.data.isInFlow).toBe(true);
    expect(dbNode.data.flowStepNumbers).toEqual([2]);
    expect(dbNode.data.highlighted).toBe(true);

    // Non-participating node (analytics) is marked dimmed / not in flow
    expect(analyticsNode.data.isInFlow).toBe(false);
    expect(analyticsNode.data.isDimmed).toBe(true);
    expect(analyticsNode.data.highlighted).toBe(false);

    // Edges participating in flow
    const edge1 = result.edges.find((e) => e.id === conn1.id)!;
    const edge2 = result.edges.find((e) => e.id === conn2.id)!;
    const edgeUnrelated = result.edges.find((e) => e.id === connUnrelated.id)!;

    expect(edge1.data?.flowView).toBe(true);
    expect(edge1.data?.isInFlow).toBe(true);
    expect(edge1.animated).toBe(true);
    expect(edge1.label).toContain('Step 1: User submits checkout');
    expect(edge1.data?.flowStepNumber).toBe(1);
    expect(edge1.data?.flowStepNote).toBe('User submits checkout');

    expect(edge2.data?.isInFlow).toBe(true);
    expect(edge2.animated).toBe(true);
    expect(edge2.label).toContain('Step 2: Save transaction');
    expect(edge2.data?.flowStepNumber).toBe(2);

    expect(edgeUnrelated.data?.isInFlow).toBe(false);
    expect(edgeUnrelated.data?.isDimmed).toBe(true);
    expect(edgeUnrelated.animated).toBe(false);
  });

  it('supports activeStepIndex highlighting for step playback', () => {
    const flow: FlowWithSteps = createFlow(
      {
        architectureId: archId,
        name: 'Step Inspection Flow',
        steps: [
          { connectionId: conn1.id, stepIndex: 0, note: 'First step' },
          { connectionId: conn2.id, stepIndex: 1, note: 'Second step' },
        ],
      },
      allConnections,
    );

    const result = projectFlowToCanvas(allObjects, allConnections, flow, undefined, {
      activeStepIndex: 1,
    });

    const edge1 = result.edges.find((e) => e.id === conn1.id)!;
    const edge2 = result.edges.find((e) => e.id === conn2.id)!;

    expect(edge1.data?.isActiveStep).toBe(false);
    expect(edge2.data?.isActiveStep).toBe(true);

    const apiNode = result.nodes.find((n) => n.id === objApi.id)!;
    const dbNode = result.nodes.find((n) => n.id === objDb.id)!;
    const webNode = result.nodes.find((n) => n.id === objWeb.id)!;

    expect(apiNode.data.isActiveStepParticipant).toBe(true);
    expect(dbNode.data.isActiveStepParticipant).toBe(true);
    expect(webNode.data.isActiveStepParticipant).toBe(false);
  });

  it('handles empty flow steps without crashing', () => {
    const emptyFlow: FlowWithSteps = createFlow({
      architectureId: archId,
      name: 'Empty Flow',
      steps: [],
    });

    const result = projectFlowToCanvas(allObjects, allConnections, emptyFlow);
    expect(result.nodes.every((n) => n.data.isInFlow === false)).toBe(true);
    expect(result.edges.every((e) => e.data?.isInFlow === false)).toBe(true);
    expect(result.flowMetadata.stepCount).toBe(0);
  });

  it('never mutates input objects or connections', () => {
    const flow: FlowWithSteps = createFlow(
      {
        architectureId: archId,
        name: 'Immutable Test',
        steps: [{ connectionId: conn1.id, stepIndex: 0 }],
      },
      allConnections,
    );

    const originalObjectsJson = JSON.stringify(allObjects);
    const originalConnectionsJson = JSON.stringify(allConnections);

    projectFlowToCanvas(allObjects, allConnections, flow);

    expect(JSON.stringify(allObjects)).toBe(originalObjectsJson);
    expect(JSON.stringify(allConnections)).toBe(originalConnectionsJson);
  });
});
