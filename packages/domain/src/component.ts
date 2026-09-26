import {
  createId,
  type ArchitectureId,
  type ObjectId,
  type VersionId,
} from './ids';
import type { ModelObject } from './types';
import type { CanvasNode } from './canvas';

export type ComponentKind =
  | 'component'
  | 'controller'
  | 'service'
  | 'repository'
  | 'middleware'
  | 'handler'
  | 'utility';

export interface ComponentMetadata {
  componentKind?: ComponentKind | string;
  technology?: string;
  interfaces?: string[];
  codeRef?: string;
  c4Level?: number;
  c4Kind?: string;
  [key: string]: unknown;
}

export interface ComponentNodeData {
  label: string;
  componentKind?: string;
  technology?: string;
  interfaces?: string[];
  codeRef?: string;
  description?: string;
  parentId?: string;
  componentId?: string;
  [key: string]: unknown;
}

export interface CreateComponentOptions {
  parentId?: ObjectId | string;
  componentKind?: ComponentKind | string;
  technology?: string;
  interfaces?: string[];
  codeRef?: string;
  description?: string;
  position?: { x: number; y: number };
}

/**
 * Checks whether a ModelObject represents a Component.
 */
export function isComponent(obj: ModelObject): boolean {
  return obj.kind === 'component' || obj.metadata?.c4Level === 3;
}

/**
 * Factory helper to create a ModelObject configured as a Component (F025).
 */
export function createComponent(
  architectureId: ArchitectureId,
  versionId: VersionId,
  name: string,
  options: CreateComponentOptions = {},
): ModelObject {
  const kind = options.componentKind ?? 'component';
  return {
    id: createId('cmp'),
    architectureId,
    versionId,
    parentId: (options.parentId as ObjectId) ?? null,
    kind: 'component',
    name,
    description: options.description ?? null,
    metadata: {
      componentKind: kind,
      technology: options.technology ?? '',
      interfaces: options.interfaces ?? [],
      codeRef: options.codeRef ?? '',
      c4Level: 3,
      c4Kind: 'component',
    },
    position: options.position ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export interface ProjectComponentOptions {
  x?: number;
  y?: number;
}

/**
 * Projects a Component model object into a React Flow canvas node.
 */
export function projectComponentToCanvas(
  component: ModelObject,
  options: ProjectComponentOptions = {},
): CanvasNode {
  const x = component.position?.x ?? options.x ?? 100;
  const y = component.position?.y ?? options.y ?? 100;

  const nodeData: ComponentNodeData = {
    label: component.name,
    componentKind: typeof component.metadata?.componentKind === 'string' ? component.metadata.componentKind : 'component',
    technology: typeof component.metadata?.technology === 'string' && component.metadata.technology.length > 0 ? component.metadata.technology : undefined,
    interfaces: Array.isArray(component.metadata?.interfaces) ? (component.metadata.interfaces as string[]) : undefined,
    codeRef: typeof component.metadata?.codeRef === 'string' && component.metadata.codeRef.length > 0 ? component.metadata.codeRef : undefined,
    description: component.description ?? undefined,
    parentId: component.parentId ?? undefined,
    componentId: component.id,
  };

  return {
    id: component.id,
    type: 'component',
    position: { x, y },
    data: nodeData,
    width: 220,
    height: 140,
  };
}
