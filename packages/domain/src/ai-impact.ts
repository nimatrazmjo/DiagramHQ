/**
 * DiagramHQ - AI Architecture Impact Analysis Domain Logic (F066)
 *
 * Graph-grounded AI blast-radius and impact analysis engine.
 * Computes exact topological dependencies, downstream blast radius, affected flows,
 * stakeholder teams, and critical paths, then synthesizes a verified AI narrative:
 * - Direct & indirect downstream dependents (who breaks if this fails/changes)
 * - Direct & indirect upstream dependencies (what this relies on)
 * - Affected execution flows and API journeys
 * - Affected stakeholder engineering teams
 * - Critical path & Single Point of Failure (SPOF) assessment
 *
 * Strict invariant: AI impact narrative strictly matches the computed graph impact set.
 */

import type { ObjectId, ConnectionId } from './ids';
import type { ModelObject, ModelConnection, FlowWithSteps } from './types';
import type { Team, ObjectOwnership } from './teams';

export type ImpactRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface CriticalPathFinding {
  dependentObjectId: ObjectId;
  dependentObjectName: string;
  rationale: string;
}

export interface AffectedTeamInfo {
  teamId: string;
  teamName: string;
  role: 'primary' | 'backup';
  affectedObjectId: ObjectId;
  affectedObjectName: string;
}

export interface ArchitecturalImpact {
  targetObject: ModelObject;
  directDependents: ModelObject[];
  indirectDependents: ModelObject[];
  directDependencies: ModelObject[];
  indirectDependencies: ModelObject[];
  affectedConnections: ModelConnection[];
  affectedFlows: FlowWithSteps[];
  affectedTeams: AffectedTeamInfo[];
  criticalPaths: CriticalPathFinding[];
  riskLevel: ImpactRiskLevel;
  metrics: {
    totalBlastRadiusCount: number;
    directDependentsCount: number;
    indirectDependentsCount: number;
    affectedFlowsCount: number;
    affectedTeamsCount: number;
    criticalPathsCount: number;
  };
}

export interface AIImpactNarrative {
  title: string;
  executiveSummary: string;
  breakdown: {
    blastRadiusAnalysis: string;
    flowDisruptions: string;
    teamStakeholders: string;
    criticalPathRisks: string;
  };
  recommendedActions: string[];
  generatedAt: string;
}

export interface ImpactAnalysisContext {
  objects: ModelObject[];
  connections: ModelConnection[];
  flows?: FlowWithSteps[];
  teams?: Team[];
  ownerships?: ObjectOwnership[];
}

/**
 * Traverses graph to find all upstream or downstream reachable nodes using BFS.
 */
function findReachableNodes(
  startId: ObjectId,
  connections: ModelConnection[],
  direction: 'dependents' | 'dependencies'
): { directIds: Set<ObjectId>; indirectIds: Set<ObjectId>; traversedConnIds: Set<ConnectionId> } {
  const directIds = new Set<ObjectId>();
  const indirectIds = new Set<ObjectId>();
  const traversedConnIds = new Set<ConnectionId>();

  const visited = new Set<ObjectId>([startId]);
  const queue: Array<{ id: ObjectId; depth: number }> = [{ id: startId, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    // Dependents follow incoming edges: X -> Current (X depends on Current)
    // Dependencies follow outgoing edges: Current -> Y (Current depends on Y)
    const matchingConns = connections.filter((c) =>
      direction === 'dependents' ? c.targetObjectId === current.id : c.sourceObjectId === current.id
    );

    for (const conn of matchingConns) {
      traversedConnIds.add(conn.id);
      const nextId = direction === 'dependents' ? conn.sourceObjectId : conn.targetObjectId;

      if (!visited.has(nextId)) {
        visited.add(nextId);
        if (current.depth === 0) {
          directIds.add(nextId);
        } else {
          indirectIds.add(nextId);
        }
        queue.push({ id: nextId, depth: current.depth + 1 });
      }
    }
  }

  return { directIds, indirectIds, traversedConnIds };
}

/**
 * Computes pure structural impact graph sets for a given architecture object.
 */
export function computeArchitecturalImpact(
  targetId: ObjectId,
  context: ImpactAnalysisContext
): ArchitecturalImpact {
  const targetObject = context.objects.find((o) => o.id === targetId);
  if (!targetObject) {
    throw new Error(`Cannot compute impact: Object with ID '${targetId}' not found`);
  }

  const { directIds: dirDepIds, indirectIds: indirDepIds, traversedConnIds: depConns } = findReachableNodes(
    targetId,
    context.connections,
    'dependents'
  );

  const { directIds: dirRelIds, indirectIds: indirRelIds, traversedConnIds: relConns } = findReachableNodes(
    targetId,
    context.connections,
    'dependencies'
  );

  const objMap = new Map(context.objects.map((o) => [o.id, o]));
  const directDependents = Array.from(dirDepIds).map((id) => objMap.get(id)).filter(Boolean) as ModelObject[];
  const indirectDependents = Array.from(indirDepIds).map((id) => objMap.get(id)).filter(Boolean) as ModelObject[];
  const directDependencies = Array.from(dirRelIds).map((id) => objMap.get(id)).filter(Boolean) as ModelObject[];
  const indirectDependencies = Array.from(indirRelIds).map((id) => objMap.get(id)).filter(Boolean) as ModelObject[];

  const allAffectedConnIds = new Set([...depConns, ...relConns]);
  const affectedConnections = context.connections.filter((c) => allAffectedConnIds.has(c.id));

  // Affected flows: flows that traverse target or dependent connections
  const allAffectedObjIds = new Set([targetId, ...dirDepIds, ...indirDepIds]);
  const affectedFlows = (context.flows || []).filter((flow) => {
    return flow.steps.some((step) => {
      const stepConn = context.connections.find((c) => c.id === step.connectionId);
      if (!stepConn) return false;
      return (
        allAffectedObjIds.has(stepConn.sourceObjectId) ||
        allAffectedObjIds.has(stepConn.targetObjectId) ||
        allAffectedConnIds.has(stepConn.id)
      );
    });
  });

  // Affected teams: teams owning any dependent or target object
  const teamsMap = new Map((context.teams || []).map((t) => [t.id, t]));
  const affectedTeams: AffectedTeamInfo[] = [];

  for (const ownership of context.ownerships || []) {
    if (allAffectedObjIds.has(ownership.objectId)) {
      const affectedObj = objMap.get(ownership.objectId);
      const objName = affectedObj?.name || ownership.objectId;

      const primaryTeam = teamsMap.get(ownership.primaryTeamId);
      if (primaryTeam) {
        affectedTeams.push({
          teamId: primaryTeam.id,
          teamName: primaryTeam.name,
          role: 'primary',
          affectedObjectId: ownership.objectId,
          affectedObjectName: objName,
        });
      }

      if (ownership.backupTeamId) {
        const backupTeam = teamsMap.get(ownership.backupTeamId);
        if (backupTeam) {
          affectedTeams.push({
            teamId: backupTeam.id,
            teamName: backupTeam.name,
            role: 'backup',
            affectedObjectId: ownership.objectId,
            affectedObjectName: objName,
          });
        }
      }
    }
  }

  // Critical path / Single Point of Failure (SPOF) detection
  const criticalPaths: CriticalPathFinding[] = [];
  for (const dep of directDependents) {
    const outgoing = context.connections.filter((c) => c.sourceObjectId === dep.id);
    if (outgoing.length === 1 && outgoing[0]?.targetObjectId === targetId) {
      criticalPaths.push({
        dependentObjectId: dep.id,
        dependentObjectName: dep.name,
        rationale: `'${dep.name}' routes 100% of outbound traffic exclusively through '${targetObject.name}'. Single point of failure.`,
      });
    }
  }

  const totalBlastRadiusCount = directDependents.length + indirectDependents.length;

  let riskLevel: ImpactRiskLevel = 'low';
  if (criticalPaths.length > 0 || totalBlastRadiusCount >= 5 || affectedFlows.length >= 3) {
    riskLevel = 'critical';
  } else if (totalBlastRadiusCount >= 3 || affectedFlows.length >= 2) {
    riskLevel = 'high';
  } else if (totalBlastRadiusCount >= 1) {
    riskLevel = 'medium';
  }

  return {
    targetObject,
    directDependents,
    indirectDependents,
    directDependencies,
    indirectDependencies,
    affectedConnections,
    affectedFlows,
    affectedTeams,
    criticalPaths,
    riskLevel,
    metrics: {
      totalBlastRadiusCount,
      directDependentsCount: directDependents.length,
      indirectDependentsCount: indirectDependents.length,
      affectedFlowsCount: affectedFlows.length,
      affectedTeamsCount: affectedTeams.length,
      criticalPathsCount: criticalPaths.length,
    },
  };
}

/**
 * Synthesizes an AI narrative grounded strictly in the computed impact set.
 * Invariant: All numbers, entity names, flow names, and team stakeholders in the narrative
 * precisely match the computed ArchitecturalImpact fields.
 */
export function generateAIImpactNarrative(impact: ArchitecturalImpact): AIImpactNarrative {
  const target = impact.targetObject;
  const { metrics, riskLevel } = impact;

  const directNames = impact.directDependents.map((d) => d.name).join(', ') || 'None';
  const indirectNames = impact.indirectDependents.map((d) => d.name).join(', ') || 'None';
  const flowNames = impact.affectedFlows.map((f) => `'${f.name}'`).join(', ') || 'None';
  const teamNames = Array.from(new Set(impact.affectedTeams.map((t) => t.teamName))).join(', ') || 'Unassigned';

  const executiveSummary = `Impact analysis for '${target.name}' (${target.id}) indicates a ${riskLevel.toUpperCase()} risk blast radius. Modifying or taking down this component directly impacts ${metrics.directDependentsCount} dependent(s) and transitively affects ${metrics.indirectDependentsCount} indirect dependent(s), traversing ${metrics.affectedFlowsCount} end-to-end flow(s).`;

  const blastRadiusAnalysis = `Direct dependents (${metrics.directDependentsCount}): ${directNames}. Transitive indirect dependents (${metrics.indirectDependentsCount}): ${indirectNames}. Total affected downstream components: ${metrics.totalBlastRadiusCount}.`;

  const flowDisruptions = metrics.affectedFlowsCount > 0
    ? `Disrupts ${metrics.affectedFlowsCount} registered business flow(s): ${flowNames}. Client transactions will experience degradation or total failure.`
    : 'No registered runtime flows currently traverse this component.';

  const teamStakeholders = metrics.affectedTeamsCount > 0
    ? `Identified ${metrics.affectedTeamsCount} team stakeholder association(s) across: ${teamNames}. These teams must be notified prior to migration or breaking schema changes.`
    : 'No specific engineering team ownership metadata registered on affected entities.';

  const criticalPathRisks = metrics.criticalPathsCount > 0
    ? `Detected ${metrics.criticalPathsCount} Single Point of Failure (SPOF) critical path(s): ${impact.criticalPaths.map((cp) => cp.rationale).join(' ')}`
    : 'No single-point-of-failure bottlenecks detected; downstream consumers possess alternative routing or fallback redundancy.';

  const recommendedActions: string[] = [];
  if (riskLevel === 'critical' || riskLevel === 'high') {
    recommendedActions.push('Require multi-team sign-off before merging pull requests affecting this component.');
    recommendedActions.push('Schedule maintenance windows during off-peak traffic hours.');
  }
  if (impact.criticalPaths.length > 0) {
    recommendedActions.push('Introduce circuit breakers or replica fallback paths for SPOF consumers.');
  }
  if (impact.affectedFlows.length > 0) {
    recommendedActions.push(`Execute automated smoke tests for flows: ${flowNames}.`);
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push('Standard deployment review is sufficient; low downstream blast radius.');
  }

  return {
    title: `AI Impact Assessment: ${target.name}`,
    executiveSummary,
    breakdown: {
      blastRadiusAnalysis,
      flowDisruptions,
      teamStakeholders,
      criticalPathRisks,
    },
    recommendedActions,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * End-to-end impact analysis and narration.
 */
export function analyzeAndNarrateImpact(
  targetId: ObjectId,
  context: ImpactAnalysisContext
): {
  impact: ArchitecturalImpact;
  narrative: AIImpactNarrative;
} {
  const impact = computeArchitecturalImpact(targetId, context);
  const narrative = generateAIImpactNarrative(impact);
  return { impact, narrative };
}
