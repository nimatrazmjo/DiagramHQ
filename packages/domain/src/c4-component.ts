import {
  createId,
  type ArchitectureId,
  type ObjectId,
  type VersionId,
} from './ids';
import type { ModelObject, ModelConnection } from './types';
import type { CanvasEdge, CanvasNode } from './canvas';
import { isComponent } from './component';
export { isComponent };

export type C4ComponentKind =
  | 'component'
  | 'controller'
  | 'service'
  | 'repository'
  | 'middleware'
  | 'handler';

export interface C4CodeMappingStub {
  repositoryUrl?: string;
  filePath?: string;
  symbol?: string;
  branch?: string;
  [key: string]: unknown;
}

export interface C4ComponentNodeData {
  label: string;
  componentKind: C4ComponentKind;
  technology?: string;
  description?: string;
  containerId: string;
  codeMappingStub?: C4CodeMappingStub;
  onInspectCodeStub?: (componentId: string) => void;
  [key: string]: unknown;
}

export interface C4ContainerBoundaryNodeData {
  label: string;
  containerId: string;
  technology?: string;
  description?: string;
  [key: string]: unknown;
}


/**
 * Checks whether a ModelObject is a component belonging to a specific container.
 */
export function isComponentOfContainer(obj: ModelObject, containerId: ObjectId): boolean {
  return isComponent(obj) && obj.parentId === containerId;
}

/**
 * Filters the list of model objects to those that are components under the specified container.
 */
export function getContainerComponents(
  containerId: ObjectId,
  objects: readonly ModelObject[],
): ModelObject[] {
  return objects.filter((obj) => isComponentOfContainer(obj, containerId));
}

/**
 * Resolves the C4 component kind classification from metadata.
 */
export function getC4ComponentKind(obj: ModelObject): C4ComponentKind {
  const metaKind = obj.metadata?.componentKind;
  if (
    metaKind === 'controller' ||
    metaKind === 'service' ||
    metaKind === 'repository' ||
    metaKind === 'middleware' ||
    metaKind === 'handler'
  ) {
    return metaKind;
  }
  return 'component';
}

export interface CreateC4ComponentOptions {
  componentKind?: C4ComponentKind;
  technology?: string;
  description?: string;
  codeMappingStub?: C4CodeMappingStub;
  position?: { x: number; y: number };
}

/**
 * Factory to create a ModelObject configured as a C4 Component inside a container.
 */
export function createC4Component(
  architectureId: ArchitectureId,
  versionId: VersionId,
  containerId: ObjectId,
  name: string,
  options: CreateC4ComponentOptions = {},
): ModelObject {
  const componentKind = options.componentKind ?? 'component';

  return {
    id: createId('cmp'),
    architectureId,
    versionId,
    parentId: containerId,
    kind: 'component',
    name,
    description: options.description ?? null,
    metadata: {
      c4Level: 3,
      componentKind,
      technology: options.technology ?? '',
      codeMappingStub: options.codeMappingStub ?? {
        filePath: `src/${name.toLowerCase().replace(/\s+/g, '-')}.ts`,
        symbol: name.replace(/\s+/g, ''),
      },
    },
    position: options.position ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Factory helper for a Controller component.
 */
export function createC4Controller(
  architectureId: ArchitectureId,
  versionId: VersionId,
  containerId: ObjectId,
  name: string,
  technology = 'TypeScript / NestJS Controller',
  description?: string,
): ModelObject {
  return createC4Component(architectureId, versionId, containerId, name, {
    componentKind: 'controller',
    technology,
    description,
  });
}

/**
 * Factory helper for a Business Logic / Service component.
 */
export function createC4DomainService(
  architectureId: ArchitectureId,
  versionId: VersionId,
  containerId: ObjectId,
  name: string,
  technology = 'TypeScript Service',
  description?: string,
): ModelObject {
  return createC4Component(architectureId, versionId, containerId, name, {
    componentKind: 'service',
    technology,
    description,
  });
}

/**
 * Factory helper for a Repository / Data Access component.
 */
export function createC4Repository(
  architectureId: ArchitectureId,
  versionId: VersionId,
  containerId: ObjectId,
  name: string,
  technology = 'Prisma / SQL Repository',
  description?: string,
): ModelObject {
  return createC4Component(architectureId, versionId, containerId, name, {
    componentKind: 'repository',
    technology,
    description,
  });
}

export interface ProjectC4ComponentOptions {
  showContainerBoundary?: boolean;
  startX?: number;
  startY?: number;
  gapX?: number;
  gapY?: number;
  columns?: number;
}

/**
 * Projects a container and its child components into React Flow canvas nodes and edges.
 */
export function projectC4ComponentToCanvas(
  container: ModelObject,
  components: readonly ModelObject[],
  connections: readonly ModelConnection[] = [],
  options: ProjectC4ComponentOptions = {},
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const showBoundary = options.showContainerBoundary ?? true;
  const startX = options.startX ?? 80;
  const startY = options.startY ?? 100;
  const gapX = options.gapX ?? 300;
  const gapY = options.gapY ?? 180;
  const columns = options.columns ?? 3;

  const nodeWidth = 240;
  const nodeHeight = 140;

  const nodes: CanvasNode[] = [];

  components.forEach((component, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = component.position?.x ?? startX + col * gapX;
    const y = component.position?.y ?? startY + row * gapY;

    const kind = getC4ComponentKind(component);
    const technology = typeof component.metadata?.technology === 'string'
      ? component.metadata.technology
      : undefined;

    const nodeData: C4ComponentNodeData = {
      label: component.name,
      componentKind: kind,
      technology,
      description: component.description ?? undefined,
      containerId: container.id,
      codeMappingStub: component.metadata?.codeMappingStub as C4CodeMappingStub | undefined,
    };

    nodes.push({
      id: component.id,
      type: 'c4Component',
      position: { x, y },
      data: nodeData,
      width: nodeWidth,
      height: nodeHeight,
    });
  });

  if (showBoundary && components.length > 0) {
    const minX = Math.min(...nodes.map((n) => n.position.x));
    const minY = Math.min(...nodes.map((n) => n.position.y));
    const maxX = Math.max(...nodes.map((n) => n.position.x + (n.width ?? nodeWidth)));
    const maxY = Math.max(...nodes.map((n) => n.position.y + (n.height ?? nodeHeight)));

    const padding = 50;
    const boundaryX = minX - padding;
    const boundaryY = minY - padding - 40;
    const boundaryWidth = maxX - minX + padding * 2;
    const boundaryHeight = maxY - minY + padding * 2 + 40;

    const boundaryNode: CanvasNode = {
      id: `boundary-${container.id}`,
      type: 'c4ContainerBoundary',
      position: { x: boundaryX, y: boundaryY },
      data: {
        label: container.name,
        containerId: container.id,
        technology: typeof container.metadata?.technology === 'string'
          ? container.metadata.technology
          : undefined,
        description: container.description ?? undefined,
      },
      width: boundaryWidth,
      height: boundaryHeight,
      zIndex: -1,
    };

    nodes.unshift(boundaryNode);
  }

  const componentIdSet = new Set(components.map((c) => c.id));
  const edges: CanvasEdge[] = connections
    .filter((c) => componentIdSet.has(c.sourceObjectId) && componentIdSet.has(c.targetObjectId))
    .map((c) => ({
      id: c.id,
      source: c.sourceObjectId,
      target: c.targetObjectId,
      label: c.label ?? undefined,
      animated: c.kind === 'async',
    }));

  return { nodes, edges };
}
