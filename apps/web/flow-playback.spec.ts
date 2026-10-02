/**
 * F044 — Flow playback — integration spec.
 *
 * Verifies acceptance criteria from PHASE-05-FLOWS.md:
 * - Controls: play, pause, next, previous, speed, restart
 * - Animates steps in order
 * - Test: playback advances step index; controls work
 */
import { describe, expect, it } from 'vitest';
import {
  createId,
  createArchitectureModel,
  addModelObject,
  addModelConnection,
  createFlow,
  projectFlowToCanvas,
  createFlowPlayback,
  playFlow,
  pauseFlow,
  nextFlowStep,
  prevFlowStep,
  restartFlow,
  setFlowSpeed,
  computeStepIntervalMs,
  type Architecture,
  type Version,
  type ArchitectureId,
  type VersionId,
  type WorkspaceId,
  type ObjectId,
  type ConnectionId,
  type FlowWithSteps,
} from '@diagramhq/domain';

describe('F044 — Flow playback (Web / Integration)', () => {
  const archId = createId('arch') as ArchitectureId;
  const wsId = createId('ws') as WorkspaceId;
  const verId = createId('ver') as VersionId;
  const NOW = new Date('2026-01-01T00:00:00Z');

  const arch: Architecture = {
    id: archId,
    workspaceId: wsId,
    name: 'Order Fulfillment Architecture',
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

  // Build model: User -> WebApp -> OrderService -> FulfillmentDB
  const userId = createId('act') as ObjectId;
  const webAppId = createId('app') as ObjectId;
  const orderSvcId = createId('app') as ObjectId;
  const dbId = createId('sto') as ObjectId;

  const conn1Id = createId('con') as ConnectionId;
  const conn2Id = createId('con') as ConnectionId;
  const conn3Id = createId('con') as ConnectionId;

  let model = createArchitectureModel(arch, ver);

  model = addModelObject(model, {
    id: userId,
    architectureId: archId,
    versionId: verId,
    name: 'Customer',
    kind: 'actor',
    parentId: null,
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelObject(model, {
    id: webAppId,
    architectureId: archId,
    versionId: verId,
    name: 'Web Storefront',
    kind: 'application',
    parentId: null,
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelObject(model, {
    id: orderSvcId,
    architectureId: archId,
    versionId: verId,
    name: 'Order Service',
    kind: 'application',
    parentId: null,
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelObject(model, {
    id: dbId,
    architectureId: archId,
    versionId: verId,
    name: 'Orders DB',
    kind: 'store',
    parentId: null,
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: conn1Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: userId,
    targetObjectId: webAppId,
    kind: 'sync',
    description: '1. Click Purchase',
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: conn2Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: webAppId,
    targetObjectId: orderSvcId,
    kind: 'sync',
    description: '2. Create Order',
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: conn3Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: orderSvcId,
    targetObjectId: dbId,
    kind: 'data',
    description: '3. Insert Record',
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
  });

  const orderFlow: FlowWithSteps = createFlow(
    {
      architectureId: archId,
      name: 'Order Placement Flow',
      steps: [
        { connectionId: conn1Id, stepIndex: 0, note: 'Click Purchase' },
        { connectionId: conn2Id, stepIndex: 1, note: 'Create Order' },
        { connectionId: conn3Id, stepIndex: 2, note: 'Insert Record' },
      ],
    },
    model.connections,
  );

  it('provides playback controls: play, pause, next, previous, speed, restart', () => {
    let state = createFlowPlayback(orderFlow);
    expect(state.isPlaying).toBe(false);
    expect(state.currentStepIndex).toBe(0);

    // Play
    state = playFlow(state);
    expect(state.isPlaying).toBe(true);

    // Pause
    state = pauseFlow(state);
    expect(state.isPlaying).toBe(false);

    // Next
    state = nextFlowStep(state);
    expect(state.currentStepIndex).toBe(1);

    // Next again
    state = nextFlowStep(state);
    expect(state.currentStepIndex).toBe(2);

    // Previous
    state = prevFlowStep(state);
    expect(state.currentStepIndex).toBe(1);

    // Restart
    state = restartFlow(state, true);
    expect(state.currentStepIndex).toBe(0);
    expect(state.isPlaying).toBe(true);

    // Speed change
    state = setFlowSpeed(state, 2);
    expect(state.speedMultiplier).toBe(2);
    expect(computeStepIntervalMs(2000, state.speedMultiplier)).toBe(1000);
  });

  it('animates steps in sequential order through canvas projection', () => {
    let state = createFlowPlayback(orderFlow, { autoPlay: true });

    // Step 0: User -> WebApp
    const proj0 = projectFlowToCanvas(model.objects, model.connections, orderFlow, undefined, {
      activeStepIndex: state.currentStepIndex,
    });
    const edge0 = proj0.edges.find((e) => e.id === conn1Id)!;
    const userNode0 = proj0.nodes.find((n) => n.id === userId)!;
    const webNode0 = proj0.nodes.find((n) => n.id === webAppId)!;
    const orderNode0 = proj0.nodes.find((n) => n.id === orderSvcId)!;

    expect(edge0.data?.isActiveStep).toBe(true);
    expect(userNode0.data.isActiveStepParticipant).toBe(true);
    expect(webNode0.data.isActiveStepParticipant).toBe(true);
    expect(orderNode0.data.isActiveStepParticipant).toBe(false);

    // Advance to Step 1: WebApp -> OrderService
    state = nextFlowStep(state);
    expect(state.currentStepIndex).toBe(1);

    const proj1 = projectFlowToCanvas(model.objects, model.connections, orderFlow, undefined, {
      activeStepIndex: state.currentStepIndex,
    });
    const edge1_0 = proj1.edges.find((e) => e.id === conn1Id)!;
    const edge1_1 = proj1.edges.find((e) => e.id === conn2Id)!;
    const orderNode1 = proj1.nodes.find((n) => n.id === orderSvcId)!;

    expect(edge1_0.data?.isActiveStep).toBe(false);
    expect(edge1_1.data?.isActiveStep).toBe(true);
    expect(orderNode1.data.isActiveStepParticipant).toBe(true);

    // Advance to Step 2: OrderService -> DB
    state = nextFlowStep(state);
    expect(state.currentStepIndex).toBe(2);

    const proj2 = projectFlowToCanvas(model.objects, model.connections, orderFlow, undefined, {
      activeStepIndex: state.currentStepIndex,
    });
    const edge2_2 = proj2.edges.find((e) => e.id === conn3Id)!;
    const dbNode2 = proj2.nodes.find((n) => n.id === dbId)!;


    expect(edge2_2.data?.isActiveStep).toBe(true);
    expect(dbNode2.data.isActiveStepParticipant).toBe(true);
  });

  it('stops at end of sequence when looping is disabled', () => {
    let state = createFlowPlayback(orderFlow, { autoPlay: true, isLooping: false });
    state = nextFlowStep(state); // 0 -> 1
    state = nextFlowStep(state); // 1 -> 2
    expect(state.currentStepIndex).toBe(2);
    expect(state.isPlaying).toBe(true);

    // Next step at end should pause
    state = nextFlowStep(state);
    expect(state.currentStepIndex).toBe(2);
    expect(state.isPlaying).toBe(false);
  });

  it('loops seamlessly from end to beginning when looping is enabled', () => {
    let state = createFlowPlayback(orderFlow, { autoPlay: true, isLooping: true });
    state = nextFlowStep(state); // 0 -> 1
    state = nextFlowStep(state); // 1 -> 2

    // Next step loops back to 0 and keeps playing
    state = nextFlowStep(state);
    expect(state.currentStepIndex).toBe(0);
    expect(state.isPlaying).toBe(true);
  });
});
