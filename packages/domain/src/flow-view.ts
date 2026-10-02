import type {
  CanvasEdge,
  CanvasNode,
  ProjectViewModelConnection,
  ProjectViewModelObject,
  ProjectViewModelViewObject,
} from './canvas';
import { projectViewModelToCanvas } from './canvas';
import type { FlowWithSteps, ModelConnection, ModelObject } from './types';

export interface FlowNodeData {
  flowView?: boolean;
  isInFlow?: boolean;
  flowStepNumbers?: number[];
  isDimmed?: boolean;
  highlighted?: boolean;
  isActiveStepParticipant?: boolean;
  [key: string]: unknown;
}

export interface FlowEdgeData {
  flowView?: boolean;
  isInFlow?: boolean;
  flowStepNumbers?: number[];
  flowStepNumber?: number;
  flowStepNotes?: string[];
  flowStepNote?: string;
  isDimmed?: boolean;
  isActiveStep?: boolean;
  [key: string]: unknown;
}

export interface FlowProjectionOptions {
  activeStepIndex?: number;
}

export interface FlowProjectionResult {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  flowMetadata: {
    flowId: string;
    flowName: string;
    stepCount: number;
    participatingObjectIds: string[];
    activeStepIndex?: number;
  };
}

/**
 * Projects an architectural model and a sequence Flow onto canvas nodes and edges (F043).
 *
 * - Highlights participating nodes and edges along the flow path.
 * - Annotates edges with their sequential flow step numbers (#1, #2...) and notes.
 * - Activates flow animation along connections that participate in the flow.
 * - Dims or marks non-participating elements so the flow path stands out over the model.
 * - If activeStepIndex is provided, highlights the specific active step for playback visualization.
 * - Pure function, strictly immutable (does not mutate inputs).
 */
export function projectFlowToCanvas(
  objects: Array<ModelObject | ProjectViewModelObject>,
  connections: Array<ModelConnection | ProjectViewModelConnection> = [],
  flow: FlowWithSteps,
  viewObjects?: ProjectViewModelViewObject[],
  options?: FlowProjectionOptions,
): FlowProjectionResult {
  const normalizedConnections: ProjectViewModelConnection[] = connections.map(
    (c) => {
      const sourceId =
        'sourceObjectId' in c ? c.sourceObjectId : (c as ProjectViewModelConnection).sourceId;
      const targetId =
        'targetObjectId' in c ? c.targetObjectId : (c as ProjectViewModelConnection).targetId;
      return {
        id: c.id,
        sourceId,
        targetId,
        kind: c.kind,
        description: c.description,
      };
    },
  );

  const normalizedObjects: ProjectViewModelObject[] = objects.map((o) => ({
    id: o.id,
    name: o.name,
    kind: o.kind,
    description: o.description,
    parentId: o.parentId,
  }));

  const baseViewModel = projectViewModelToCanvas(
    normalizedObjects,
    normalizedConnections,
    viewObjects,
  );

  const sortedSteps = [...(flow.steps || [])].sort(
    (a, b) => a.stepIndex - b.stepIndex,
  );

  const flowConnectionIds = new Set<string>();
  const stepsByConnectionId = new Map<
    string,
    Array<{ stepIndex: number; stepNumber: number; note: string | null }>
  >();

  for (const step of sortedSteps) {
    flowConnectionIds.add(step.connectionId);
    const existing = stepsByConnectionId.get(step.connectionId) ?? [];
    existing.push({
      stepIndex: step.stepIndex,
      stepNumber: step.stepIndex + 1,
      note: step.note ?? null,
    });
    stepsByConnectionId.set(step.connectionId, existing);
  }

  const participatingObjectIds = new Set<string>();
  const objectStepNumbers = new Map<string, number[]>();

  for (const step of sortedSteps) {
    const conn = normalizedConnections.find((c) => c.id === step.connectionId);
    if (conn) {
      participatingObjectIds.add(conn.sourceId);
      participatingObjectIds.add(conn.targetId);

      const stepNum = step.stepIndex + 1;

      const srcSteps = objectStepNumbers.get(conn.sourceId) ?? [];
      if (!srcSteps.includes(stepNum)) srcSteps.push(stepNum);
      objectStepNumbers.set(conn.sourceId, srcSteps);

      const tgtSteps = objectStepNumbers.get(conn.targetId) ?? [];
      if (!tgtSteps.includes(stepNum)) tgtSteps.push(stepNum);
      objectStepNumbers.set(conn.targetId, tgtSteps);
    }
  }

  // Active step evaluation if requested
  const activeStep =
    options?.activeStepIndex !== undefined
      ? sortedSteps.find((s) => s.stepIndex === options.activeStepIndex)
      : undefined;

  let activeConnSourceId: string | undefined;
  let activeConnTargetId: string | undefined;

  if (activeStep) {
    const activeConn = normalizedConnections.find(
      (c) => c.id === activeStep.connectionId,
    );
    if (activeConn) {
      activeConnSourceId = activeConn.sourceId;
      activeConnTargetId = activeConn.targetId;
    }
  }

  const nodes: CanvasNode[] = baseViewModel.nodes.map((node) => {
    const isInFlow = participatingObjectIds.has(node.id);
    const flowStepNumbers = (objectStepNumbers.get(node.id) ?? []).sort(
      (a, b) => a - b,
    );
    const isActiveStepParticipant =
      activeStep !== undefined &&
      (node.id === activeConnSourceId || node.id === activeConnTargetId);

    return {
      ...node,
      data: {
        ...node.data,
        flowView: true,
        isInFlow,
        flowStepNumbers,
        isDimmed: !isInFlow,
        highlighted: isInFlow,
        isActiveStepParticipant,
      },
    };
  });

  const edges: CanvasEdge[] = baseViewModel.edges.map((edge) => {
    const isEdgeInFlow = flowConnectionIds.has(edge.id);
    const edgeStepInfos = stepsByConnectionId.get(edge.id) ?? [];
    const flowStepNumbers = edgeStepInfos.map((s) => s.stepNumber);
    const flowStepNotes = edgeStepInfos
      .map((s) => s.note)
      .filter((n): n is string => Boolean(n));

    const primaryStep = edgeStepInfos[0];
    const primaryStepNumber = primaryStep ? primaryStep.stepNumber : undefined;
    const primaryNote = primaryStep?.note ?? undefined;

    const isActiveStep =
      activeStep !== undefined && edge.id === activeStep.connectionId;

    if (isEdgeInFlow) {
      const stepPrefix =
        flowStepNumbers.length === 1
          ? `Step ${flowStepNumbers[0]}`
          : `Steps ${flowStepNumbers.join(',')}`;

      const computedLabel = primaryNote
        ? `${stepPrefix}: ${primaryNote}`
        : edge.label
          ? `${stepPrefix} (${edge.label})`
          : stepPrefix;

      return {
        ...edge,
        animated: true,
        label: computedLabel,
        data: {
          ...edge.data,
          flowView: true,
          isInFlow: true,
          flowStepNumbers,
          flowStepNumber: primaryStepNumber,
          flowStepNotes,
          flowStepNote: primaryNote,
          isActiveStep,
          isDimmed: false,
        },
      };
    }

    return {
      ...edge,
      animated: false,
      data: {
        ...edge.data,
        flowView: true,
        isInFlow: false,
        isDimmed: true,
        isActiveStep: false,
      },
    };
  });

  return {
    nodes,
    edges,
    flowMetadata: {
      flowId: flow.id,
      flowName: flow.name,
      stepCount: sortedSteps.length,
      participatingObjectIds: Array.from(participatingObjectIds),
      activeStepIndex: options?.activeStepIndex,
    },
  };
}
