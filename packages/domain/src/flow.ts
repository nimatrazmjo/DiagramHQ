import { createId, type ArchitectureId, type ConnectionId, type FlowId } from './ids';
import { InvariantViolationError } from './invariants';
import type { FlowStep, FlowWithSteps, ModelConnection } from './types';

export interface CreateFlowStepInput {
  id?: string;
  connectionId: ConnectionId;
  stepIndex?: number;
  note?: string | null;
}

export interface CreateFlowInput {
  id?: FlowId;
  architectureId: ArchitectureId;
  name: string;
  description?: string | null;
  steps?: CreateFlowStepInput[];
}

export interface UpdateFlowInput {
  name?: string;
  description?: string | null;
  steps?: CreateFlowStepInput[];
}

export interface FlowValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that an array of flow steps references only existing, known connections.
 * Invariant: Every step in a flow must reference an existing connection in the architecture.
 */
export function validateFlowSteps(
  steps: CreateFlowStepInput[] | FlowStep[],
  availableConnectionIds: Set<ConnectionId> | ConnectionId[] | ModelConnection[],
): FlowValidationResult {
  const errors: string[] = [];

  const validIdSet = new Set<string>();
  if (availableConnectionIds instanceof Set) {
    for (const id of availableConnectionIds) {
      validIdSet.add(id);
    }
  } else {
    for (const item of availableConnectionIds) {
      if (typeof item === 'string') {
        validIdSet.add(item);
      } else if (item && typeof item === 'object' && 'id' in item) {
        validIdSet.add(item.id);
      }
    }
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step) continue;
    if (!step.connectionId) {
      errors.push(`Step at index ${i} is missing a connectionId`);
      continue;
    }
    if (!validIdSet.has(step.connectionId)) {
      errors.push(
        `Step at index ${i} references unknown connection "${step.connectionId}"`,
      );
    }
    if (step.stepIndex !== undefined && step.stepIndex < 0) {
      errors.push(`Step at index ${i} has negative stepIndex ${step.stepIndex}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a flow with ordered steps.
 * Validates that the flow name is present and non-empty.
 * If availableConnections is passed, validates that all steps reference existing connections.
 */
export function createFlow(
  input: CreateFlowInput,
  availableConnections?: Set<ConnectionId> | ConnectionId[] | ModelConnection[],
): FlowWithSteps {
  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    throw new InvariantViolationError(
      'Flow name must not be empty',
      'INVALID_FLOW_NAME',
    );
  }

  const rawSteps = input.steps ?? [];

  if (availableConnections) {
    const validation = validateFlowSteps(rawSteps, availableConnections);
    if (!validation.valid) {
      throw new InvariantViolationError(
        `Invalid flow steps: ${validation.errors.join('; ')}`,
        'INVALID_FLOW_STEPS',
      );
    }
  }

  const flowId = input.id ?? createId('flw');
  const now = new Date();

  // Normalize step indexing and sort
  const sortedRaw = [...rawSteps].sort((a, b) => {
    const idxA = a.stepIndex ?? 0;
    const idxB = b.stepIndex ?? 0;
    return idxA - idxB;
  });

  const steps: FlowStep[] = sortedRaw.map((s, index) => ({
    id: s.id ?? `${flowId}_step_${index + 1}`,
    flowId,
    stepIndex: s.stepIndex !== undefined ? s.stepIndex : index,
    connectionId: s.connectionId,
    note: s.note ?? null,
  }));

  return {
    id: flowId,
    architectureId: input.architectureId,
    name: trimmedName,
    description: input.description ?? null,
    createdAt: now,
    updatedAt: now,
    steps,
  };
}

/**
 * Updates an existing flow and its steps.
 */
export function updateFlow(
  flow: FlowWithSteps,
  input: UpdateFlowInput,
  availableConnections?: Set<ConnectionId> | ConnectionId[] | ModelConnection[],
): FlowWithSteps {
  let name = flow.name;
  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) {
      throw new InvariantViolationError(
        'Flow name must not be empty',
        'INVALID_FLOW_NAME',
      );
    }
    name = trimmed;
  }

  const description =
    input.description !== undefined ? input.description : flow.description;

  let steps = flow.steps;
  if (input.steps !== undefined) {
    if (availableConnections) {
      const validation = validateFlowSteps(input.steps, availableConnections);
      if (!validation.valid) {
        throw new InvariantViolationError(
          `Invalid flow steps: ${validation.errors.join('; ')}`,
          'INVALID_FLOW_STEPS',
        );
      }
    }

    const sortedRaw = [...input.steps].sort((a, b) => {
      const idxA = a.stepIndex ?? 0;
      const idxB = b.stepIndex ?? 0;
      return idxA - idxB;
    });

    steps = sortedRaw.map((s, index) => ({
      id: s.id ?? `${flow.id}_step_${index + 1}`,
      flowId: flow.id,
      stepIndex: s.stepIndex !== undefined ? s.stepIndex : index,
      connectionId: s.connectionId,
      note: s.note ?? null,
    }));
  }

  return {
    ...flow,
    name,
    description,
    updatedAt: new Date(),
    steps,
  };
}

/**
 * Resolves the ordered sequence of ModelConnection objects for a given Flow.
 * If a connection cannot be found in the provided list, an error is thrown.
 */
export function getFlowConnections(
  flow: FlowWithSteps,
  connections: ModelConnection[],
): ModelConnection[] {
  const connectionMap = new Map<string, ModelConnection>(
    connections.map((c) => [c.id, c]),
  );

  const sortedSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);

  return sortedSteps.map((step) => {
    const conn = connectionMap.get(step.connectionId);
    if (!conn) {
      throw new InvariantViolationError(
        `Connection "${step.connectionId}" for flow step ${step.stepIndex} not found in model connections`,
        'CONNECTION_NOT_FOUND',
      );
    }
    return conn;
  });
}

/**
 * Reorders flow steps according to an explicit ordered list of connection IDs.
 */
export function reorderFlowSteps(
  steps: FlowStep[],
  orderedConnectionIds: ConnectionId[],
): FlowStep[] {
  const stepMap = new Map<string, FlowStep>(
    steps.map((s) => [s.connectionId, s]),
  );

  return orderedConnectionIds.map((connId, newIndex) => {
    const existing = stepMap.get(connId);
    if (!existing) {
      throw new InvariantViolationError(
        `Connection "${connId}" does not exist in the flow's current steps`,
        'UNKNOWN_CONNECTION_FOR_REORDER',
      );
    }
    return {
      ...existing,
      stepIndex: newIndex,
    };
  });
}
