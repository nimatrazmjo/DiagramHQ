import {
  createId,
  type ArchitectureId,
  type VersionId,
} from './ids';
import type { ModelObject } from './types';
import type { CanvasNode } from './canvas';

export interface SystemMetadata {
  external?: boolean;
  systemType?: string;
  domain?: string;
  critical?: boolean;
  c4Level?: number;
  c4Kind?: string;
  [key: string]: unknown;
}

export interface SystemNodeData {
  label: string;
  external?: boolean;
  systemType?: string;
  domain?: string;
  critical?: boolean;
  description?: string;
  canDrillDown?: boolean;
  systemId?: string;
  [key: string]: unknown;
}

export interface CreateSystemOptions {
  external?: boolean;
  systemType?: string;
  domain?: string;
  critical?: boolean;
  description?: string;
  position?: { x: number; y: number };
}

/**
 * Checks whether a ModelObject represents a Software System.
 */
export function isSystem(obj: ModelObject): boolean {
  return obj.kind === 'system';
}

/**
 * Checks whether a System is external to the organization (e.g. third-party SaaS, external API, legacy bank core).
 */
export function isExternalSystem(obj: ModelObject): boolean {
  return isSystem(obj) && Boolean(obj.metadata?.external);
}

/**
 * Checks whether a System is internal to the organization and owns containers.
 */
export function isInternalSystem(obj: ModelObject): boolean {
  return isSystem(obj) && !obj.metadata?.external;
}

/**
 * Factory helper to create a ModelObject configured as a Software System (F023).
 */
export function createSystem(
  architectureId: ArchitectureId,
  versionId: VersionId,
  name: string,
  options: CreateSystemOptions = {},
): ModelObject {
  const isExt = Boolean(options.external);
  return {
    id: createId('sys'),
    architectureId,
    versionId,
    kind: 'system',
    name,
    description: options.description ?? null,
    metadata: {
      external: isExt,
      systemType: options.systemType ?? (isExt ? 'External SaaS' : 'Internal System'),
      domain: options.domain ?? '',
      critical: Boolean(options.critical),
      c4Level: 1,
      c4Kind: isExt ? 'external_system' : 'system',
    },
    position: options.position ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export interface ProjectSystemOptions {
  x?: number;
  y?: number;
}

/**
 * Projects a System model object into a React Flow canvas node.
 */
export function projectSystemToCanvas(
  system: ModelObject,
  options: ProjectSystemOptions = {},
): CanvasNode {
  const x = system.position?.x ?? options.x ?? 100;
  const y = system.position?.y ?? options.y ?? 100;
  const isExt = isExternalSystem(system);

  const nodeData: SystemNodeData = {
    label: system.name,
    external: isExt,
    systemType: typeof system.metadata?.systemType === 'string' ? system.metadata.systemType : undefined,
    domain: typeof system.metadata?.domain === 'string' ? system.metadata.domain : undefined,
    critical: Boolean(system.metadata?.critical),
    description: system.description ?? undefined,
    canDrillDown: !isExt,
    systemId: system.id,
  };

  return {
    id: system.id,
    type: 'system',
    position: { x, y },
    data: nodeData,
    width: 260,
    height: 160,
  };
}
