/**
 * F045 — User journeys — integration spec.
 *
 * Verifies acceptance criteria from PHASE-05-FLOWS.md:
 * - User-journey flow type
 * - Test: a user-journey flow plays back.
 */
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  createId,
  createArchitectureModel,
  addModelObject,
  addModelConnection,
  createUserJourneyFlow,
  projectFlowToCanvas,
  createFlowPlayback,
  nextFlowStep,
  playFlow,
  getUserJourneyPlaybackStepInfo,
  type Architecture,
  type Version,
  type ArchitectureId,
  type VersionId,
  type WorkspaceId,
  type ObjectId,
  type ConnectionId,
} from '@diagramhq/domain';
import { FlowPlaybackToolbar } from './components/canvas/flow-playback-toolbar';
import { UserJourneyOverlay } from './components/canvas/user-journey-overlay';

describe('F045 — User journeys (Web / Integration)', () => {
  const archId = createId('arch') as ArchitectureId;
  const wsId = createId('ws') as WorkspaceId;
  const verId = createId('ver') as VersionId;
  const NOW = new Date('2026-01-01T00:00:00Z');

  const arch: Architecture = {
    id: archId,
    workspaceId: wsId,
    name: 'E-Commerce Architecture',
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

  // Model objects: Shopper (Actor) -> Storefront (App) -> Payment Gateway (App) -> Bank (External System)
  const shopperId = createId('act') as ObjectId;
  const storefrontId = createId('app') as ObjectId;
  const paymentSvcId = createId('app') as ObjectId;

  let model = createArchitectureModel(arch, ver);
  model = addModelObject(model, {
    id: shopperId,
    architectureId: archId,
    versionId: verId,
    name: 'Shopper / Customer',
    kind: 'actor',
    createdAt: NOW,
    updatedAt: NOW,
  });
  model = addModelObject(model, {
    id: storefrontId,
    architectureId: archId,
    versionId: verId,
    name: 'Web Storefront',
    kind: 'application',
    createdAt: NOW,
    updatedAt: NOW,
  });
  model = addModelObject(model, {
    id: paymentSvcId,
    architectureId: archId,
    versionId: verId,
    name: 'Payment Service',
    kind: 'application',
    createdAt: NOW,
    updatedAt: NOW,
  });

  const conn1Id = createId('con') as ConnectionId;
  const conn2Id = createId('con') as ConnectionId;

  model = addModelConnection(model, {
    id: conn1Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: shopperId,
    targetObjectId: storefrontId,
    label: 'HTTPS / Web UI',
    kind: 'sync',
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: conn2Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: storefrontId,
    targetObjectId: paymentSvcId,
    label: 'REST / Checkout',
    kind: 'sync',
    createdAt: NOW,
    updatedAt: NOW,
  });

  const journeyFlow = createUserJourneyFlow(
    {
      architectureId: archId,
      name: 'One-Click Checkout Journey',
      persona: 'Frequent Shopper',
      actorId: shopperId,
      steps: [
        {
          connectionId: conn1Id,
          note: 'User clicks Instant Buy from product page',
          actorAction: 'Clicks "Instant Buy"',
          userIntent: 'Purchase item with stored payment method',
        },
        {
          connectionId: conn2Id,
          note: 'Storefront forwards authenticated purchase token',
          actorAction: 'Authorizes stored card charge',
          userIntent: 'Complete transaction securely',
        },
      ],
    },
    model.connections,
    model.objects,
  );

  it('instantiates user journey flow with proper type, persona, and step intent', () => {
    expect(journeyFlow.type).toBe('user_journey');
    expect(journeyFlow.persona).toBe('Frequent Shopper');
    expect(journeyFlow.actorId).toBe(shopperId);
    expect(journeyFlow.steps).toHaveLength(2);
    expect(journeyFlow.steps[0]?.actorAction).toBe('Clicks "Instant Buy"');
    expect(journeyFlow.steps[0]?.userIntent).toBe(
      'Purchase item with stored payment method',
    );
    expect(journeyFlow.steps[1]?.actorAction).toBe('Authorizes stored card charge');
  });

  it('plays back a user-journey flow step-by-step', () => {
    let state = createFlowPlayback(journeyFlow, { autoPlay: true });
    expect(state.isPlaying).toBe(true);
    expect(state.flowType).toBe('user_journey');

    // Step 0 context
    let info = getUserJourneyPlaybackStepInfo(journeyFlow, state);
    expect(info).not.toBeNull();
    expect(info?.stepIndex).toBe(0);
    expect(info?.stepNumber).toBe(1);
    expect(info?.persona).toBe('Frequent Shopper');
    expect(info?.actorAction).toBe('Clicks "Instant Buy"');
    expect(info?.userIntent).toBe('Purchase item with stored payment method');

    // Advance to Step 1
    state = nextFlowStep(state);
    info = getUserJourneyPlaybackStepInfo(journeyFlow, state);
    expect(info?.stepIndex).toBe(1);
    expect(info?.stepNumber).toBe(2);
    expect(info?.actorAction).toBe('Authorizes stored card charge');
    expect(info?.userIntent).toBe('Complete transaction securely');
  });

  it('projects user journey flow with persona and active step intent onto canvas', () => {
    const state = createFlowPlayback(journeyFlow);
    const projection = projectFlowToCanvas(
      model.objects,
      model.connections,
      journeyFlow,
      undefined,
      { activeStepIndex: state.currentStepIndex },
    );

    expect(projection.flowMetadata.flowType).toBe('user_journey');
    expect(projection.flowMetadata.persona).toBe('Frequent Shopper');
    expect(projection.flowMetadata.activeActorAction).toBe('Clicks "Instant Buy"');
    expect(projection.flowMetadata.activeUserIntent).toBe(
      'Purchase item with stored payment method',
    );

    const activeEdge = projection.edges.find((e) => e.id === conn1Id);
    expect(activeEdge?.data?.isActiveStep).toBe(true);
    expect(activeEdge?.data?.actorAction).toBe('Clicks "Instant Buy"');
    expect(activeEdge?.data?.userIntent).toBe(
      'Purchase item with stored payment method',
    );
  });

  it('renders user journey context inside FlowPlaybackToolbar and UserJourneyOverlay', () => {
    let state = createFlowPlayback(journeyFlow);
    state = playFlow(state);
    const journeyInfo = getUserJourneyPlaybackStepInfo(journeyFlow, state);

    // Render FlowPlaybackToolbar with user journey context
    const toolbarHtml = renderToString(
      <FlowPlaybackToolbar
        state={state}
        currentStepNote={journeyFlow.steps[0]?.note}
        persona={journeyFlow.persona}
        actorAction={journeyFlow.steps[0]?.actorAction}
        userIntent={journeyFlow.steps[0]?.userIntent}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onRestart={vi.fn()}
        onSpeedChange={vi.fn()}
      />,
    );

    expect(toolbarHtml).toContain('data-testid="playback-user-journey-context"');
    expect(toolbarHtml).toContain('data-testid="playback-persona-badge"');
    expect(toolbarHtml).toContain('Frequent Shopper');
    expect(toolbarHtml).toContain('Clicks &quot;Instant Buy&quot;');
    expect(toolbarHtml).toContain('Purchase item with stored payment method');

    // Render UserJourneyOverlay
    const overlayHtml = renderToString(<UserJourneyOverlay journeyInfo={journeyInfo} />);
    expect(overlayHtml).toContain('data-testid="user-journey-overlay"');
    expect(overlayHtml).toContain('One-Click Checkout Journey');
    expect(overlayHtml).toContain('Frequent Shopper');
    expect(overlayHtml).toContain('Step 1 of 2');
    expect(overlayHtml).toContain('Clicks &quot;Instant Buy&quot;');
    expect(overlayHtml).toContain('Purchase item with stored payment method');
  });
});
