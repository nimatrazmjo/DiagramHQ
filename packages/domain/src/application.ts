import {
  createId,
  type ArchitectureId,
  type ObjectId,
  type VersionId,
} from './ids';
import type { ModelObject } from './types';
import type { CanvasNode } from './canvas';

export type ApplicationType =
  | 'web'
  | 'mobile'
  | 'api'
  | 'service'
  | 'worker'
  | 'microservice'
  | 'serverless';

export interface ApplicationMetadata {
  applicationType?: ApplicationType | string;
  technology?: string;
  runtime?: string;
  status?: 'active' | 'deprecated' | 'planned' | string;
  port?: number;
  canDrillDown?: boolean;
  c4Level?: number;
  c4Kind?: string;
  [key: string]: unknown;
}

export interface ApplicationNodeData {
  label: string;
  applicationType?: string;
  technology?: string;
  runtime?: string;
  status?: string;
  port?: number;
  description?: string;
  canDrillDown?: boolean;
  parentId?: string;
  applicationId?: string;
  [key: string]: unknown;
}

export interface CreateApplicationOptions {
  parentId?: string;
  applicationType?: ApplicationType | string;
  technology?: string;
  runtime?: string;
  status?: 'active' | 'deprecated' | 'planned' | string;
  port?: number;
  description?: string;
  position?: { x: number; y: number };
  canDrillDown?: boolean;
}

/**
 * Checks whether a ModelObject represents an Application or Service.
 */
export function isApplication(obj: ModelObject): boolean {
  return obj.kind === 'application';
}

/**
 * Factory helper to create a ModelObject configured as an Application / Service (F024).
 */
export function createApplication(
  architectureId: ArchitectureId,
  versionId: VersionId,
  name: string,
  options: CreateApplicationOptions = {},
): ModelObject {
  const appType = options.applicationType ?? 'service';
  return {
    id: createId('app'),
    architectureId,
    versionId,
    parentId: (options.parentId as ObjectId) ?? null,
    kind: 'application',
    name,
    description: options.description ?? null,
    metadata: {
      applicationType: appType,
      technology: options.technology ?? '',
      runtime: options.runtime ?? '',
      status: options.status ?? 'active',
      port: options.port,
      canDrillDown: options.canDrillDown ?? true,
      c4Level: 2,
      c4Kind: 'container',
    },
    position: options.position ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export interface ProjectApplicationOptions {
  x?: number;
  y?: number;
  canDrillDown?: boolean;
}

/**
 * Projects an Application model object into a React Flow canvas node.
 */
export function projectApplicationToCanvas(
  app: ModelObject,
  options: ProjectApplicationOptions = {},
): CanvasNode {
  const x = app.position?.x ?? options.x ?? 100;
  const y = app.position?.y ?? options.y ?? 100;

  const nodeData: ApplicationNodeData = {
    label: app.name,
    applicationType: typeof app.metadata?.applicationType === 'string' ? app.metadata.applicationType : undefined,
    technology: typeof app.metadata?.technology === 'string' && app.metadata.technology.length > 0 ? app.metadata.technology : undefined,
    runtime: typeof app.metadata?.runtime === 'string' && app.metadata.runtime.length > 0 ? app.metadata.runtime : undefined,
    status: typeof app.metadata?.status === 'string' ? app.metadata.status : 'active',
    port: typeof app.metadata?.port === 'number' ? app.metadata.port : undefined,
    description: app.description ?? undefined,
    canDrillDown: options.canDrillDown ?? Boolean(app.metadata?.canDrillDown ?? true),
    parentId: app.parentId ?? undefined,
    applicationId: app.id,
  };

  return {
    id: app.id,
    type: 'application',
    position: { x, y },
    data: nodeData,
    width: 240,
    height: 150,
  };
}
