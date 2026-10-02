import { describe, expect, it } from 'vitest';
import {
  annotateUserJourneyStep,
  createUserJourneyFlow,
  type CreateFlowStepInput,
} from './flow';
import {
  createFlowPlayback,
  getUserJourneyPlaybackStepInfo,
  nextFlowStep,
  playFlow,
  seekFlowStep,
} from './flow-playback';
import { projectFlowToCanvas } from './flow-view';
import type { ArchitectureId, ConnectionId, FlowId, ObjectId, VersionId } from './ids';
import { InvariantViolationError } from './invariants';
import type { ModelConnection, ModelObject } from './types';

describe('F045 — User journeys (Domain)', () => {
  const architectureId = 'arch_test' as ArchitectureId;
  const versionId = 'ver_1' as VersionId;
  const actorId = 'obj_actor_shopper' as ObjectId;
  const webAppId = 'obj_webapp' as ObjectId;
  const paymentApiId = 'obj_payment_api' as ObjectId;

  const mockObjects: ModelObject[] = [
    {
      id: actorId,
      architectureId,
      name: 'Customer Shopper',
      kind: 'actor',
      versionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: webAppId,
      architectureId,
      name: 'Storefront Web',
      kind: 'application',
      versionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: paymentApiId,
      architectureId,
      name: 'Payment Service',
      kind: 'application',
      versionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const conn1: ModelConnection = {
    id: 'conn_actor_to_web' as ConnectionId,
    architectureId,
    sourceObjectId: actorId,
    targetObjectId: webAppId,
    label: 'Browse & Add to Cart',
    kind: 'sync',
    versionId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const conn2: ModelConnection = {
    id: 'conn_web_to_payment' as ConnectionId,
    architectureId,
    sourceObjectId: webAppId,
    targetObjectId: paymentApiId,
    label: 'POST /checkout',
    kind: 'sync',
    versionId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConnections: ModelConnection[] = [conn1, conn2];

  it('creates a user journey flow with persona and contextual step actions', () => {
    const steps: CreateFlowStepInput[] = [
      {
        connectionId: conn1.id,
        note: 'Customer arrives on checkout screen',
        actorAction: 'Clicks "Place Order"',
        userIntent: 'Complete checkout of shopping cart',
      },
      {
        connectionId: conn2.id,
        note: 'Web client submits tokenized credit card to payment backend',
        actorAction: 'Submits payment credentials',
        userIntent: 'Authorize payment charge',
      },
    ];

    const flow = createUserJourneyFlow(
      {
        id: 'flw_checkout_journey' as FlowId,
        architectureId,
        name: 'Guest User Checkout Journey',
        description: 'Happy path purchase journey for unauthenticated shoppers',
        persona: 'Guest Shopper',
        actorId,
        steps,
      },
      mockConnections,
      mockObjects,
    );

    expect(flow.id).toBe('flw_checkout_journey');
    expect(flow.name).toBe('Guest User Checkout Journey');
    expect(flow.type).toBe('user_journey');
    expect(flow.persona).toBe('Guest Shopper');
    expect(flow.actorId).toBe(actorId);
    expect(flow.steps).toHaveLength(2);
    expect(flow.steps[0]?.actorAction).toBe('Clicks "Place Order"');
    expect(flow.steps[0]?.userIntent).toBe('Complete checkout of shopping cart');
    expect(flow.steps[1]?.actorAction).toBe('Submits payment credentials');
  });

  it('rejects flow creation if actorId does not exist in model objects', () => {
    expect(() => {
      createUserJourneyFlow(
        {
          architectureId,
          name: 'Invalid Actor Journey',
          actorId: 'obj_ghost_actor' as ObjectId,
          steps: [],
        },
        mockConnections,
        mockObjects,
      );
    }).toThrow(InvariantViolationError);
  });

  it('annotates a user journey step with updated action and intent', () => {
    const flow = createUserJourneyFlow(
      {
        architectureId,
        name: 'Onboarding Flow',
        persona: 'New Developer',
        steps: [{ connectionId: conn1.id, note: 'Initial note' }],
      },
      mockConnections,
    );

    const annotated = annotateUserJourneyStep(flow, 0, {
      note: 'Updated note after user test',
      actorAction: 'Enters API credentials',
      userIntent: 'Verify workspace connection',
    });

    expect(annotated.steps[0]?.note).toBe('Updated note after user test');
    expect(annotated.steps[0]?.actorAction).toBe('Enters API credentials');
    expect(annotated.steps[0]?.userIntent).toBe('Verify workspace connection');
  });

  it('plays back a user journey step by step and yields structured journey context', () => {
    const flow = createUserJourneyFlow(
      {
        architectureId,
        name: 'Subscription Upgrade Journey',
        persona: 'Pro Customer',
        actorId,
        steps: [
          {
            connectionId: conn1.id,
            note: 'Opens settings modal',
            actorAction: 'Clicks "Upgrade to Team"',
            userIntent: 'Increase seat limit',
          },
          {
            connectionId: conn2.id,
            note: 'Dispatches invoice update',
            actorAction: 'Confirms recurring billing',
            userIntent: 'Finalize invoice transaction',
          },
        ],
      },
      mockConnections,
    );

    let state = createFlowPlayback(flow);
    state = playFlow(state);
    expect(state.flowType).toBe('user_journey');

    // Step 0 context
    const step0Info = getUserJourneyPlaybackStepInfo(flow, state);
    expect(step0Info).not.toBeNull();
    expect(step0Info?.flowName).toBe('Subscription Upgrade Journey');
    expect(step0Info?.persona).toBe('Pro Customer');
    expect(step0Info?.stepNumber).toBe(1);
    expect(step0Info?.totalSteps).toBe(2);
    expect(step0Info?.actorAction).toBe('Clicks "Upgrade to Team"');
    expect(step0Info?.userIntent).toBe('Increase seat limit');

    // Advance to Step 1
    state = nextFlowStep(state);
    const step1Info = getUserJourneyPlaybackStepInfo(flow, state);
    expect(step1Info?.stepNumber).toBe(2);
    expect(step1Info?.actorAction).toBe('Confirms recurring billing');
    expect(step1Info?.userIntent).toBe('Finalize invoice transaction');

    // Seek back to Step 0
    state = seekFlowStep(state, 0);
    const seekInfo = getUserJourneyPlaybackStepInfo(flow, state);
    expect(seekInfo?.stepNumber).toBe(1);
    expect(seekInfo?.actorAction).toBe('Clicks "Upgrade to Team"');
  });

  it('projects user journey flow onto canvas with persona metadata and step intent badges', () => {
    const flow = createUserJourneyFlow(
      {
        architectureId,
        name: 'Checkout Journey Canvas View',
        persona: 'VIP Member',
        actorId,
        steps: [
          {
            connectionId: conn1.id,
            note: 'Selects item',
            actorAction: 'Clicks Buy Now',
            userIntent: 'Purchase item immediately',
          },
        ],
      },
      mockConnections,
    );

    const projected = projectFlowToCanvas(
      mockObjects,
      mockConnections,
      flow,
      undefined,
      { activeStepIndex: 0 },
    );

    expect(projected.flowMetadata.flowType).toBe('user_journey');
    expect(projected.flowMetadata.persona).toBe('VIP Member');
    expect(projected.flowMetadata.activeActorAction).toBe('Clicks Buy Now');
    expect(projected.flowMetadata.activeUserIntent).toBe('Purchase item immediately');

    const edge = projected.edges.find((e) => e.id === conn1.id);
    expect(edge).toBeDefined();
    expect(edge?.data?.actorAction).toBe('Clicks Buy Now');
    expect(edge?.data?.userIntent).toBe('Purchase item immediately');
  });
});
