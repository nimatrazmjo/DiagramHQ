import {
  createId,
  type ArchitectureId,
  type ObjectId,
  type VersionId,
} from './ids';
import type { ModelObject } from './types';
import type { CanvasNode } from './canvas';

export type GroupKind =
  | 'group'
  | 'boundary'
  | 'zone'
  | 'team'
  | 'domain'
  | 'namespace';

export interface GroupMetadata {
  groupKind?: GroupKind | string;
  color?: string;
  collapsed?: boolean;
  [key: string]: unknown;
}

export interface GroupNodeData {
  label: string;
  groupKind?: string;
  color?: string;
  collapsed?: boolean;
  childCount?: number;
  description?: string;
  parentId?: string;
  groupId?: string;
  [key: string]: unknown;
}

export interface CreateGroupOptions {
  parentId?: ObjectId | string;
  groupKind?: GroupKind | string;
  color?: string;
  collapsed?: boolean;
  description?: string;
  position?: { x: number; y: number };
}

export function isGroup(obj: ModelObject): boolean {
  return obj.kind === 'group';
}

export function createGroup(
  architectureId: ArchitectureId,
  versionId: VersionId,
  name: string,
  options: CreateGroupOptions = {},
): ModelObject {
  const kind = options.groupKind ?? 'group';
  return {
    id: createId('grp'),
    architectureId,
    versionId,
    parentId: (options.parentId as ObjectId) ?? null,
    kind: 'group',
    name,
    description: options.description ?? null,
    metadata: {
      groupKind: kind,
      color: options.color ?? '',
      collapsed: options.collapsed ?? false,
    },
    position: options.position ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export interface ProjectGroupOptions {
  x?: number;
  y?: number;
  childCount?: number;
}

export function projectGroupToCanvas(
  group: ModelObject,
  options: ProjectGroupOptions = {},
): CanvasNode {
  const x = group.position?.x ?? options.x ?? 100;
  const y = group.position?.y ?? options.y ?? 100;

  const nodeData: GroupNodeData = {
    label: group.name,
    groupKind: typeof group.metadata?.groupKind === 'string' ? group.metadata.groupKind : 'group',
    color: typeof group.metadata?.color === 'string' && group.metadata.color.length > 0 ? group.metadata.color : undefined,
    collapsed: typeof group.metadata?.collapsed === 'boolean' ? group.metadata.collapsed : false,
    childCount: options.childCount,
    description: group.description ?? undefined,
    parentId: group.parentId ?? undefined,
    groupId: group.id,
  };

  return {
    id: group.id,
    type: 'group',
    position: { x, y },
    data: nodeData,
    width: 300,
    height: 200,
  };
}
