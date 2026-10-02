/**
 * DiagramHQ - Architecture Scenarios Domain Logic (F118)
 *
 * Pure, framework-agnostic what-if scenario exploration engine.
 * Allows architects to create hypothetical "what-if" architectural models
 * (e.g., cloud provider migration, microservice splitting, database sharding)
 * and compare them against the current base architecture without mutating
 * or committing to the real model / main branch.
 */

import {
  createId,
  type ScenarioId,
  type BranchId,
  type WorkspaceId,
  type ArchitectureId,
  type ObjectId,
  type ConnectionId,
} from './ids';
import type { ModelObject, ModelConnection } from './types';
import {
  type BranchState,
  type ArchitectureBranch,
  cloneBranchState,
  forkBranch,
} from './branches';

export type ScenarioStatus = 'draft' | 'active' | 'archived' | 'promoted';

export interface ScenarioSimulatedMetrics {
  costDeltaPercent?: number;
  latencyDeltaMs?: number;
  riskScore?: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
}

export interface ArchitectureScenario {
  id: ScenarioId;
  name: string;
  hypothesis: string;
  description?: string;
  workspaceId: WorkspaceId;
  architectureId: ArchitectureId;
  baseBranchId: BranchId;
  status: ScenarioStatus;
  hypotheticalState: BranchState;
  simulatedMetrics?: ScenarioSimulatedMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScenarioInput {
  name: string;
  hypothesis: string;
  description?: string;
  baseBranch: ArchitectureBranch;
  simulatedMetrics?: ScenarioSimulatedMetrics;
}

export type ScenarioChangeKind =
  | 'add_object'
  | 'modify_object'
  | 'remove_object'
  | 'add_connection'
  | 'remove_connection';

export interface ScenarioHypotheticalChange {
  kind: ScenarioChangeKind;
  object?: ModelObject;
  objectId?: ObjectId;
  connection?: ModelConnection;
  connectionId?: ConnectionId;
}

export interface ScenarioComparison {
  scenarioId: ScenarioId;
  scenarioName: string;
  hypothesis: string;
  summary: {
    addedObjectsCount: number;
    modifiedObjectsCount: number;
    removedObjectsCount: number;
    addedConnectionsCount: number;
    removedConnectionsCount: number;
    unchangedObjectsCount: number;
  };
  addedObjects: ModelObject[];
  modifiedObjects: Array<{
    base: ModelObject;
    hypothetical: ModelObject;
    changedFields: string[];
  }>;
  removedObjects: ModelObject[];
  addedConnections: ModelConnection[];
  removedConnections: ModelConnection[];
  simulatedMetrics?: ScenarioSimulatedMetrics;
}

/**
 * Creates an isolated hypothetical scenario cloned from a base branch.
 * Changes inside this scenario are strictly hypothetical and will NEVER mutate
 * the base branch or main.
 */
export function createScenario(input: CreateScenarioInput): ArchitectureScenario {
  if (!input.name || input.name.trim().length === 0) {
    throw new Error('Scenario name cannot be empty');
  }
  if (!input.hypothesis || input.hypothesis.trim().length === 0) {
    throw new Error('Scenario hypothesis cannot be empty');
  }

  const now = new Date().toISOString();

  return {
    id: createId('scn') as ScenarioId,
    name: input.name.trim(),
    hypothesis: input.hypothesis.trim(),
    description: input.description?.trim(),
    workspaceId: input.baseBranch.workspaceId,
    architectureId: input.baseBranch.architectureId,
    baseBranchId: input.baseBranch.id,
    status: 'draft',
    hypotheticalState: cloneBranchState(input.baseBranch.state),
    simulatedMetrics: input.simulatedMetrics,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Applies a hypothetical change to the scenario state in an immutable manner.
 * Guarantees no side effects on any external branch states.
 */
export function applyHypotheticalChange(
  scenario: ArchitectureScenario,
  change: ScenarioHypotheticalChange
): ArchitectureScenario {
  const nextState = cloneBranchState(scenario.hypotheticalState);

  switch (change.kind) {
    case 'add_object': {
      if (!change.object) throw new Error('Object payload required for add_object');
      const exists = nextState.objects.some((o) => o.id === change.object?.id);
      if (!exists) {
        nextState.objects.push(change.object);
      }
      break;
    }
    case 'modify_object': {
      if (!change.object) throw new Error('Object payload required for modify_object');
      const idx = nextState.objects.findIndex((o) => o.id === change.object?.id);
      if (idx !== -1) {
        nextState.objects[idx] = change.object;
      }
      break;
    }
    case 'remove_object': {
      if (!change.objectId) throw new Error('ObjectId required for remove_object');
      nextState.objects = nextState.objects.filter((o) => o.id !== change.objectId);
      // Prune dangling connections
      nextState.connections = nextState.connections.filter(
        (c) => c.sourceObjectId !== change.objectId && c.targetObjectId !== change.objectId
      );
      break;
    }
    case 'add_connection': {
      if (!change.connection) throw new Error('Connection payload required for add_connection');
      const exists = nextState.connections.some((c) => c.id === change.connection?.id);
      if (!exists) {
        nextState.connections.push(change.connection);
      }
      break;
    }
    case 'remove_connection': {
      if (!change.connectionId) throw new Error('ConnectionId required for remove_connection');
      nextState.connections = nextState.connections.filter((c) => c.id !== change.connectionId);
      break;
    }
  }

  return {
    ...scenario,
    hypotheticalState: nextState,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Compares a hypothetical scenario against the real base branch state,
 * highlighting additions, deletions, modifications, and simulated impact metrics.
 */
export function compareScenarioWithBase(
  scenario: ArchitectureScenario,
  baseState: BranchState
): ScenarioComparison {
  const baseObjectMap = new Map<string, ModelObject>(
    baseState.objects.map((o) => [o.id, o])
  );
  const hypoObjectMap = new Map<string, ModelObject>(
    scenario.hypotheticalState.objects.map((o) => [o.id, o])
  );

  const addedObjects: ModelObject[] = [];
  const modifiedObjects: Array<{
    base: ModelObject;
    hypothetical: ModelObject;
    changedFields: string[];
  }> = [];
  const removedObjects: ModelObject[] = [];
  let unchangedObjectsCount = 0;

  for (const [id, hypoObj] of hypoObjectMap.entries()) {
    const baseObj = baseObjectMap.get(id);
    if (!baseObj) {
      addedObjects.push(hypoObj);
    } else {
      const changedFields: string[] = [];
      if (baseObj.name !== hypoObj.name) changedFields.push('name');
      if (baseObj.kind !== hypoObj.kind) changedFields.push('kind');
      if (baseObj.description !== hypoObj.description) changedFields.push('description');
      if (
        baseObj.position?.x !== hypoObj.position?.x ||
        baseObj.position?.y !== hypoObj.position?.y
      ) {
        changedFields.push('position');
      }

      if (changedFields.length > 0) {
        modifiedObjects.push({
          base: baseObj,
          hypothetical: hypoObj,
          changedFields,
        });
      } else {
        unchangedObjectsCount += 1;
      }
    }
  }

  for (const [id, baseObj] of baseObjectMap.entries()) {
    if (!hypoObjectMap.has(id)) {
      removedObjects.push(baseObj);
    }
  }

  const baseConnIds = new Set(baseState.connections.map((c) => c.id));
  const hypoConnIds = new Set(scenario.hypotheticalState.connections.map((c) => c.id));

  const addedConnections = scenario.hypotheticalState.connections.filter(
    (c) => !baseConnIds.has(c.id)
  );
  const removedConnections = baseState.connections.filter(
    (c) => !hypoConnIds.has(c.id)
  );

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    hypothesis: scenario.hypothesis,
    summary: {
      addedObjectsCount: addedObjects.length,
      modifiedObjectsCount: modifiedObjects.length,
      removedObjectsCount: removedObjects.length,
      addedConnectionsCount: addedConnections.length,
      removedConnectionsCount: removedConnections.length,
      unchangedObjectsCount,
    },
    addedObjects,
    modifiedObjects,
    removedObjects,
    addedConnections,
    removedConnections,
    simulatedMetrics: scenario.simulatedMetrics,
  };
}

/**
 * Promotes a proven hypothetical scenario into a full ArchitectureBranch,
 * enabling standard review and pull requests.
 */
export function promoteScenarioToBranch(
  scenario: ArchitectureScenario,
  baseBranch: ArchitectureBranch,
  branchName: string
): { branch: ArchitectureBranch; promotedScenario: ArchitectureScenario } {
  const newBranch = forkBranch(baseBranch, branchName);
  newBranch.state = cloneBranchState(scenario.hypotheticalState);

  const promotedScenario: ArchitectureScenario = {
    ...scenario,
    status: 'promoted',
    updatedAt: new Date().toISOString(),
  };

  return { branch: newBranch, promotedScenario };
}
