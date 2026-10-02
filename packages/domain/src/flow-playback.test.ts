import { describe, expect, it } from 'vitest';
import { createId, type ArchitectureId, type ConnectionId } from './ids';
import { createFlow } from './flow';
import {
  computeStepIntervalMs,
  createFlowPlayback,
  nextFlowStep,
  pauseFlow,
  playFlow,
  prevFlowStep,
  restartFlow,
  seekFlowStep,
  setFlowSpeed,
} from './flow-playback';
import type { FlowWithSteps } from './types';

describe('flow-playback (F044 Flow playback engine)', () => {
  const archId = createId('arch') as ArchitectureId;
  const dummyFlow: FlowWithSteps = createFlow({
    architectureId: archId,
    name: 'Sample Playback Flow',
    steps: [
      { connectionId: 'con_1' as ConnectionId, stepIndex: 0, note: 'Step 1' },
      { connectionId: 'con_2' as ConnectionId, stepIndex: 1, note: 'Step 2' },
      { connectionId: 'con_3' as ConnectionId, stepIndex: 2, note: 'Step 3' },
    ],
  });

  it('initializes playback state at step 0', () => {
    const state = createFlowPlayback(dummyFlow);
    expect(state.flowId).toBe(dummyFlow.id);
    expect(state.totalSteps).toBe(3);
    expect(state.currentStepIndex).toBe(0);
    expect(state.isPlaying).toBe(false);
    expect(state.speedMultiplier).toBe(1);
    expect(state.isLooping).toBe(false);
  });

  it('toggles play and pause correctly', () => {
    let state = createFlowPlayback(dummyFlow);
    expect(state.isPlaying).toBe(false);

    state = playFlow(state);
    expect(state.isPlaying).toBe(true);

    state = pauseFlow(state);
    expect(state.isPlaying).toBe(false);
  });

  it('advances steps sequentially in order with nextFlowStep', () => {
    let state = createFlowPlayback(dummyFlow, { autoPlay: true });
    expect(state.currentStepIndex).toBe(0);

    state = nextFlowStep(state);
    expect(state.currentStepIndex).toBe(1);

    state = nextFlowStep(state);
    expect(state.currentStepIndex).toBe(2);
    expect(state.isPlaying).toBe(true);

    // At the end without loop: pauses playback and stays at last step
    state = nextFlowStep(state);
    expect(state.currentStepIndex).toBe(2);
    expect(state.isPlaying).toBe(false);
  });


  it('loops back to step 0 when isLooping is true', () => {
    let state = createFlowPlayback(dummyFlow, { isLooping: true, autoPlay: true });
    state = seekFlowStep(state, 2);
    expect(state.currentStepIndex).toBe(2);

    state = nextFlowStep(state);
    expect(state.currentStepIndex).toBe(0);
    expect(state.isPlaying).toBe(true);
  });

  it('navigates backwards with prevFlowStep, clamping at 0', () => {
    let state = createFlowPlayback(dummyFlow);
    state = seekFlowStep(state, 2);

    state = prevFlowStep(state);
    expect(state.currentStepIndex).toBe(1);

    state = prevFlowStep(state);
    expect(state.currentStepIndex).toBe(0);

    // Should not go below 0
    state = prevFlowStep(state);
    expect(state.currentStepIndex).toBe(0);
  });

  it('restarts playback to step 0', () => {
    let state = createFlowPlayback(dummyFlow);
    state = seekFlowStep(state, 2);

    state = restartFlow(state, true);
    expect(state.currentStepIndex).toBe(0);
    expect(state.isPlaying).toBe(true);
  });

  it('adjusts playback speed multiplier and step intervals', () => {
    let state = createFlowPlayback(dummyFlow);
    state = setFlowSpeed(state, 2);
    expect(state.speedMultiplier).toBe(2);

    expect(computeStepIntervalMs(2000, 1)).toBe(2000);
    expect(computeStepIntervalMs(2000, 2)).toBe(1000);
    expect(computeStepIntervalMs(2000, 0.5)).toBe(4000);
  });

  it('handles empty flows gracefully', () => {
    const emptyFlow: FlowWithSteps = createFlow({
      architectureId: archId,
      name: 'Empty Flow',
      steps: [],
    });

    let state = createFlowPlayback(emptyFlow);
    expect(state.totalSteps).toBe(0);

    state = playFlow(state);
    expect(state.isPlaying).toBe(false);

    state = nextFlowStep(state);
    expect(state.currentStepIndex).toBe(0);

    state = prevFlowStep(state);
    expect(state.currentStepIndex).toBe(0);
  });
});
