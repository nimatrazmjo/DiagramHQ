/**
 * DiagramHQ - Architecture Branches Domain Logic (F057)
 *
 * Pure, framework-agnostic branching engine for architecture models.
 * Allows branching off main (or parent branches), carrying all architecture
 * dimensions: objects, connections, views, flows, metadata, ADRs, and comments.
 * Guarantees deep state isolation so changes on a branch do not mutate main.
 */

import { createId, type BranchId, type WorkspaceId, type ArchitectureId, type ObjectId } from './ids';
import type { ModelObject, ModelConnection, View, FlowWithSteps } from './types';
import type { Comment } from './comments';

export interface BranchAdr {
  id: string;
  title: string;
  status: 'draft' | 'proposed' | 'accepted' | 'rejected' | 'superseded';
  context: string;
  decision: string;
  consequences?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BranchState {
  objects: ModelObject[];
  connections: ModelConnection[];
  views: View[];
  flows: FlowWithSteps[];
  metadata: Record<string, unknown>;
  adrs: BranchAdr[];
  comments: Comment[];
}

export interface ArchitectureBranch {
  id: BranchId;
  name: string;
  description?: string;
  workspaceId: WorkspaceId;
  architectureId: ArchitectureId;
  parentBranchId: BranchId | null;
  status: 'active' | 'merged' | 'archived';
  createdAt: string;
  updatedAt: string;
  state: BranchState;
}

/**
 * Deep-clones the branch state to guarantee reference and structural isolation.
 */
export function cloneBranchState(state: BranchState): BranchState {
  return JSON.parse(JSON.stringify(state)) as BranchState;
}

/**
 * Creates the initial main branch for a workspace architecture.
 */
export function createMainBranch(
  workspaceId: WorkspaceId,
  architectureId: ArchitectureId,
  initialState?: Partial<BranchState>
): ArchitectureBranch {
  const defaultState: BranchState = {
    objects: [],
    connections: [],
    views: [],
    flows: [],
    metadata: {},
    adrs: [],
    comments: [],
  };

  const mergedState: BranchState = {
    objects: initialState?.objects ? cloneBranchState({ ...defaultState, objects: initialState.objects }).objects : [],
    connections: initialState?.connections ? cloneBranchState({ ...defaultState, connections: initialState.connections }).connections : [],
    views: initialState?.views ? cloneBranchState({ ...defaultState, views: initialState.views }).views : [],
    flows: initialState?.flows ? cloneBranchState({ ...defaultState, flows: initialState.flows }).flows : [],
    metadata: initialState?.metadata ? cloneBranchState({ ...defaultState, metadata: initialState.metadata }).metadata : {},
    adrs: initialState?.adrs ? cloneBranchState({ ...defaultState, adrs: initialState.adrs }).adrs : [],
    comments: initialState?.comments ? cloneBranchState({ ...defaultState, comments: initialState.comments }).comments : [],
  };

  const now = new Date().toISOString();
  return {
    id: createId('brn') as BranchId,
    name: 'main',
    description: 'Default main branch',
    workspaceId,
    architectureId,
    parentBranchId: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    state: mergedState,
  };
}

/**
 * Forks a branch off a parent branch (e.g. main).
 * Deeply clones all carried entities (objects, connections, views, flows, metadata, ADRs, comments)
 * ensuring total independence between source and new branch.
 */
export function forkBranch(
  sourceBranch: ArchitectureBranch,
  newBranchName: string,
  options?: { description?: string }
): ArchitectureBranch {
  if (!newBranchName || newBranchName.trim().length === 0) {
    throw new Error('Branch name cannot be empty');
  }

  const trimmedName = newBranchName.trim();
  if (trimmedName === sourceBranch.name) {
    throw new Error(`Cannot fork branch with identical name '${trimmedName}'`);
  }

  const now = new Date().toISOString();
  return {
    id: createId('brn') as BranchId,
    name: trimmedName,
    description: options?.description,
    workspaceId: sourceBranch.workspaceId,
    architectureId: sourceBranch.architectureId,
    parentBranchId: sourceBranch.id,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    state: cloneBranchState(sourceBranch.state),
  };
}

/**
 * Adds an object to a branch without affecting any other branch.
 */
export function addObjectToBranch(
  branch: ArchitectureBranch,
  object: ModelObject
): ArchitectureBranch {
  const updatedState = cloneBranchState(branch.state);
  const exists = updatedState.objects.some((o) => o.id === object.id);
  if (exists) {
    throw new Error(`Object with id '${object.id}' already exists in branch '${branch.name}'`);
  }
  updatedState.objects.push(object);

  return {
    ...branch,
    updatedAt: new Date().toISOString(),
    state: updatedState,
  };
}

/**
 * Removes an object and its incident connections from a branch.
 */
export function removeObjectFromBranch(
  branch: ArchitectureBranch,
  objectId: ObjectId
): ArchitectureBranch {
  const updatedState = cloneBranchState(branch.state);
  updatedState.objects = updatedState.objects.filter((o) => o.id !== objectId);
  updatedState.connections = updatedState.connections.filter(
    (c) => c.sourceObjectId !== objectId && c.targetObjectId !== objectId
  );

  return {
    ...branch,
    updatedAt: new Date().toISOString(),
    state: updatedState,
  };
}

/**
 * Adds a connection to a branch.
 */
export function addConnectionToBranch(
  branch: ArchitectureBranch,
  connection: ModelConnection
): ArchitectureBranch {
  const updatedState = cloneBranchState(branch.state);
  const exists = updatedState.connections.some((c) => c.id === connection.id);
  if (exists) {
    throw new Error(`Connection with id '${connection.id}' already exists in branch '${branch.name}'`);
  }
  updatedState.connections.push(connection);

  return {
    ...branch,
    updatedAt: new Date().toISOString(),
    state: updatedState,
  };
}

/**
 * Adds an ADR to a branch.
 */
export function addAdrToBranch(
  branch: ArchitectureBranch,
  adr: BranchAdr
): ArchitectureBranch {
  const updatedState = cloneBranchState(branch.state);
  const exists = updatedState.adrs.some((a) => a.id === adr.id);
  if (exists) {
    throw new Error(`ADR with id '${adr.id}' already exists in branch '${branch.name}'`);
  }
  updatedState.adrs.push(adr);

  return {
    ...branch,
    updatedAt: new Date().toISOString(),
    state: updatedState,
  };
}

/**
 * Adds a comment to a branch.
 */
export function addCommentToBranch(
  branch: ArchitectureBranch,
  comment: Comment
): ArchitectureBranch {
  const updatedState = cloneBranchState(branch.state);
  updatedState.comments.push(comment);

  return {
    ...branch,
    updatedAt: new Date().toISOString(),
    state: updatedState,
  };
}

/**
 * Updates metadata on a branch.
 */
export function updateBranchMetadata(
  branch: ArchitectureBranch,
  metadataUpdate: Record<string, unknown>
): ArchitectureBranch {
  const updatedState = cloneBranchState(branch.state);
  updatedState.metadata = {
    ...updatedState.metadata,
    ...metadataUpdate,
  };

  return {
    ...branch,
    updatedAt: new Date().toISOString(),
    state: updatedState,
  };
}
