import { InvariantViolationError } from './invariants';
import type { FlowType, FlowWithSteps } from './types';

export interface FlowPlaybackState {
  readonly flowId: string;
  readonly totalSteps: number;
  readonly currentStepIndex: number;
  readonly isPlaying: boolean;
  readonly speedMultiplier: number;
  readonly isLooping: boolean;
  readonly flowType?: FlowType;
}

export const DEFAULT_STEP_INTERVAL_MS = 2000;
export const ALLOWED_SPEED_MULTIPLIERS = [0.5, 1, 1.5, 2] as const;

export interface CreateFlowPlaybackOptions {
  initialSpeed?: number;
  isLooping?: boolean;
  autoPlay?: boolean;
}

/**
 * Initializes a new playback state for a given flow (F044/F045).
 */
export function createFlowPlayback(
  flow: FlowWithSteps,
  options?: CreateFlowPlaybackOptions,
): FlowPlaybackState {
  const totalSteps = flow.steps ? flow.steps.length : 0;
  const speed = options?.initialSpeed ?? 1;

  if (speed <= 0) {
    throw new InvariantViolationError(
      `Speed multiplier must be positive, received: ${speed}`,
      'INVALID_PLAYBACK_SPEED',
    );
  }

  return {
    flowId: flow.id,
    flowType: flow.type ?? 'sequence',
    totalSteps,
    currentStepIndex: 0,
    isPlaying: Boolean(options?.autoPlay && totalSteps > 0),
    speedMultiplier: speed,
    isLooping: Boolean(options?.isLooping),
  };
}

/**
 * Starts or resumes playback.
 */
export function playFlow(state: FlowPlaybackState): FlowPlaybackState {
  if (state.totalSteps === 0) {
    return state;
  }

  // If at the end, restart from step 0 upon pressing play
  const currentStepIndex =
    state.currentStepIndex >= state.totalSteps - 1 && !state.isPlaying
      ? 0
      : state.currentStepIndex;

  return {
    ...state,
    currentStepIndex,
    isPlaying: true,
  };
}

/**
 * Pauses playback.
 */
export function pauseFlow(state: FlowPlaybackState): FlowPlaybackState {
  return {
    ...state,
    isPlaying: false,
  };
}

/**
 * Advances playback to the next step.
 * If at the last step:
 * - loops back to index 0 if isLooping is enabled
 * - pauses playback if isLooping is disabled
 */
export function nextFlowStep(state: FlowPlaybackState): FlowPlaybackState {
  if (state.totalSteps <= 1) {
    return state;
  }

  if (state.currentStepIndex < state.totalSteps - 1) {
    return {
      ...state,
      currentStepIndex: state.currentStepIndex + 1,
    };
  }

  // At the last step
  if (state.isLooping) {
    return {
      ...state,
      currentStepIndex: 0,
    };
  }

  return {
    ...state,
    isPlaying: false,
  };
}

/**
 * Steps back to the previous step, clamped at 0.
 */
export function prevFlowStep(state: FlowPlaybackState): FlowPlaybackState {
  if (state.totalSteps === 0) {
    return state;
  }

  return {
    ...state,
    currentStepIndex: Math.max(0, state.currentStepIndex - 1),
  };
}

/**
 * Restarts playback from step 0.
 */
export function restartFlow(
  state: FlowPlaybackState,
  autoPlay = true,
): FlowPlaybackState {
  return {
    ...state,
    currentStepIndex: 0,
    isPlaying: autoPlay && state.totalSteps > 0,
  };
}

/**
 * Sets playback speed multiplier (e.g., 0.5x, 1x, 2x).
 */
export function setFlowSpeed(
  state: FlowPlaybackState,
  speedMultiplier: number,
): FlowPlaybackState {
  if (speedMultiplier <= 0) {
    throw new InvariantViolationError(
      `Speed multiplier must be positive, received: ${speedMultiplier}`,
      'INVALID_PLAYBACK_SPEED',
    );
  }

  return {
    ...state,
    speedMultiplier,
  };
}

/**
 * Directly seeks to a specific step index. Clamps index to valid bounds.
 */
export function seekFlowStep(
  state: FlowPlaybackState,
  stepIndex: number,
): FlowPlaybackState {
  if (state.totalSteps === 0) {
    return state;
  }

  const clamped = Math.max(0, Math.min(stepIndex, state.totalSteps - 1));
  return {
    ...state,
    currentStepIndex: clamped,
  };
}

/**
 * Computes interval duration in milliseconds for current speed.
 */
export function computeStepIntervalMs(
  baseDurationMs = DEFAULT_STEP_INTERVAL_MS,
  speedMultiplier = 1,
): number {
  if (speedMultiplier <= 0) {
    return baseDurationMs;
  }
  return Math.round(baseDurationMs / speedMultiplier);
}

export interface UserJourneyPlaybackStepInfo {
  readonly flowId: string;
  readonly flowName: string;
  readonly flowType: FlowType;
  readonly persona: string | null;
  readonly actorId: string | null;
  readonly stepIndex: number;
  readonly stepNumber: number;
  readonly totalSteps: number;
  readonly connectionId: string | null;
  readonly note: string | null;
  readonly actorAction: string | null;
  readonly userIntent: string | null;
  readonly isPlaying: boolean;
}

/**
 * Extracts structured user-journey playback context for the current step (F045).
 * Returns null if the flow is not a user_journey flow or has no steps.
 */
export function getUserJourneyPlaybackStepInfo(
  flow: FlowWithSteps,
  state: FlowPlaybackState,
): UserJourneyPlaybackStepInfo | null {
  if (flow.type !== 'user_journey' || !flow.steps || flow.steps.length === 0) {
    return null;
  }

  const sortedSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);
  const currentStep = sortedSteps[state.currentStepIndex] ?? sortedSteps[0];
  if (!currentStep) {
    return null;
  }

  return {
    flowId: flow.id,
    flowName: flow.name,
    flowType: 'user_journey',
    persona: flow.persona ?? null,
    actorId: flow.actorId ?? null,
    stepIndex: state.currentStepIndex,
    stepNumber: state.currentStepIndex + 1,
    totalSteps: state.totalSteps,
    connectionId: currentStep.connectionId,
    note: currentStep.note ?? null,
    actorAction: currentStep.actorAction ?? null,
    userIntent: currentStep.userIntent ?? null,
    isPlaying: state.isPlaying,
  };
}

export interface DataFlowPlaybackStepInfo {
  readonly flowId: string;
  readonly flowName: string;
  readonly flowType: FlowType;
  readonly dataClassification: string | null;
  readonly flowDataElements: string[];
  readonly stepIndex: number;
  readonly stepNumber: number;
  readonly totalSteps: number;
  readonly connectionId: string | null;
  readonly note: string | null;
  readonly dataElements: string[];
  readonly transformation: string | null;
  readonly stepClassification: string | null;
  readonly isPlaying: boolean;
}

/**
 * Extracts structured data flow playback context for the current step (F046).
 * Returns null if the flow is not a data_flow or has no steps.
 */
export function getDataFlowPlaybackStepInfo(
  flow: FlowWithSteps,
  state: FlowPlaybackState,
): DataFlowPlaybackStepInfo | null {
  if (flow.type !== 'data_flow' || !flow.steps || flow.steps.length === 0) {
    return null;
  }

  const sortedSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);
  const currentStep = sortedSteps[state.currentStepIndex] ?? sortedSteps[0];
  if (!currentStep) {
    return null;
  }

  return {
    flowId: flow.id,
    flowName: flow.name,
    flowType: 'data_flow',
    dataClassification: flow.dataClassification ?? null,
    flowDataElements: flow.dataElements ?? [],
    stepIndex: state.currentStepIndex,
    stepNumber: state.currentStepIndex + 1,
    totalSteps: state.totalSteps,
    connectionId: currentStep.connectionId,
    note: currentStep.note ?? null,
    dataElements:
      currentStep.dataElements && currentStep.dataElements.length > 0
        ? currentStep.dataElements
        : flow.dataElements ?? [],
    transformation: currentStep.transformation ?? null,
    stepClassification:
      currentStep.dataClassification ?? flow.dataClassification ?? null,
    isPlaying: state.isPlaying,
  };
}

export interface ApiFlowPlaybackStepInfo {
  readonly flowId: string;
  readonly flowName: string;
  readonly flowType: FlowType;
  readonly endpoint: string | null;
  readonly httpMethod: string | null;
  readonly statusCode: number | null;
  readonly requestSchema: string | null;
  readonly responseSchema: string | null;
  readonly stepIndex: number;
  readonly stepNumber: number;
  readonly totalSteps: number;
  readonly connectionId: string | null;
  readonly stepEndpoint: string | null;
  readonly stepHttpMethod: string | null;
  readonly stepStatusCode: number | null;
  readonly stepRequestSchema: string | null;
  readonly stepResponseSchema: string | null;
  readonly note: string | null;
  readonly isPlaying: boolean;
}

/**
 * Extracts structured API flow playback context for the current step (F047).
 * Returns null if the flow is not an api_flow or has no steps.
 */
export function getApiFlowPlaybackStepInfo(
  flow: FlowWithSteps,
  state: FlowPlaybackState,
): ApiFlowPlaybackStepInfo | null {
  if (flow.type !== 'api_flow' || !flow.steps || flow.steps.length === 0) {
    return null;
  }

  const sortedSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);
  const currentStep = sortedSteps[state.currentStepIndex] ?? sortedSteps[0];
  if (!currentStep) {
    return null;
  }

  return {
    flowId: flow.id,
    flowName: flow.name,
    flowType: 'api_flow',
    endpoint: flow.endpoint ?? null,
    httpMethod: flow.httpMethod ?? null,
    statusCode: flow.statusCode ?? null,
    requestSchema: flow.requestSchema ?? null,
    responseSchema: flow.responseSchema ?? null,
    stepIndex: state.currentStepIndex,
    stepNumber: state.currentStepIndex + 1,
    totalSteps: state.totalSteps,
    connectionId: currentStep.connectionId,
    stepEndpoint: currentStep.endpoint ?? flow.endpoint ?? null,
    stepHttpMethod: currentStep.httpMethod ?? flow.httpMethod ?? null,
    stepStatusCode: currentStep.statusCode ?? flow.statusCode ?? null,
    stepRequestSchema: currentStep.requestSchema ?? flow.requestSchema ?? null,
    stepResponseSchema: currentStep.responseSchema ?? flow.responseSchema ?? null,
    note: currentStep.note ?? null,
    isPlaying: state.isPlaying,
  };
}


