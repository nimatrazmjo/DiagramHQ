import { createId, type ArchitectureId, type VersionId } from './ids';
import type { CanvasEdge, CanvasNode, ProjectViewModelViewObject } from './canvas';
import type { ModelConnection, ModelObject } from './types';
import { isPerson } from './person';
export { isPerson };

export type C4ContextElementKind = 'person' | 'system' | 'external_system';

export interface C4ContextNodeData {
  label: string;
  c4Kind: C4ContextElementKind;
  description?: string;
  external?: boolean;
  technology?: string;
  systemId?: string;
  canDrillDown?: boolean;
  [key: string]: unknown;
}

/**
 * Returns true if the ModelObject represents an External Software System in C4 Context.
 */
export function isExternalSystem(obj: ModelObject): boolean {
  return obj.kind === 'system' && Boolean(obj.metadata?.external);
}

/**
 * Returns true if the ModelObject represents an Internal Software System in C4 Context.
 */
export function isInternalSystem(obj: ModelObject): boolean {
  return obj.kind === 'system' && !obj.metadata?.external;
}

/**
 * Resolves the C4 Context element classification for a ModelObject.
 */
export function getC4ContextKind(obj: ModelObject): C4ContextElementKind {
  if (isPerson(obj)) return 'person';
  if (isExternalSystem(obj)) return 'external_system';
  return 'system';
}

/**
 * Returns true if the ModelObject supports drilling down into Level 2 (Containers).
 * In C4, only internal Software Systems contain containers that can be drilled into.
 */
export function canDrillToContainers(obj: ModelObject): boolean {
  return isInternalSystem(obj);
}

/**
 * Creates a ModelObject configured as a C4 Person (Actor).
 */
export function createC4Person(
  architectureId: ArchitectureId,
  versionId: VersionId,
  name: string,
  description?: string,
  metadata?: Record<string, unknown>,
): ModelObject {
  return {
    id: createId('act'),
    architectureId,
    versionId,
    kind: 'actor',
    name,
    description: description ?? null,
    metadata: {
      ...metadata,
      c4Level: 1,
      c4Kind: 'person',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Creates a ModelObject configured as an internal C4 Software System.
 */
export function createC4System(
  architectureId: ArchitectureId,
  versionId: VersionId,
  name: string,
  description?: string,
  metadata?: Record<string, unknown>,
): ModelObject {
  return {
    id: createId('sys'),
    architectureId,
    versionId,
    kind: 'system',
    name,
    description: description ?? null,
    metadata: {
      ...metadata,
      external: false,
      c4Level: 1,
      c4Kind: 'system',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Creates a ModelObject configured as an external C4 Software System.
 */
export function createC4ExternalSystem(
  architectureId: ArchitectureId,
  versionId: VersionId,
  name: string,
  description?: string,
  metadata?: Record<string, unknown>,
): ModelObject {
  return {
    id: createId('sys'),
    architectureId,
    versionId,
    kind: 'system',
    name,
    description: description ?? null,
    metadata: {
      ...metadata,
      external: true,
      c4Level: 1,
      c4Kind: 'external_system',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Projects C4 Context model entities into CanvasNodes and CanvasEdges
 * with C4 Context visual attributes and drill-down capability flags.
 */
export function projectC4ContextToCanvas(
  objects: ModelObject[],
  connections: ModelConnection[],
  viewObjects: ProjectViewModelViewObject[] = [],
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const viewObjectMap = new Map<string, ProjectViewModelViewObject>();
  for (const vo of viewObjects) {
    viewObjectMap.set(vo.objectId, vo);
  }

  // Filter objects relevant to C4 Context (Level 1: actors & systems)
  const contextObjects = objects.filter(
    (obj) => obj.kind === 'actor' || obj.kind === 'system',
  );
  const contextObjectIds = new Set(contextObjects.map((o) => o.id as string));

  const nodes: CanvasNode[] = contextObjects.map((obj, index) => {
    const vo = viewObjectMap.get(obj.id);
    const fallbackPosition = {
      x: 100 + (index % 3) * 320,
      y: 100 + Math.floor(index / 3) * 220,
    };
    const position = vo?.position ?? (vo?.x != null && vo?.y != null ? { x: vo.x, y: vo.y } : fallbackPosition);

    const c4Kind = getC4ContextKind(obj);
    const canDrill = canDrillToContainers(obj);

    const data: C4ContextNodeData = {
      label: obj.name,
      c4Kind,
      description: obj.description ?? undefined,
      external: c4Kind === 'external_system',
      canDrillDown: canDrill,
      systemId: canDrill ? obj.id : undefined,
      ...(obj.metadata ?? {}),
    };

    return {
      id: obj.id,
      type: 'c4Context',
      position,
      data,
      width: vo?.width ?? (c4Kind === 'person' ? 200 : 260),
      height: vo?.height ?? (c4Kind === 'person' ? 140 : 160),
    };
  });

  // Filter connections between context objects
  const contextConnections = connections.filter(
    (conn) =>
      contextObjectIds.has(conn.sourceObjectId) &&
      contextObjectIds.has(conn.targetObjectId),
  );

  const edges: CanvasEdge[] = contextConnections.map((conn) => ({
    id: conn.id,
    source: conn.sourceObjectId,
    target: conn.targetObjectId,
    type: 'smoothstep',
    label: conn.label ?? conn.description ?? undefined,
    data: conn.metadata,
  }));

  return { nodes, edges };
}
