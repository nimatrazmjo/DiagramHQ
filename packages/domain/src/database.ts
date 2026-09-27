import {
  createId,
  type ArchitectureId,
  type ObjectId,
  type VersionId,
} from './ids';
import type { ModelObject } from './types';
import type { CanvasNode } from './canvas';

export type DatabaseKind =
  | 'postgresql'
  | 'mysql'
  | 'mongodb'
  | 'redis'
  | 'elasticsearch'
  | 'dynamodb'
  | 'sqlite'
  | 'cassandra'
  | 'store';

export interface DatabaseMetadata {
  databaseKind?: DatabaseKind | string;
  technology?: string;
  schema?: string;
  version?: string;
  host?: string;
  replication?: string;
  [key: string]: unknown;
}

export interface DatabaseNodeData {
  label: string;
  databaseKind?: string;
  technology?: string;
  schema?: string;
  version?: string;
  description?: string;
  parentId?: string;
  databaseId?: string;
  [key: string]: unknown;
}

export interface CreateDatabaseOptions {
  parentId?: ObjectId | string;
  databaseKind?: DatabaseKind | string;
  technology?: string;
  schema?: string;
  version?: string;
  description?: string;
  position?: { x: number; y: number };
}

export function isDatabase(obj: ModelObject): boolean {
  return obj.kind === 'store' && obj.metadata?.storeKind !== 'queue';
}

export function createDatabase(
  architectureId: ArchitectureId,
  versionId: VersionId,
  name: string,
  options: CreateDatabaseOptions = {},
): ModelObject {
  const kind = options.databaseKind ?? 'store';
  return {
    id: createId('sto'),
    architectureId,
    versionId,
    parentId: (options.parentId as ObjectId) ?? null,
    kind: 'store',
    name,
    description: options.description ?? null,
    metadata: {
      databaseKind: kind,
      technology: options.technology ?? '',
      schema: options.schema ?? '',
      version: options.version ?? '',
      c4Level: 2,
      c4Kind: 'database',
    },
    position: options.position ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export interface ProjectDatabaseOptions {
  x?: number;
  y?: number;
}

export function projectDatabaseToCanvas(
  database: ModelObject,
  options: ProjectDatabaseOptions = {},
): CanvasNode {
  const x = database.position?.x ?? options.x ?? 100;
  const y = database.position?.y ?? options.y ?? 100;

  const nodeData: DatabaseNodeData = {
    label: database.name,
    databaseKind: typeof database.metadata?.databaseKind === 'string' ? database.metadata.databaseKind : 'store',
    technology: typeof database.metadata?.technology === 'string' && database.metadata.technology.length > 0 ? database.metadata.technology : undefined,
    schema: typeof database.metadata?.schema === 'string' && database.metadata.schema.length > 0 ? database.metadata.schema : undefined,
    version: typeof database.metadata?.version === 'string' && database.metadata.version.length > 0 ? database.metadata.version : undefined,
    description: database.description ?? undefined,
    parentId: database.parentId ?? undefined,
    databaseId: database.id,
  };

  return {
    id: database.id,
    type: 'database',
    position: { x, y },
    data: nodeData,
    width: 220,
    height: 130,
  };
}
