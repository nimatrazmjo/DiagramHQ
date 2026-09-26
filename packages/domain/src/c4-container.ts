import {
  createId,
  type ArchitectureId,
  type ModelObject,
  type ObjectId,
  type VersionId,
} from './';
import type { CanvasEdge, CanvasNode } from './canvas';
import type { ModelConnection } from './types';

export type C4ContainerKind =
  | 'web_app'
  | 'mobile_app'
  | 'api'
  | 'service'
  | 'database'
  | 'queue'
  | 'store';

export interface C4ContainerNodeData {
  label: string;
  containerKind: C4ContainerKind;
  technology?: string;
  description?: string;
  systemId: string;
  canDrillToComponents?: boolean;
  onDrillToComponents?: (containerId: string) => void;
  [key: string]: unknown;
}

export interface C4SystemBoundaryNodeData {
  label: string;
  systemId: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Checks whether a ModelObject is a C4 Container (Level 2).
 * In C4, containers are applications (web, mobile, API, service) or stores (databases, queues).
 */
export function isContainer(obj: ModelObject): boolean {
  if (obj.metadata?.c4Level === 2) return true;
  return obj.kind === 'application' || obj.kind === 'store';
}

/**
 * Checks whether a ModelObject is a container belonging to a specific parent software system.
 */
export function isContainerOfSystem(obj: ModelObject, systemId: ObjectId): boolean {
  return isContainer(obj) && obj.parentId === systemId;
}

/**
 * Filters the list of model objects to those that are containers under the specified system.
 */
export function getSystemContainers(systemId: ObjectId, objects: readonly ModelObject[]): ModelObject[] {
  return objects.filter((obj) => isContainerOfSystem(obj, systemId));
}

/**
 * Returns the C4 container kind classification from object metadata or kind.
 */
export function getC4ContainerKind(obj: ModelObject): C4ContainerKind {
  const metaKind = obj.metadata?.containerKind;
  if (
    metaKind === 'web_app' ||
    metaKind === 'mobile_app' ||
    metaKind === 'api' ||
    metaKind === 'service' ||
    metaKind === 'database' ||
    metaKind === 'queue' ||
    metaKind === 'store'
  ) {
    return metaKind;
  }
  return obj.kind === 'store' ? 'database' : 'service';
}

/**
 * Returns true if the container supports drilling down into Level 3 (Components).
 * In C4, software applications and backend services contain drillable components.
 */
export function canDrillToComponents(obj: ModelObject): boolean {
  if (!isContainer(obj)) return false;
  const kind = getC4ContainerKind(obj);
  return kind === 'web_app' || kind === 'mobile_app' || kind === 'api' || kind === 'service' || obj.kind === 'application';
}

export interface CreateContainerOptions {
  containerKind?: C4ContainerKind;
  technology?: string;
  description?: string;
  position?: { x: number; y: number };
}

/**
 * Generic factory to create a ModelObject configured as a C4 Container inside a parent system.
 */
export function createC4Container(
  architectureId: ArchitectureId,
  versionId: VersionId,
  systemId: ObjectId,
  name: string,
  options: CreateContainerOptions = {},
): ModelObject {
  const containerKind = options.containerKind ?? 'service';
  const isStore = containerKind === 'database' || containerKind === 'queue' || containerKind === 'store';
  const prefix = isStore ? 'sto' : 'app';

  return {
    id: createId(prefix),
    architectureId,
    versionId,
    parentId: systemId,
    kind: isStore ? 'store' : 'application',
    name,
    description: options.description ?? null,
    metadata: {
      c4Level: 2,
      containerKind,
      technology: options.technology ?? '',
    },
    position: options.position ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Creates a C4 Web Application container (SPA / Browser app).
 */
export function createC4WebApp(
  architectureId: ArchitectureId,
  versionId: VersionId,
  systemId: ObjectId,
  name: string,
  technology = 'React',
  description?: string,
): ModelObject {
  return createC4Container(architectureId, versionId, systemId, name, {
    containerKind: 'web_app',
    technology,
    description,
  });
}

/**
 * Creates a C4 Mobile Application container (iOS / Android app).
 */
export function createC4MobileApp(
  architectureId: ArchitectureId,
  versionId: VersionId,
  systemId: ObjectId,
  name: string,
  technology = 'React Native',
  description?: string,
): ModelObject {
  return createC4Container(architectureId, versionId, systemId, name, {
    containerKind: 'mobile_app',
    technology,
    description,
  });
}

/**
 * Creates a C4 Backend Service or API container.
 */
export function createC4Service(
  architectureId: ArchitectureId,
  versionId: VersionId,
  systemId: ObjectId,
  name: string,
  technology = 'Node.js / TypeScript',
  description?: string,
): ModelObject {
  return createC4Container(architectureId, versionId, systemId, name, {
    containerKind: 'api',
    technology,
    description,
  });
}

/**
 * Creates a C4 Database container (relational, document, or key-value).
 */
export function createC4Database(
  architectureId: ArchitectureId,
  versionId: VersionId,
  systemId: ObjectId,
  name: string,
  technology = 'PostgreSQL',
  description?: string,
): ModelObject {
  return createC4Container(architectureId, versionId, systemId, name, {
    containerKind: 'database',
    technology,
    description,
  });
}

/**
 * Creates a C4 Message Queue container (message broker, event stream).
 */
export function createC4Queue(
  architectureId: ArchitectureId,
  versionId: VersionId,
  systemId: ObjectId,
  name: string,
  technology = 'RabbitMQ',
  description?: string,
): ModelObject {
  return createC4Container(architectureId, versionId, systemId, name, {
    containerKind: 'queue',
    technology,
    description,
  });
}

export interface ProjectC4ContainerOptions {
  showSystemBoundary?: boolean;
  startX?: number;
  startY?: number;
  gapX?: number;
  gapY?: number;
  columns?: number;
}

/**
 * Projects a system and its child containers into React Flow canvas nodes and edges.
 */
export function projectC4ContainerToCanvas(
  system: ModelObject,
  containers: readonly ModelObject[],
  connections: readonly ModelConnection[] = [],
  options: ProjectC4ContainerOptions = {},
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const showBoundary = options.showSystemBoundary ?? true;
  const startX = options.startX ?? 80;
  const startY = options.startY ?? 100;
  const gapX = options.gapX ?? 320;
  const gapY = options.gapY ?? 200;
  const columns = options.columns ?? 2;

  const nodeWidth = 260;
  const nodeHeight = 150;

  const nodes: CanvasNode[] = [];

  containers.forEach((container, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = container.position?.x ?? startX + col * gapX;
    const y = container.position?.y ?? startY + row * gapY;

    const kind = getC4ContainerKind(container);
    const technology = typeof container.metadata?.technology === 'string'
      ? container.metadata.technology
      : undefined;

    const nodeData: C4ContainerNodeData = {
      label: container.name,
      containerKind: kind,
      technology,
      description: container.description ?? undefined,
      systemId: system.id,
      canDrillToComponents: canDrillToComponents(container),
    };

    nodes.push({
      id: container.id,
      type: 'c4Container',
      position: { x, y },
      data: nodeData,
      width: nodeWidth,
      height: nodeHeight,
    });
  });

  // If system boundary is requested, calculate bounding box and prepend the boundary node
  if (showBoundary && containers.length > 0) {
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
      id: `boundary-${system.id}`,
      type: 'c4SystemBoundary',
      position: { x: boundaryX, y: boundaryY },
      data: {
        label: system.name,
        systemId: system.id,
        description: system.description ?? undefined,
      },
      width: boundaryWidth,
      height: boundaryHeight,
      zIndex: -1,
    };

    nodes.unshift(boundaryNode);
  }

  // Filter and map connections
  const containerIdSet = new Set(containers.map((c) => c.id));
  const edges: CanvasEdge[] = connections
    .filter((c) => containerIdSet.has(c.sourceObjectId) && containerIdSet.has(c.targetObjectId))
    .map((c) => ({
      id: c.id,
      source: c.sourceObjectId,
      target: c.targetObjectId,
      label: c.label ?? undefined,
      animated: c.kind === 'async',
    }));

  return { nodes, edges };
}
