import {
  createId,
  type ArchitectureId,
  type VersionId,
} from './ids';
import type { ModelObject } from './types';
import type { CanvasNode } from './canvas';

export interface PersonMetadata {
  role?: string;
  department?: string;
  external?: boolean;
  email?: string;
  [key: string]: unknown;
}

export interface PersonNodeData {
  label: string;
  role?: string;
  department?: string;
  external?: boolean;
  email?: string;
  description?: string;
  [key: string]: unknown;
}

export interface CreatePersonOptions {
  role?: string;
  department?: string;
  external?: boolean;
  email?: string;
  description?: string;
  position?: { x: number; y: number };
}

/**
 * Checks whether a ModelObject represents a Person / Actor.
 */
export function isPerson(obj: ModelObject): boolean {
  return obj.kind === 'actor';
}

/**
 * Checks whether a Person is external to the organization (e.g. customer, third-party user).
 */
export function isExternalPerson(obj: ModelObject): boolean {
  return isPerson(obj) && Boolean(obj.metadata?.external);
}

/**
 * Factory helper to create a ModelObject configured as a Person (Actor).
 */
export function createPerson(
  architectureId: ArchitectureId,
  versionId: VersionId,
  name: string,
  options: CreatePersonOptions = {},
): ModelObject {
  return {
    id: createId('act'),
    architectureId,
    versionId,
    kind: 'actor',
    name,
    description: options.description ?? null,
    metadata: {
      role: options.role ?? '',
      department: options.department ?? '',
      external: Boolean(options.external),
      email: options.email ?? '',
    },
    position: options.position ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export interface ProjectPersonOptions {
  x?: number;
  y?: number;
}

/**
 * Projects a Person model object into a React Flow canvas node.
 */
export function projectPersonToCanvas(
  person: ModelObject,
  options: ProjectPersonOptions = {},
): CanvasNode {
  const x = person.position?.x ?? options.x ?? 100;
  const y = person.position?.y ?? options.y ?? 100;

  const nodeData: PersonNodeData = {
    label: person.name,
    role: typeof person.metadata?.role === 'string' ? person.metadata.role : undefined,
    department: typeof person.metadata?.department === 'string' ? person.metadata.department : undefined,
    external: Boolean(person.metadata?.external),
    email: typeof person.metadata?.email === 'string' ? person.metadata.email : undefined,
    description: person.description ?? undefined,
  };

  return {
    id: person.id,
    type: 'person',
    position: { x, y },
    data: nodeData,
    width: 240,
    height: 140,
  };
}
