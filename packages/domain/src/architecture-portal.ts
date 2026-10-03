/**
 * DiagramHQ - Architecture Portal Domain Engine (F095)
 *
 * Public read-only architecture explorer and interactive portal viewable
 * without an account:
 * - Multi-level C4 hierarchy drill-down:
 *   - Level 1: System Context (systems, external actors, standalone stores)
 *   - Level 2: Container (applications, microservices, databases, queues inside a system)
 *   - Level 3: Component (modular components, internal modules inside a container)
 *   - Navigational breadcrumbs with click-to-ascend.
 * - Interactive canvas and camera control:
 *   - Pan, zoom in, zoom out, fit-to-view / reset camera.
 * - Object selection & dependency inspector:
 *   - Detailed metadata, owner, tech stack, SLA, status.
 *   - Direct inbound callers (upstream dependencies) and outbound downstream services.
 *   - Contained subcomponents with click-to-drill.
 *   - Dependency graph path highlighting.
 *   - Associated documentation, ADRs, views, and execution flows.
 * - Execution flow playback:
 *   - Step-by-step flow exploration with active edge and participant highlighting.
 * - Global full-text search:
 *   - Searches across objects, views, flows, and ADRs with direct jump and drill-down targets.
 * - Read-only guarantee:
 *   - Immutable view projections accessible without user login or account creation.
 */

import {
  type ArchitectureId,
  type ConnectionId,
  type FlowId,
  type ObjectId,
  type ViewId,
} from './ids';
import type {
  ArchitectureModel,
  ConnectionKind,
  Flow,
  FlowStep,
  ModelConnection,
  ModelObject,
  ObjectKind,
  ViewKind,
} from './types';
import type { DocGenerationContext } from './architecture-documentation';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type PortalHierarchyLevel = 'context' | 'container' | 'component';

export interface PortalBreadcrumb {
  level: PortalHierarchyLevel;
  objectId?: ObjectId;
  name: string;
}

export interface PortalCameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface PortalObjectNode {
  id: ObjectId;
  name: string;
  kind: ObjectKind;
  description?: string;
  parentId?: ObjectId | null;
  technology?: string;
  owner?: string;
  status?: string;
  sla?: string;
  childCount: number;
  inboundCount: number;
  outboundCount: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PortalConnectionEdge {
  id: ConnectionId;
  sourceId: ObjectId;
  targetId: ObjectId;
  kind: ConnectionKind;
  label?: string;
  protocol?: string;
  isBidirectional?: boolean;
}

export interface PortalDrillDownState {
  currentLevel: PortalHierarchyLevel;
  activeParentId: ObjectId | null;
  breadcrumbs: PortalBreadcrumb[];
  visibleNodes: PortalObjectNode[];
  visibleEdges: PortalConnectionEdge[];
}

export interface PortalDependencyHighlight {
  selectedObjectId: ObjectId;
  upstreamNodeIds: ObjectId[];
  downstreamNodeIds: ObjectId[];
  activeConnectionIds: ConnectionId[];
}

export interface PortalObjectInspector {
  object: PortalObjectNode;
  parent?: PortalObjectNode;
  inboundDependencies: Array<{
    connectionId: ConnectionId;
    source: PortalObjectNode;
    label?: string;
    protocol?: string;
  }>;
  outboundDependencies: Array<{
    connectionId: ConnectionId;
    target: PortalObjectNode;
    label?: string;
    protocol?: string;
  }>;
  children: PortalObjectNode[];
  associatedFlows: Array<{
    flowId: FlowId;
    name: string;
    type?: string;
  }>;
  associatedViews: Array<{
    viewId: ViewId;
    name: string;
    kind: ViewKind;
  }>;
  associatedAdrs: Array<{
    adrId: string;
    number: number;
    title: string;
    status: string;
  }>;
  docSummary?: string;
}

export interface PortalFlowPlaybackState {
  flowId: FlowId;
  name: string;
  flowName: string;
  type: string;
  description?: string;
  totalSteps: number;
  currentStepIndex: number;
  activeStep?: {
    stepIndex: number;
    sourceId: ObjectId;
    targetId: ObjectId;
    connectionId?: ConnectionId;
    note?: string;
    label?: string;
  };
  participantIds: ObjectId[];
}

export interface PortalSearchResult {
  id: string;
  type: 'object' | 'view' | 'flow' | 'adr' | 'doc';
  title: string;
  subtitle: string;
  category: string;
  targetObjectId?: ObjectId;
  targetParentId?: ObjectId | null;
  targetViewId?: ViewId;
  targetFlowId?: FlowId;
  level?: PortalHierarchyLevel;
  score: number;
}

export interface ArchitecturePortalState {
  architectureId: ArchitectureId;
  architectureName: string;
  description?: string;
  drillDown: PortalDrillDownState;
  selectedObjectId: ObjectId | null;
  selectedConnectionId: ConnectionId | null;
  inspector: PortalObjectInspector | null;
  highlightedDependencies: PortalDependencyHighlight | null;
  activeViewId: ViewId | null;
  activeFlow: PortalFlowPlaybackState | null;
  camera: PortalCameraState;
  isReadOnly: true;
}

// ============================================================================
// Layout and Coordinate Calculation Utilities
// ============================================================================

/**
 * Computes deterministic 2D grid positions for a list of portal nodes.
 */
export function computePortalNodeLayout(
  objects: ModelObject[],
  options?: { columns?: number; nodeWidth?: number; nodeHeight?: number; gapX?: number; gapY?: number },
): Map<ObjectId, { x: number; y: number; width: number; height: number }> {
  const columns = options?.columns || 3;
  const nodeWidth = options?.nodeWidth || 220;
  const nodeHeight = options?.nodeHeight || 120;
  const gapX = options?.gapX || 80;
  const gapY = options?.gapY || 70;

  const layout = new Map<ObjectId, { x: number; y: number; width: number; height: number }>();

  objects.forEach((obj, index) => {
    // If object has explicit position in model, preserve it
    if (obj.position) {
      layout.set(obj.id, {
        x: obj.position.x,
        y: obj.position.y,
        width: nodeWidth,
        height: nodeHeight,
      });
      return;
    }

    const row = Math.floor(index / columns);
    const col = index % columns;
    const x = col * (nodeWidth + gapX);
    const y = row * (nodeHeight + gapY);

    layout.set(obj.id, { x, y, width: nodeWidth, height: nodeHeight });
  });

  return layout;
}

// ============================================================================
// Hierarchy Projection & Drill-Down Engine
// ============================================================================

/**
 * Builds the visible portal nodes and edges for the given hierarchy parent.
 * - When activeParentId is null: shows System Context (systems, actors, top-level entities).
 * - When activeParentId is a System: shows Containers inside the system.
 * - When activeParentId is a Container: shows Components inside the container.
 */
export function buildPortalLevelProjection(
  model: ArchitectureModel,
  activeParentId: ObjectId | null = null,
): PortalDrillDownState {
  let currentLevel: PortalHierarchyLevel = 'context';
  let activeParent: ModelObject | undefined = undefined;

  if (activeParentId) {
    activeParent = model.objects.find((o) => o.id === activeParentId);
    if (activeParent) {
      if (activeParent.kind === 'system') {
        currentLevel = 'container';
      } else {
        currentLevel = 'component';
      }
    }
  }

  // 1. Filter visible objects
  let levelObjects: ModelObject[] = [];

  if (!activeParentId) {
    // Root level: objects with no parent or top-level systems/actors
    levelObjects = model.objects.filter((o) => {
      if (!o.parentId) return true;
      // Also include standalone systems or actors even if grouped
      return o.kind === 'actor';
    });

    // If no unparented objects exist, fallback to all systems
    if (levelObjects.length === 0) {
      levelObjects = model.objects.filter((o) => o.kind === 'system' || o.kind === 'actor');
    }
  } else {
    // Objects contained directly inside activeParentId
    levelObjects = model.objects.filter((o) => o.parentId === activeParentId);
  }

  // Fallback if level has 0 children: display all model objects
  if (levelObjects.length === 0 && !activeParentId) {
    levelObjects = model.objects;
  }

  // 2. Compute Layout
  const layoutMap = computePortalNodeLayout(levelObjects);
  const visibleObjIdSet = new Set(levelObjects.map((o) => o.id));

  // 3. Build PortalObjectNodes
  const visibleNodes: PortalObjectNode[] = levelObjects.map((obj) => {
    const rawMeta = (obj.metadata || {}) as Record<string, unknown>;
    const technology = typeof rawMeta.technology === 'string' ? rawMeta.technology : undefined;
    const owner = typeof rawMeta.owner === 'string' ? rawMeta.owner : undefined;
    const status = typeof rawMeta.status === 'string' ? rawMeta.status : 'active';
    const sla = typeof rawMeta.sla === 'string' ? rawMeta.sla : undefined;

    // Count children contained inside this object
    const childCount = model.objects.filter((o) => o.parentId === obj.id).length;

    // Count inbound and outbound connections
    const inboundCount = model.connections.filter((c) => c.targetObjectId === obj.id).length;
    const outboundCount = model.connections.filter((c) => c.sourceObjectId === obj.id).length;

    const defaultPos = { x: 0, y: 0, width: 220, height: 120 };
    const pos = layoutMap.get(obj.id) || defaultPos;

    return {
      id: obj.id,
      name: obj.name,
      kind: obj.kind,
      description: obj.description || undefined,
      parentId: obj.parentId,
      technology,
      owner,
      status,
      sla,
      childCount,
      inboundCount,
      outboundCount,
      position: pos,
    };
  });

  // 4. Build Visible Connections
  // Direct connections between nodes visible at this level
  const visibleEdges: PortalConnectionEdge[] = [];
  for (const conn of model.connections) {
    if (visibleObjIdSet.has(conn.sourceObjectId) && visibleObjIdSet.has(conn.targetObjectId)) {
      const rawMeta = (conn.metadata || {}) as Record<string, unknown>;
      const protocol = typeof rawMeta.protocol === 'string' ? rawMeta.protocol : undefined;

      visibleEdges.push({
        id: conn.id,
        sourceId: conn.sourceObjectId,
        targetId: conn.targetObjectId,
        kind: conn.kind,
        label: conn.label || undefined,
        protocol,
      });
    }
  }

  // 5. Build Breadcrumbs
  const breadcrumbs: PortalBreadcrumb[] = [
    { level: 'context', name: 'System Context' },
  ];

  if (activeParent) {
    // If active parent has a parent itself, include intermediate breadcrumb
    if (activeParent.parentId) {
      const grandParent = model.objects.find((o) => o.id === activeParent.parentId);
      if (grandParent) {
        breadcrumbs.push({
          level: 'container',
          objectId: grandParent.id,
          name: grandParent.name,
        });
      }
    }

    breadcrumbs.push({
      level: currentLevel,
      objectId: activeParent.id,
      name: activeParent.name,
    });
  }

  return {
    currentLevel,
    activeParentId,
    breadcrumbs,
    visibleNodes,
    visibleEdges,
  };
}

/**
 * Initializes the Architecture Portal in its default Root Context view.
 */
export function initArchitecturePortal(
  model: ArchitectureModel,
  options?: { initialObjectId?: ObjectId; initialCamera?: Partial<PortalCameraState> },
): ArchitecturePortalState {
  let drillDown = buildPortalLevelProjection(model, null);
  let selectedObjectId: ObjectId | null = null;
  let inspector: PortalObjectInspector | null = null;
  let highlightedDependencies: PortalDependencyHighlight | null = null;

  if (options?.initialObjectId) {
    const targetObj = model.objects.find((o) => o.id === options.initialObjectId);
    if (targetObj) {
      // If target object has a parent, drill down to its containing level
      if (targetObj.parentId) {
        drillDown = buildPortalLevelProjection(model, targetObj.parentId);
      }
      selectedObjectId = targetObj.id;
      inspector = inspectPortalObject(model, targetObj.id);
      highlightedDependencies = getDependencyHighlighting(model, targetObj.id);
    }
  }

  const camera: PortalCameraState = {
    x: options?.initialCamera?.x ?? 0,
    y: options?.initialCamera?.y ?? 0,
    zoom: options?.initialCamera?.zoom ?? 1.0,
  };

  return {
    architectureId: model.architecture.id,
    architectureName: model.architecture.name,
    description: model.architecture.description || undefined,
    drillDown,
    selectedObjectId,
    selectedConnectionId: null,
    inspector,
    highlightedDependencies,
    activeViewId: null,
    activeFlow: null,
    camera,
    isReadOnly: true,
  };
}

/**
 * Drills down into an architecture object (e.g. system -> container, or container -> component).
 */
export function drillDownPortalToObject(
  state: ArchitecturePortalState,
  model: ArchitectureModel,
  targetObjectId: ObjectId,
): ArchitecturePortalState {
  const targetObj = model.objects.find((o) => o.id === targetObjectId);
  if (!targetObj) return state;

  // Project visible nodes inside targetObj
  const nextDrillDown = buildPortalLevelProjection(model, targetObjectId);

  // If there are no children, keep existing drill down but select the object
  if (nextDrillDown.visibleNodes.length === 0) {
    return {
      ...state,
      selectedObjectId: targetObjectId,
      inspector: inspectPortalObject(model, targetObjectId),
      highlightedDependencies: getDependencyHighlighting(model, targetObjectId),
    };
  }

  return {
    ...state,
    drillDown: nextDrillDown,
    selectedObjectId: null,
    selectedConnectionId: null,
    inspector: null,
    highlightedDependencies: null,
    camera: fitPortalCameraToNodes(nextDrillDown.visibleNodes),
  };
}

/**
 * Navigates up in the breadcrumb hierarchy (e.g. back to container or context).
 */
export function navigatePortalUp(
  state: ArchitecturePortalState,
  model: ArchitectureModel,
  targetBreadcrumbIndex = 0,
): ArchitecturePortalState {
  const targetBreadcrumb = state.drillDown.breadcrumbs[targetBreadcrumbIndex];
  const targetParentId = targetBreadcrumb?.objectId || null;

  const nextDrillDown = buildPortalLevelProjection(model, targetParentId);

  return {
    ...state,
    drillDown: nextDrillDown,
    selectedObjectId: targetParentId,
    selectedConnectionId: null,
    inspector: targetParentId ? inspectPortalObject(model, targetParentId) : null,
    highlightedDependencies: targetParentId ? getDependencyHighlighting(model, targetParentId) : null,
    camera: fitPortalCameraToNodes(nextDrillDown.visibleNodes),
  };
}

// ============================================================================
// Camera Navigation (Pan, Zoom, Fit-to-View)
// ============================================================================

/**
 * Zooms camera with min/max bounds.
 */
export function zoomPortalCamera(
  camera: PortalCameraState,
  delta: number,
  options?: { minZoom?: number; maxZoom?: number },
): PortalCameraState {
  const minZoom = options?.minZoom ?? 0.2;
  const maxZoom = options?.maxZoom ?? 3.0;

  const nextZoom = Math.min(maxZoom, Math.max(minZoom, Number((camera.zoom + delta).toFixed(2))));
  return {
    ...camera,
    zoom: nextZoom,
  };
}

/**
 * Pans camera by delta coordinates.
 */
export function panPortalCamera(
  camera: PortalCameraState,
  deltaX: number,
  deltaY: number,
): PortalCameraState {
  return {
    ...camera,
    x: camera.x + deltaX,
    y: camera.y + deltaY,
  };
}

/**
 * Computes bounding box and centers camera around visible nodes.
 */
export function fitPortalCameraToNodes(
  nodes: PortalObjectNode[],
  viewportWidth = 1000,
  viewportHeight = 600,
): PortalCameraState {
  if (nodes.length === 0) {
    return { x: 0, y: 0, zoom: 1.0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + n.position.width);
    maxY = Math.max(maxY, n.position.y + n.position.height);
  }

  const contentWidth = Math.max(100, maxX - minX);
  const contentHeight = Math.max(100, maxY - minY);

  const scaleX = (viewportWidth * 0.8) / contentWidth;
  const scaleY = (viewportHeight * 0.8) / contentHeight;
  const fitZoom = Math.min(1.2, Math.max(0.4, Math.min(scaleX, scaleY)));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const panX = viewportWidth / 2 - centerX * fitZoom;
  const panY = viewportHeight / 2 - centerY * fitZoom;

  return {
    x: Math.round(panX),
    y: Math.round(panY),
    zoom: Number(fitZoom.toFixed(2)),
  };
}

// ============================================================================
// Object Inspector & Dependency Highlighting
// ============================================================================

/**
 * Formats a ModelObject into a PortalObjectNode.
 */
function toPortalNode(obj: ModelObject, model: ArchitectureModel): PortalObjectNode {
  const rawMeta = (obj.metadata || {}) as Record<string, unknown>;
  const childCount = model.objects.filter((o) => o.parentId === obj.id).length;
  const inboundCount = model.connections.filter((c) => c.targetObjectId === obj.id).length;
  const outboundCount = model.connections.filter((c) => c.sourceObjectId === obj.id).length;

  return {
    id: obj.id,
    name: obj.name,
    kind: obj.kind,
    description: obj.description || undefined,
    parentId: obj.parentId,
    technology: typeof rawMeta.technology === 'string' ? rawMeta.technology : undefined,
    owner: typeof rawMeta.owner === 'string' ? rawMeta.owner : undefined,
    status: typeof rawMeta.status === 'string' ? rawMeta.status : 'active',
    sla: typeof rawMeta.sla === 'string' ? rawMeta.sla : undefined,
    childCount,
    inboundCount,
    outboundCount,
    position: obj.position ? { ...obj.position, width: 220, height: 120 } : { x: 0, y: 0, width: 220, height: 120 },
  };
}

/**
 * Gathers complete inspection details for an object in the portal.
 */
export function inspectPortalObject(
  model: ArchitectureModel,
  objectId: ObjectId,
  context?: DocGenerationContext,
): PortalObjectInspector | null {
  const obj = model.objects.find((o) => o.id === objectId);
  if (!obj) return null;

  const node = toPortalNode(obj, model);

  // Inbound Callers
  const inboundDependencies = model.connections
    .filter((c) => c.targetObjectId === objectId)
    .map((conn) => {
      const src = model.objects.find((o) => o.id === conn.sourceObjectId);
      const rawMeta = (conn.metadata || {}) as Record<string, unknown>;
      return {
        connectionId: conn.id,
        source: src ? toPortalNode(src, model) : node,
        label: conn.label || undefined,
        protocol: typeof rawMeta.protocol === 'string' ? rawMeta.protocol : undefined,
      };
    });

  // Outbound Dependencies
  const outboundDependencies = model.connections
    .filter((c) => c.sourceObjectId === objectId)
    .map((conn) => {
      const tgt = model.objects.find((o) => o.id === conn.targetObjectId);
      const rawMeta = (conn.metadata || {}) as Record<string, unknown>;
      return {
        connectionId: conn.id,
        target: tgt ? toPortalNode(tgt, model) : node,
        label: conn.label || undefined,
        protocol: typeof rawMeta.protocol === 'string' ? rawMeta.protocol : undefined,
      };
    });

  // Contained Children
  const children = model.objects
    .filter((o) => o.parentId === objectId)
    .map((c) => toPortalNode(c, model));

  // Parent (if any)
  let parent: PortalObjectNode | undefined = undefined;
  if (obj.parentId) {
    const p = model.objects.find((o) => o.id === obj.parentId);
    if (p) parent = toPortalNode(p, model);
  }

  // Associated Execution Flows
  const associatedFlows: Array<{ flowId: FlowId; name: string; type?: string }> = [];
  if (context?.flows) {
    for (const flow of context.flows) {
      const participants = (flow as unknown as { participants?: Array<{ objectId: ObjectId }> }).participants || [];
      if (participants.some((p) => p.objectId === objectId)) {
        associatedFlows.push({
          flowId: flow.id,
          name: flow.name,
          type: flow.type,
        });
      }
    }
  }

  // Associated Views
  const associatedViews: Array<{ viewId: ViewId; name: string; kind: ViewKind }> = [];
  if (context?.views) {
    for (const view of context.views) {
      const rawView = view as unknown as { nodes?: Array<{ objectId: ObjectId }> };
      const nodes = rawView.nodes || [];
      if (nodes.some((n) => n.objectId === objectId)) {
        associatedViews.push({
          viewId: view.id,
          name: view.name,
          kind: view.kind,
        });
      }
    }
  }

  // Associated ADRs
  const associatedAdrs: Array<{ adrId: string; number: number; title: string; status: string }> = [];
  if (context?.adrs) {
    for (const adr of context.adrs) {
      const attachments = adr.attachments || [];
      if (attachments.some((att) => att.targetType === 'object' && att.targetId === objectId)) {
        associatedAdrs.push({
          adrId: adr.id,
          number: adr.number,
          title: adr.title,
          status: adr.status,
        });
      }
    }
  }

  return {
    object: node,
    parent,
    inboundDependencies,
    outboundDependencies,
    children,
    associatedFlows,
    associatedViews,
    associatedAdrs,
    docSummary: obj.description || `Architecture component for ${obj.name}.`,
  };
}

/**
 * Computes highlighting IDs for upstream and downstream dependencies.
 */
export function getDependencyHighlighting(
  model: ArchitectureModel,
  objectId: ObjectId,
): PortalDependencyHighlight {
  const upstreamNodeIds: ObjectId[] = [];
  const downstreamNodeIds: ObjectId[] = [];
  const activeConnectionIds: ConnectionId[] = [];

  for (const conn of model.connections) {
    if (conn.targetObjectId === objectId) {
      upstreamNodeIds.push(conn.sourceObjectId);
      activeConnectionIds.push(conn.id);
    } else if (conn.sourceObjectId === objectId) {
      downstreamNodeIds.push(conn.targetObjectId);
      activeConnectionIds.push(conn.id);
    }
  }

  return {
    selectedObjectId: objectId,
    upstreamNodeIds,
    downstreamNodeIds,
    activeConnectionIds,
  };
}

// ============================================================================
// Execution Flow Playback Engine
// ============================================================================

/**
 * Initializes step-by-step playback state for an execution flow in the portal.
 */
export function initPortalFlowPlayback(
  flow: Flow,
  steps?: FlowStep[],
  connections?: ModelConnection[],
): PortalFlowPlaybackState {
  const allSteps = steps || [];
  const rawFlow = flow as unknown as { participants?: Array<{ objectId: ObjectId }> };
  const participantIds = (rawFlow.participants || []).map((p) => p.objectId);

  let activeStep: PortalFlowPlaybackState['activeStep'] = undefined;
  if (allSteps.length > 0) {
    const firstStep = allSteps[0];
    if (firstStep) {
      const conn = connections?.find((c) => c.id === firstStep.connectionId);
      activeStep = {
        stepIndex: firstStep.stepIndex,
        sourceId: conn ? conn.sourceObjectId : ('' as ObjectId),
        targetId: conn ? conn.targetObjectId : ('' as ObjectId),
        connectionId: firstStep.connectionId,
        note: firstStep.note || undefined,
        label: conn?.label || undefined,
      };
    }
  }

  return {
    flowId: flow.id,
    name: flow.name,
    flowName: flow.name,
    type: flow.type || 'sequence',
    description: flow.description || undefined,
    totalSteps: allSteps.length,
    currentStepIndex: 0,
    activeStep,
    participantIds,
  };
}

/**
 * Steps execution flow playback forward or backward.
 */
export function stepPortalFlowPlayback(
  playback: PortalFlowPlaybackState,
  targetStepIndex: number,
  steps: FlowStep[],
  connections?: ModelConnection[],
): PortalFlowPlaybackState {
  if (steps.length === 0) return playback;

  const clampedIndex = Math.max(0, Math.min(steps.length - 1, targetStepIndex));
  const step = steps[clampedIndex];

  let activeStep: PortalFlowPlaybackState['activeStep'] = undefined;
  if (step) {
    const conn = connections?.find((c) => c.id === step.connectionId);
    activeStep = {
      stepIndex: step.stepIndex,
      sourceId: conn ? conn.sourceObjectId : ('' as ObjectId),
      targetId: conn ? conn.targetObjectId : ('' as ObjectId),
      connectionId: step.connectionId,
      note: step.note || undefined,
      label: conn?.label || undefined,
    };
  }

  return {
    ...playback,
    currentStepIndex: clampedIndex,
    activeStep,
  };
}

// ============================================================================
// Global Search Engine
// ============================================================================

/**
 * Searches objects, views, flows, and ADRs across the architecture portal.
 */
export function searchArchitecturePortal(
  model: ArchitectureModel,
  query: string,
  context?: DocGenerationContext,
): PortalSearchResult[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];

  const terms = cleanQuery.split(/\s+/).filter(Boolean);
  const results: PortalSearchResult[] = [];

  // 1. Search Objects
  for (const obj of model.objects) {
    const nameLower = obj.name.toLowerCase();
    const descLower = (obj.description || '').toLowerCase();
    const rawMeta = (obj.metadata || {}) as Record<string, unknown>;
    const tech = typeof rawMeta.technology === 'string' ? rawMeta.technology.toLowerCase() : '';
    const owner = typeof rawMeta.owner === 'string' ? rawMeta.owner.toLowerCase() : '';

    let score = 0;
    for (const term of terms) {
      if (nameLower === term) score += 100;
      else if (nameLower.includes(term)) score += 50;

      if (tech.includes(term)) score += 30;
      if (owner.includes(term)) score += 20;
      if (descLower.includes(term)) score += 10;
    }

    if (score > 0) {
      const level: PortalHierarchyLevel = obj.parentId
        ? obj.kind === 'component'
          ? 'component'
          : 'container'
        : 'context';

      results.push({
        id: `search-obj-${obj.id}`,
        type: 'object',
        title: obj.name,
        subtitle: `${obj.kind.toUpperCase()}${tech ? ` • ${tech}` : ''}`,
        category: 'Architecture Object',
        targetObjectId: obj.id,
        targetParentId: obj.parentId,
        level,
        score,
      });
    }
  }

  // 2. Search Views
  if (context?.views) {
    for (const view of context.views) {
      const viewName = view.name.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (viewName === term) score += 90;
        else if (viewName.includes(term)) score += 40;
      }
      if (score > 0) {
        results.push({
          id: `search-view-${view.id}`,
          type: 'view',
          title: view.name,
          subtitle: `View • ${view.kind.toUpperCase()}`,
          category: 'Diagram View',
          targetViewId: view.id,
          score,
        });
      }
    }
  }

  // 3. Search Flows
  if (context?.flows) {
    for (const flow of context.flows) {
      const flowName = flow.name.toLowerCase();
      const flowDesc = (flow.description || '').toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (flowName === term) score += 90;
        else if (flowName.includes(term)) score += 40;
        if (flowDesc.includes(term)) score += 15;
      }
      if (score > 0) {
        results.push({
          id: `search-flow-${flow.id}`,
          type: 'flow',
          title: flow.name,
          subtitle: `Execution Flow • ${flow.type || 'sequence'}`,
          category: 'Execution Flow',
          targetFlowId: flow.id,
          score,
        });
      }
    }
  }

  // 4. Search ADRs
  if (context?.adrs) {
    for (const adr of context.adrs) {
      const adrTitle = adr.title.toLowerCase();
      const adrContext = adr.context.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (adrTitle.includes(term)) score += 40;
        if (adrContext.includes(term)) score += 15;
      }
      if (score > 0) {
        results.push({
          id: `search-adr-${adr.id}`,
          type: 'adr',
          title: `ADR-${adr.number}: ${adr.title}`,
          subtitle: `Decision • ${adr.status.toUpperCase()}`,
          category: 'Architecture Decision',
          score,
        });
      }
    }
  }

  // Sort descending by score
  return results.sort((a, b) => b.score - a.score);
}
