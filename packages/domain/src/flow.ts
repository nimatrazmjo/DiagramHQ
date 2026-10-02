import { createId, type ArchitectureId, type ConnectionId, type FlowId, type ObjectId } from './ids';
import { InvariantViolationError } from './invariants';
import type {
  DataLineageHop,
  DataLineageTrace,
  FlowStep,
  FlowType,
  FlowWithSteps,
  ModelConnection,
  ModelObject,
  SequenceDiagramExportOptions,
} from './types';

export interface CreateFlowStepInput {
  id?: string;
  connectionId: ConnectionId;
  stepIndex?: number;
  note?: string | null;
  actorAction?: string | null;
  userIntent?: string | null;
  dataElements?: string[];
  transformation?: string | null;
  dataClassification?: string | null;
  endpoint?: string | null;
  httpMethod?: string | null;
  requestSchema?: string | null;
  responseSchema?: string | null;
  statusCode?: number | null;
}

export interface CreateFlowInput {
  id?: FlowId;
  architectureId: ArchitectureId;
  name: string;
  description?: string | null;
  type?: FlowType;
  actorId?: ObjectId | null;
  persona?: string | null;
  dataClassification?: string | null;
  dataElements?: string[];
  endpoint?: string | null;
  httpMethod?: string | null;
  requestSchema?: string | null;
  responseSchema?: string | null;
  statusCode?: number | null;
  steps?: CreateFlowStepInput[];
}

export interface UpdateFlowInput {
  name?: string;
  description?: string | null;
  type?: FlowType;
  actorId?: ObjectId | null;
  persona?: string | null;
  dataClassification?: string | null;
  dataElements?: string[];
  endpoint?: string | null;
  httpMethod?: string | null;
  requestSchema?: string | null;
  responseSchema?: string | null;
  statusCode?: number | null;
  steps?: CreateFlowStepInput[];
}

export interface CreateUserJourneyFlowInput {
  id?: FlowId;
  architectureId: ArchitectureId;
  name: string;
  description?: string | null;
  actorId?: ObjectId | null;
  persona?: string | null;
  steps?: CreateFlowStepInput[];
}

export interface CreateDataFlowInput {
  id?: FlowId;
  architectureId: ArchitectureId;
  name: string;
  description?: string | null;
  dataClassification?: string | null;
  dataElements?: string[];
  steps?: CreateFlowStepInput[];
}

export interface CreateApiFlowInput {
  id?: FlowId;
  architectureId: ArchitectureId;
  name: string;
  endpoint: string;
  httpMethod?: string | null;
  description?: string | null;
  requestSchema?: string | null;
  responseSchema?: string | null;
  statusCode?: number | null;
  steps?: CreateFlowStepInput[];
}

export interface UserJourneyStepAnnotations {
  note?: string | null;
  actorAction?: string | null;
  userIntent?: string | null;
}

export interface ApiFlowStepAnnotations {
  endpoint?: string | null;
  httpMethod?: string | null;
  requestSchema?: string | null;
  responseSchema?: string | null;
  statusCode?: number | null;
  note?: string | null;
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
    actorAction: s.actorAction ?? null,
    userIntent: s.userIntent ?? null,
    dataElements: s.dataElements ? [...s.dataElements] : undefined,
    transformation: s.transformation ?? null,
    dataClassification: s.dataClassification ?? null,
    endpoint: s.endpoint ?? null,
    httpMethod: s.httpMethod ? s.httpMethod.toUpperCase() : null,
    requestSchema: s.requestSchema ?? null,
    responseSchema: s.responseSchema ?? null,
    statusCode: s.statusCode !== undefined ? s.statusCode : null,
  }));

  return {
    id: flowId,
    architectureId: input.architectureId,
    name: trimmedName,
    description: input.description ?? null,
    type: input.type ?? 'sequence',
    actorId: input.actorId ?? null,
    persona: input.persona ?? null,
    dataClassification: input.dataClassification ?? null,
    dataElements: input.dataElements ? [...input.dataElements] : undefined,
    endpoint: input.endpoint ?? null,
    httpMethod: input.httpMethod ? input.httpMethod.toUpperCase() : null,
    requestSchema: input.requestSchema ?? null,
    responseSchema: input.responseSchema ?? null,
    statusCode: input.statusCode !== undefined ? input.statusCode : null,
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
  const type = input.type !== undefined ? input.type : flow.type;
  const actorId = input.actorId !== undefined ? input.actorId : flow.actorId;
  const persona = input.persona !== undefined ? input.persona : flow.persona;
  const dataClassification =
    input.dataClassification !== undefined
      ? input.dataClassification
      : flow.dataClassification;
  const dataElements =
    input.dataElements !== undefined ? input.dataElements : flow.dataElements;
  const endpoint =
    input.endpoint !== undefined ? input.endpoint : flow.endpoint;
  const httpMethod =
    input.httpMethod !== undefined
      ? input.httpMethod ? input.httpMethod.toUpperCase() : null
      : flow.httpMethod;
  const requestSchema =
    input.requestSchema !== undefined ? input.requestSchema : flow.requestSchema;
  const responseSchema =
    input.responseSchema !== undefined ? input.responseSchema : flow.responseSchema;
  const statusCode =
    input.statusCode !== undefined ? input.statusCode : flow.statusCode;

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
      actorAction: s.actorAction ?? null,
      userIntent: s.userIntent ?? null,
      dataElements: s.dataElements ? [...s.dataElements] : undefined,
      transformation: s.transformation ?? null,
      dataClassification: s.dataClassification ?? null,
      endpoint: s.endpoint ?? null,
      httpMethod: s.httpMethod ? s.httpMethod.toUpperCase() : null,
      requestSchema: s.requestSchema ?? null,
      responseSchema: s.responseSchema ?? null,
      statusCode: s.statusCode !== undefined ? s.statusCode : null,
    }));
  }

  return {
    ...flow,
    name,
    description,
    type,
    actorId,
    persona,
    dataClassification,
    dataElements,
    endpoint,
    httpMethod,
    requestSchema,
    responseSchema,
    statusCode,
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

/**
 * Adds a step to a flow, either at a designated index or appended at the end.
 * Subsequent step indices are shifted accordingly, and all existing notes and order are preserved.
 */
export function addFlowStep(
  flow: FlowWithSteps,
  stepInput: CreateFlowStepInput,
  insertAtIndex?: number,
  availableConnections?: Set<ConnectionId> | ConnectionId[] | ModelConnection[],
): FlowWithSteps {
  if (availableConnections) {
    const validation = validateFlowSteps([stepInput], availableConnections);
    if (!validation.valid) {
      throw new InvariantViolationError(
        `Invalid flow step: ${validation.errors.join('; ')}`,
        'INVALID_FLOW_STEPS',
      );
    }
  }

  const sortedSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);
  const targetIndex =
    insertAtIndex !== undefined
      ? Math.max(0, Math.min(insertAtIndex, sortedSteps.length))
      : sortedSteps.length;

  const newStep: FlowStep = {
    id: stepInput.id ?? `${flow.id}_step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    flowId: flow.id,
    stepIndex: targetIndex,
    connectionId: stepInput.connectionId,
    note: stepInput.note ?? null,
    actorAction: stepInput.actorAction ?? null,
    userIntent: stepInput.userIntent ?? null,
    dataElements: stepInput.dataElements ? [...stepInput.dataElements] : undefined,
    transformation: stepInput.transformation ?? null,
    dataClassification: stepInput.dataClassification ?? null,
    endpoint: stepInput.endpoint ?? null,
    httpMethod: stepInput.httpMethod ? stepInput.httpMethod.toUpperCase() : null,
    requestSchema: stepInput.requestSchema ?? null,
    responseSchema: stepInput.responseSchema ?? null,
    statusCode: stepInput.statusCode !== undefined ? stepInput.statusCode : null,
  };

  sortedSteps.splice(targetIndex, 0, newStep);

  // Normalize all indices to 0..N-1
  const updatedSteps = sortedSteps.map((step, idx) => ({
    ...step,
    stepIndex: idx,
  }));

  return {
    ...flow,
    updatedAt: new Date(),
    steps: updatedSteps,
  };
}

/**
 * Removes a step by its ID or its 0-based index.
 * Remaining steps maintain their relative order, notes persist, and stepIndex is normalized.
 */
export function removeFlowStep(
  flow: FlowWithSteps,
  stepIdOrIndex: string | number,
): FlowWithSteps {
  const sortedSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);
  let removeIndex = -1;

  if (typeof stepIdOrIndex === 'number') {
    removeIndex = stepIdOrIndex;
  } else {
    removeIndex = sortedSteps.findIndex((s) => s.id === stepIdOrIndex);
  }

  if (removeIndex < 0 || removeIndex >= sortedSteps.length) {
    throw new InvariantViolationError(
      `Step "${stepIdOrIndex}" not found in flow "${flow.id}"`,
      'STEP_NOT_FOUND',
    );
  }

  sortedSteps.splice(removeIndex, 1);

  const updatedSteps = sortedSteps.map((step, idx) => ({
    ...step,
    stepIndex: idx,
  }));

  return {
    ...flow,
    updatedAt: new Date(),
    steps: updatedSteps,
  };
}

/**
 * Annotates a step with a note.
 * Step order and notes on all other steps are preserved.
 */
export function annotateFlowStep(
  flow: FlowWithSteps,
  stepIdOrIndex: string | number,
  note: string | null,
): FlowWithSteps {
  const sortedSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);
  let targetIndex = -1;

  if (typeof stepIdOrIndex === 'number') {
    targetIndex = stepIdOrIndex;
  } else {
    targetIndex = sortedSteps.findIndex((s) => s.id === stepIdOrIndex);
  }

  if (targetIndex < 0 || targetIndex >= sortedSteps.length) {
    throw new InvariantViolationError(
      `Step "${stepIdOrIndex}" not found in flow "${flow.id}"`,
      'STEP_NOT_FOUND',
    );
  }

  const existing = sortedSteps[targetIndex];
  if (!existing) {
    throw new InvariantViolationError(
      `Step "${stepIdOrIndex}" not found in flow "${flow.id}"`,
      'STEP_NOT_FOUND',
    );
  }

  sortedSteps[targetIndex] = {
    ...existing,
    note: note ?? null,
  };

  return {
    ...flow,
    updatedAt: new Date(),
    steps: sortedSteps,
  };
}

/**
 * Reorders flow steps by moving a step from one index to another.
 * All notes and connection IDs persist.
 */
export function reorderFlowStepsByIndex(
  flow: FlowWithSteps,
  fromIndex: number,
  toIndex: number,
): FlowWithSteps {
  const sortedSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);

  if (
    fromIndex < 0 ||
    fromIndex >= sortedSteps.length ||
    toIndex < 0 ||
    toIndex >= sortedSteps.length
  ) {
    throw new InvariantViolationError(
      `Invalid indices for reorder: fromIndex ${fromIndex}, toIndex ${toIndex} (total steps: ${sortedSteps.length})`,
      'INVALID_REORDER_INDEX',
    );
  }

  const [moved] = sortedSteps.splice(fromIndex, 1);
  if (!moved) {
    throw new InvariantViolationError(
      `Could not retrieve step at fromIndex ${fromIndex}`,
      'INVALID_REORDER_INDEX',
    );
  }
  sortedSteps.splice(toIndex, 0, moved);

  const updatedSteps = sortedSteps.map((step, idx) => ({
    ...step,
    stepIndex: idx,
  }));

  return {
    ...flow,
    updatedAt: new Date(),
    steps: updatedSteps,
  };
}

/**
 * Reorders flow steps according to an explicit ordered list of step IDs.
 * All notes and connections are preserved in the new order.
 */
export function reorderFlowStepList(
  flow: FlowWithSteps,
  orderedStepIds: string[],
): FlowWithSteps {
  const stepMap = new Map<string, FlowStep>(
    flow.steps.map((s) => [s.id, s]),
  );

  if (orderedStepIds.length !== flow.steps.length) {
    throw new InvariantViolationError(
      `Reorder list length (${orderedStepIds.length}) does not match flow step count (${flow.steps.length})`,
      'REORDER_COUNT_MISMATCH',
    );
  }

  const updatedSteps = orderedStepIds.map((stepId, newIndex) => {
    const step = stepMap.get(stepId);
    if (!step) {
      throw new InvariantViolationError(
        `Step id "${stepId}" does not exist in flow "${flow.id}"`,
        'UNKNOWN_STEP_ID',
      );
    }
    return {
      ...step,
      stepIndex: newIndex,
    };
  });

  return {
    ...flow,
    updatedAt: new Date(),
    steps: updatedSteps,
  };
}

/**
 * Creates a user journey flow (F045).
 * Validates that name is provided, flow type is set to 'user_journey',
 * and optionally validates that actorId belongs to a known model object.
 */
export function createUserJourneyFlow(
  input: CreateUserJourneyFlowInput,
  availableConnections?: Set<ConnectionId> | ConnectionId[] | ModelConnection[],
  availableObjects?: Set<ObjectId> | ObjectId[] | ModelObject[],
): FlowWithSteps {
  if (availableObjects && input.actorId) {
    const validObjectIds = new Set<string>();
    if (availableObjects instanceof Set) {
      for (const id of availableObjects) validObjectIds.add(id);
    } else {
      for (const item of availableObjects) {
        if (typeof item === 'string') validObjectIds.add(item);
        else if (item && typeof item === 'object' && 'id' in item) validObjectIds.add(item.id);
      }
    }

    if (!validObjectIds.has(input.actorId)) {
      throw new InvariantViolationError(
        `Actor object "${input.actorId}" not found in model objects`,
        'ACTOR_NOT_FOUND',
      );
    }
  }

  return createFlow(
    {
      ...input,
      type: 'user_journey',
    },
    availableConnections,
  );
}

/**
 * Annotates a user journey step with contextual note, actor action, and user intent (F045).
 */
export function annotateUserJourneyStep(
  flow: FlowWithSteps,
  stepIdOrIndex: string | number,
  annotations: UserJourneyStepAnnotations,
): FlowWithSteps {
  const sortedSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);
  let targetIndex = -1;

  if (typeof stepIdOrIndex === 'number') {
    targetIndex = stepIdOrIndex;
  } else {
    targetIndex = sortedSteps.findIndex((s) => s.id === stepIdOrIndex);
  }

  if (targetIndex < 0 || targetIndex >= sortedSteps.length) {
    throw new InvariantViolationError(
      `Step "${stepIdOrIndex}" not found in flow "${flow.id}"`,
      'STEP_NOT_FOUND',
    );
  }

  const existing = sortedSteps[targetIndex];
  if (!existing) {
    throw new InvariantViolationError(
      `Step "${stepIdOrIndex}" not found in flow "${flow.id}"`,
      'STEP_NOT_FOUND',
    );
  }

  sortedSteps[targetIndex] = {
    ...existing,
    note: annotations.note !== undefined ? annotations.note : existing.note,
    actorAction:
      annotations.actorAction !== undefined
        ? annotations.actorAction
        : existing.actorAction,
    userIntent:
      annotations.userIntent !== undefined
        ? annotations.userIntent
        : existing.userIntent,
  };

  return {
    ...flow,
    updatedAt: new Date(),
    steps: sortedSteps,
  };
}

export interface DataFlowStepAnnotations {
  note?: string | null;
  dataElements?: string[];
  transformation?: string | null;
  dataClassification?: string | null;
}

/**
 * Creates a data flow (F046).
 * Sets type to 'data_flow' and associates data elements & data classification.
 */
export function createDataFlow(
  input: CreateDataFlowInput,
  availableConnections?: Set<ConnectionId> | ConnectionId[] | ModelConnection[],
): FlowWithSteps {
  return createFlow(
    {
      ...input,
      type: 'data_flow',
    },
    availableConnections,
  );
}

/**
 * Annotates a data flow step with data elements, transformation notes, and classification (F046).
 */
export function annotateDataFlowStep(
  flow: FlowWithSteps,
  stepIdOrIndex: string | number,
  annotations: DataFlowStepAnnotations,
): FlowWithSteps {
  const sortedSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);
  let targetIndex = -1;

  if (typeof stepIdOrIndex === 'number') {
    targetIndex = stepIdOrIndex;
  } else {
    targetIndex = sortedSteps.findIndex((s) => s.id === stepIdOrIndex);
  }

  if (targetIndex < 0 || targetIndex >= sortedSteps.length) {
    throw new InvariantViolationError(
      `Step "${stepIdOrIndex}" not found in flow "${flow.id}"`,
      'STEP_NOT_FOUND',
    );
  }

  const existing = sortedSteps[targetIndex];
  if (!existing) {
    throw new InvariantViolationError(
      `Step "${stepIdOrIndex}" not found in flow "${flow.id}"`,
      'STEP_NOT_FOUND',
    );
  }

  sortedSteps[targetIndex] = {
    ...existing,
    note: annotations.note !== undefined ? annotations.note : existing.note,
    dataElements:
      annotations.dataElements !== undefined
        ? annotations.dataElements
        : existing.dataElements,
    transformation:
      annotations.transformation !== undefined
        ? annotations.transformation
        : existing.transformation,
    dataClassification:
      annotations.dataClassification !== undefined
        ? annotations.dataClassification
        : existing.dataClassification,
  };

  return {
    ...flow,
    updatedAt: new Date(),
    steps: sortedSteps,
  };
}

/**
 * Extracts the sequential data lineage trace from a data flow (F046 feeds F091).
 * Traces data elements across hops, records transformations, and flags external egress points.
 */
export function extractDataLineage(
  flow: FlowWithSteps,
  connections: ModelConnection[],
  options?: {
    searchedElement?: string;
    externalObjectIds?: Set<ObjectId> | ObjectId[];
  },
): DataLineageTrace {
  const connectionMap = new Map<string, ModelConnection>(
    connections.map((c) => [c.id, c]),
  );

  const sortedSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);
  const externalIdSet = new Set<string>();
  if (options?.externalObjectIds) {
    for (const id of options.externalObjectIds) {
      externalIdSet.add(typeof id === 'string' ? id : (id as ModelObject).id);
    }
  }

  const hops: DataLineageHop[] = [];
  const participatingObjectIds = new Set<ObjectId>();
  const exits: DataLineageTrace['exits'] = [];

  for (let i = 0; i < sortedSteps.length; i++) {
    const step = sortedSteps[i]!;
    const conn = connectionMap.get(step.connectionId);
    if (!conn) continue;

    const stepElements =
      step.dataElements && step.dataElements.length > 0
        ? step.dataElements
        : flow.dataElements ?? [];

    if (
      options?.searchedElement &&
      !stepElements.some((el) =>
        el.toLowerCase().includes(options.searchedElement!.toLowerCase()),
      )
    ) {
      continue;
    }

    const hop: DataLineageHop = {
      hopIndex: hops.length,
      stepId: step.id,
      connectionId: step.connectionId,
      sourceObjectId: conn.sourceObjectId,
      targetObjectId: conn.targetObjectId,
      dataElements: stepElements,
      transformation: step.transformation ?? null,
      dataClassification: step.dataClassification ?? flow.dataClassification ?? null,
      note: step.note ?? null,
    };

    hops.push(hop);
    participatingObjectIds.add(conn.sourceObjectId);
    participatingObjectIds.add(conn.targetObjectId);

    if (externalIdSet.has(conn.targetObjectId)) {
      exits.push({
        hopIndex: hop.hopIndex,
        exitObjectId: conn.targetObjectId,
        connectionId: conn.id,
        dataElements: stepElements,
        dataClassification: hop.dataClassification,
      });
    }
  }

  return {
    flowId: flow.id,
    flowName: flow.name,
    searchedElement: options?.searchedElement ?? null,
    hops,
    participatingObjectIds: Array.from(participatingObjectIds),
    exits,
  };
}

/**
 * Creates an API-request flow (F047).
 * Encapsulates endpoint, HTTP method, schemas, and HTTP status codes.
 */
export function createApiFlow(
  input: CreateApiFlowInput,
  availableConnections?: Set<ConnectionId> | ConnectionId[] | ModelConnection[],
): FlowWithSteps {
  const trimmedEndpoint = input.endpoint ? input.endpoint.trim() : '';
  if (!trimmedEndpoint) {
    throw new InvariantViolationError(
      'API flow endpoint must not be empty',
      'INVALID_API_ENDPOINT',
    );
  }

  return createFlow(
    {
      id: input.id,
      architectureId: input.architectureId,
      name: input.name,
      description: input.description,
      type: 'api_flow',
      endpoint: trimmedEndpoint,
      httpMethod: input.httpMethod ? input.httpMethod.trim().toUpperCase() : 'GET',
      requestSchema: input.requestSchema ?? null,
      responseSchema: input.responseSchema ?? null,
      statusCode: input.statusCode !== undefined ? input.statusCode : 200,
      steps: input.steps,
    },
    availableConnections,
  );
}

/**
 * Annotates an individual flow step with API metadata (HTTP method, endpoint, schemas, status code).
 */
export function annotateApiFlowStep(
  step: FlowStep,
  annotations: ApiFlowStepAnnotations,
): FlowStep {
  return {
    ...step,
    endpoint:
      annotations.endpoint !== undefined ? annotations.endpoint : step.endpoint,
    httpMethod:
      annotations.httpMethod !== undefined
        ? annotations.httpMethod?.toUpperCase() ?? null
        : step.httpMethod,
    requestSchema:
      annotations.requestSchema !== undefined
        ? annotations.requestSchema
        : step.requestSchema,
    responseSchema:
      annotations.responseSchema !== undefined
        ? annotations.responseSchema
        : step.responseSchema,
    statusCode:
      annotations.statusCode !== undefined
        ? annotations.statusCode
        : step.statusCode,
    note: annotations.note !== undefined ? annotations.note : step.note,
  };
}

function normalizeModelInput(
  modelOrObjects:
    | { objects: ModelObject[]; connections: ModelConnection[] }
    | ModelObject[],
  connections?: ModelConnection[],
): {
  objects: ModelObject[];
  connections: ModelConnection[];
} {
  if (Array.isArray(modelOrObjects)) {
    return {
      objects: modelOrObjects,
      connections: connections ?? [],
    };
  }
  return {
    objects: modelOrObjects.objects ?? [],
    connections: modelOrObjects.connections ?? [],
  };
}

/**
 * Exports a FlowWithSteps sequence to Mermaid sequence diagram syntax (F047).
 */
export function exportFlowToMermaidSequence(
  flow: FlowWithSteps,
  modelOrObjects:
    | { objects: ModelObject[]; connections: ModelConnection[] }
    | ModelObject[],
  connections?: ModelConnection[],
  options?: SequenceDiagramExportOptions,
): string {
  const { objects, connections: modelConnections } = normalizeModelInput(
    modelOrObjects,
    connections,
  );

  const connectionMap = new Map<string, ModelConnection>(
    modelConnections.map((c) => [c.id, c]),
  );
  const objectMap = new Map<string, ModelObject>(
    objects.map((o) => [o.id, o]),
  );

  const sortedSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);

  const participantIds: string[] = [];
  const participantIdSet = new Set<string>();

  for (const step of sortedSteps) {
    const conn = connectionMap.get(step.connectionId);
    if (!conn) {
      throw new InvariantViolationError(
        `Connection "${step.connectionId}" for flow step ${step.stepIndex} not found in model connections`,
        'CONNECTION_NOT_FOUND',
      );
    }
    if (!participantIdSet.has(conn.sourceObjectId)) {
      participantIdSet.add(conn.sourceObjectId);
      participantIds.push(conn.sourceObjectId);
    }
    if (!participantIdSet.has(conn.targetObjectId)) {
      participantIdSet.add(conn.targetObjectId);
      participantIds.push(conn.targetObjectId);
    }
  }

  const lines: string[] = ['sequenceDiagram'];

  if (options?.autonumber !== false) {
    lines.push('    autonumber');
  }

  const title = options?.title ?? flow.name;
  if (title) {
    lines.push(`    %% ${title}`);
  }

  const aliasMap = new Map<string, string>();
  for (const objId of participantIds) {
    const obj = objectMap.get(objId as ObjectId);
    const alias = `p_${objId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    aliasMap.set(objId, alias);
    const label = obj ? obj.name.replace(/["\n\r;]/g, '') : objId;
    if (obj?.kind === 'actor') {
      lines.push(`    actor ${alias} as ${label}`);
    } else {
      lines.push(`    participant ${alias} as ${label}`);
    }
  }

  for (const step of sortedSteps) {
    const conn = connectionMap.get(step.connectionId)!;
    const sourceAlias = aliasMap.get(conn.sourceObjectId) ?? conn.sourceObjectId;
    const targetAlias = aliasMap.get(conn.targetObjectId) ?? conn.targetObjectId;

    const method = step.httpMethod ?? (step.stepIndex === 0 ? flow.httpMethod : null);
    const endpoint = step.endpoint ?? (step.stepIndex === 0 ? flow.endpoint : null);

    let messageText = '';
    if (method && endpoint) {
      messageText = `${method} ${endpoint}`;
    } else if (endpoint) {
      messageText = endpoint;
    } else if (step.note) {
      messageText = step.note;
    } else if (conn.description) {
      messageText = conn.description;
    } else {
      messageText = method ?? 'call';
    }

    lines.push(`    ${sourceAlias}->>${targetAlias}: ${messageText}`);

    if (options?.includeNotes !== false && step.note && (method || endpoint)) {
      lines.push(`    Note over ${targetAlias}: ${step.note}`);
    }

    if (options?.includeSchemas) {
      if (step.requestSchema) {
        lines.push(`    Note over ${sourceAlias},${targetAlias}: Req: ${step.requestSchema}`);
      }
      if (step.responseSchema) {
        lines.push(`    Note over ${targetAlias},${sourceAlias}: Res: ${step.responseSchema}`);
      }
    }

    const statusCode =
      step.statusCode ?? (step.stepIndex === sortedSteps.length - 1 ? flow.statusCode : null);
    if (options?.includeReturnArrows || (options?.includeStatusCodes !== false && statusCode)) {
      const returnLabel = statusCode ? `${statusCode}` : '200 OK';
      lines.push(`    ${targetAlias}-->>${sourceAlias}: ${returnLabel}`);
    }
  }

  return lines.join('\n');
}

/**
 * Exports a FlowWithSteps sequence to PlantUML sequence diagram syntax (F047).
 */
export function exportFlowToPlantUMLSequence(
  flow: FlowWithSteps,
  modelOrObjects:
    | { objects: ModelObject[]; connections: ModelConnection[] }
    | ModelObject[],
  connections?: ModelConnection[],
  options?: SequenceDiagramExportOptions,
): string {
  const { objects, connections: modelConnections } = normalizeModelInput(
    modelOrObjects,
    connections,
  );

  const connectionMap = new Map<string, ModelConnection>(
    modelConnections.map((c) => [c.id, c]),
  );
  const objectMap = new Map<string, ModelObject>(
    objects.map((o) => [o.id, o]),
  );

  const sortedSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);

  const participantIds: string[] = [];
  const participantIdSet = new Set<string>();

  for (const step of sortedSteps) {
    const conn = connectionMap.get(step.connectionId);
    if (!conn) {
      throw new InvariantViolationError(
        `Connection "${step.connectionId}" for flow step ${step.stepIndex} not found in model connections`,
        'CONNECTION_NOT_FOUND',
      );
    }
    if (!participantIdSet.has(conn.sourceObjectId)) {
      participantIdSet.add(conn.sourceObjectId);
      participantIds.push(conn.sourceObjectId);
    }
    if (!participantIdSet.has(conn.targetObjectId)) {
      participantIdSet.add(conn.targetObjectId);
      participantIds.push(conn.targetObjectId);
    }
  }

  const lines: string[] = ['@startuml'];

  const title = options?.title ?? flow.name;
  if (title) {
    lines.push(`title ${title}`);
  }

  if (options?.autonumber !== false) {
    lines.push('autonumber');
  }

  const aliasMap = new Map<string, string>();
  for (const objId of participantIds) {
    const obj = objectMap.get(objId as ObjectId);
    const alias = `p_${objId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    aliasMap.set(objId, alias);
    const label = obj ? obj.name.replace(/["\n\r;]/g, '') : objId;
    if (obj?.kind === 'actor') {
      lines.push(`actor "${label}" as ${alias}`);
    } else {
      lines.push(`participant "${label}" as ${alias}`);
    }
  }

  for (const step of sortedSteps) {
    const conn = connectionMap.get(step.connectionId)!;
    const sourceAlias = aliasMap.get(conn.sourceObjectId) ?? conn.sourceObjectId;
    const targetAlias = aliasMap.get(conn.targetObjectId) ?? conn.targetObjectId;

    const method = step.httpMethod ?? (step.stepIndex === 0 ? flow.httpMethod : null);
    const endpoint = step.endpoint ?? (step.stepIndex === 0 ? flow.endpoint : null);

    let messageText = '';
    if (method && endpoint) {
      messageText = `${method} ${endpoint}`;
    } else if (endpoint) {
      messageText = endpoint;
    } else if (step.note) {
      messageText = step.note;
    } else if (conn.description) {
      messageText = conn.description;
    } else {
      messageText = method ?? 'call';
    }

    lines.push(`${sourceAlias} -> ${targetAlias}: ${messageText}`);

    if (options?.includeNotes !== false && step.note && (method || endpoint)) {
      lines.push(`note over ${targetAlias}: ${step.note}`);
    }

    if (options?.includeSchemas) {
      if (step.requestSchema) {
        lines.push(`note over ${sourceAlias}, ${targetAlias}: Req: ${step.requestSchema}`);
      }
      if (step.responseSchema) {
        lines.push(`note over ${targetAlias}, ${sourceAlias}: Res: ${step.responseSchema}`);
      }
    }

    const statusCode =
      step.statusCode ?? (step.stepIndex === sortedSteps.length - 1 ? flow.statusCode : null);
    if (options?.includeReturnArrows || (options?.includeStatusCodes !== false && statusCode)) {
      const returnLabel = statusCode ? `${statusCode}` : '200 OK';
      lines.push(`${targetAlias} --> ${sourceAlias}: ${returnLabel}`);
    }
  }

  lines.push('@enduml');
  return lines.join('\n');
}



