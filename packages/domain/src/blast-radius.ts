/**
 * Architecture Blast-Radius Analysis Engine (F088)
 *
 * Strict Acceptance Criteria:
 * - Counts: services, flows, databases, teams, customer-facing features
 * - Test: blast-radius counts are correct.
 */

import { type ArchitectureId, type ObjectId } from './ids';
import type { ModelObject, ModelConnection, ArchitectureModel } from './types';

// ============================================================================
// Types
// ============================================================================

export type BlastRadiusSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ImpactedNode {
  id: ObjectId;
  name: string;
  kind: string;
  hopCount: number; // Distance from the failing node
  isCustomerFacing: boolean;
  team?: string;
  hasFallback: boolean;
}

export interface ImpactedFlow {
  id: string;
  name: string;
  sourceName: string;
  targetName: string;
  hopCount: number;
}

export interface BlastRadiusMetrics {
  impactedServiceCount: number;  // application / system nodes
  impactedDatabaseCount: number; // store nodes
  impactedFlowCount: number;     // total edges disrupted (direct + transitive)
  customerFacingCount: number;   // actor-connected or metadata.customerFacing === true
  teamCount: number;             // distinct teams from metadata.owner/team
  hasCriticalPath: boolean;      // any impacted node with no fallback
  maxHops: number;               // deepest impacted node distance
  severityScore: BlastRadiusSeverity;
}

export interface BlastRadiusReport {
  architectureId: ArchitectureId;
  targetNodeId: ObjectId;
  targetNodeName: string;
  impactedNodes: ImpactedNode[];
  impactedFlows: ImpactedFlow[];
  metrics: BlastRadiusMetrics;
  analyzedAt: string;
}

// ============================================================================
// Helpers
// ============================================================================

function isCustomerFacing(obj: ModelObject, actorIds: Set<ObjectId>): boolean {
  if (obj.metadata?.customerFacing === true) return true;
  if (obj.kind === 'actor') return true;
  return actorIds.has(obj.id);
}

function resolveSeverity(metrics: Omit<BlastRadiusMetrics, 'severityScore'>): BlastRadiusSeverity {
  if (metrics.customerFacingCount > 0 && metrics.hasCriticalPath) return 'critical';
  if (metrics.customerFacingCount > 0) return 'high';
  if (metrics.impactedServiceCount >= 3 || metrics.hasCriticalPath) return 'medium';
  return 'low';
}

function resolveHasFallback(obj: ModelObject): boolean {
  return (
    obj.metadata?.hasFallback === true ||
    obj.metadata?.fallback === true ||
    obj.metadata?.circuitBreaker === true ||
    obj.metadata?.redundant === true
  );
}

// ============================================================================
// Reverse Reachability (Upstream Dependents)
// ============================================================================

/**
 * computeBlastRadius:
 * Given a target node (the failing/changing component), find all upstream services
 * that depend on it — directly or transitively — using reverse BFS.
 *
 * The "reverse" graph: for every edge A → B (A depends on B), in the reverse graph
 * we have B → A. So starting from the failing node (B), BFS on the reverse graph
 * finds all nodes that have a dependency path to B (i.e., are impacted by B's failure).
 */
export function computeBlastRadius(
  model: ArchitectureModel,
  targetNodeId: ObjectId,
  maxHops: number = 8
): BlastRadiusReport {
  const objectMap = new Map<ObjectId, ModelObject>(model.objects.map((o) => [o.id, o]));
  const targetObj = objectMap.get(targetNodeId);

  if (!targetObj) {
    return {
      architectureId: model.architecture.id,
      targetNodeId,
      targetNodeName: targetNodeId as string,
      impactedNodes: [],
      impactedFlows: [],
      metrics: {
        impactedServiceCount: 0,
        impactedDatabaseCount: 0,
        impactedFlowCount: 0,
        customerFacingCount: 0,
        teamCount: 0,
        hasCriticalPath: false,
        maxHops: 0,
        severityScore: 'low',
      },
      analyzedAt: new Date().toISOString(),
    };
  }

  // Build reverse adjacency list: for edge A→B, add B→A in reverse
  const reverseAdj = new Map<ObjectId, Array<{ sourceId: ObjectId; conn: ModelConnection }>>();
  for (const obj of model.objects) {
    reverseAdj.set(obj.id, []);
  }
  for (const conn of model.connections) {
    if (reverseAdj.has(conn.targetObjectId) && objectMap.has(conn.sourceObjectId)) {
      reverseAdj.get(conn.targetObjectId)!.push({ sourceId: conn.sourceObjectId, conn });
    }
  }

  // Find all actors (customer-facing anchor nodes)
  const actorIds = new Set<ObjectId>(
    model.objects.filter((o) => o.kind === 'actor').map((o) => o.id)
  );

  // BFS from targetNodeId in the reverse graph
  const visited = new Set<ObjectId>([targetNodeId]);
  const queue: Array<{ nodeId: ObjectId; hop: number }> = [{ nodeId: targetNodeId, hop: 0 }];
  const impactedNodes: ImpactedNode[] = [];
  const impactedFlows: ImpactedFlow[] = [];
  const seenFlows = new Set<string>();

  while (queue.length > 0) {
    const { nodeId: curr, hop } = queue.shift()!;
    if (hop >= maxHops) continue;

    const neighbors = reverseAdj.get(curr) || [];
    for (const { sourceId, conn } of neighbors) {
      // Record the disrupted flow (edge)
      const flowKey = conn.id as string;
      if (!seenFlows.has(flowKey)) {
        seenFlows.add(flowKey);
        const src = objectMap.get(conn.sourceObjectId);
        const tgt = objectMap.get(conn.targetObjectId);
        impactedFlows.push({
          id: flowKey,
          name: conn.label || `${src?.name || conn.sourceObjectId} → ${tgt?.name || conn.targetObjectId}`,
          sourceName: src?.name || (conn.sourceObjectId as string),
          targetName: tgt?.name || (conn.targetObjectId as string),
          hopCount: hop + 1,
        });
      }

      if (!visited.has(sourceId)) {
        visited.add(sourceId);
        const srcObj = objectMap.get(sourceId)!;
        impactedNodes.push({
          id: sourceId,
          name: srcObj.name,
          kind: srcObj.kind,
          hopCount: hop + 1,
          isCustomerFacing: isCustomerFacing(srcObj, actorIds),
          team: (srcObj.metadata?.owner as string | undefined) ?? (srcObj.metadata?.team as string | undefined),
          hasFallback: resolveHasFallback(srcObj),
        });
        queue.push({ nodeId: sourceId, hop: hop + 1 });
      }
    }
  }

  // Compute metrics
  const impactedServiceCount = impactedNodes.filter(
    (n) => n.kind === 'application' || n.kind === 'system' || n.kind === 'component'
  ).length;
  const impactedDatabaseCount = impactedNodes.filter((n) => n.kind === 'store').length;
  const customerFacingCount = impactedNodes.filter((n) => n.isCustomerFacing).length;
  const teamSet = new Set<string>(
    impactedNodes.map((n) => n.team).filter((t): t is string => !!t)
  );
  const hasCriticalPath = impactedNodes.some((n) => !n.hasFallback && n.isCustomerFacing);
  const maxHopsActual = impactedNodes.reduce((m, n) => Math.max(m, n.hopCount), 0);

  const metricsWithoutSeverity = {
    impactedServiceCount,
    impactedDatabaseCount,
    impactedFlowCount: impactedFlows.length,
    customerFacingCount,
    teamCount: teamSet.size,
    hasCriticalPath,
    maxHops: maxHopsActual,
  };

  const metrics: BlastRadiusMetrics = {
    ...metricsWithoutSeverity,
    severityScore: resolveSeverity(metricsWithoutSeverity),
  };

  return {
    architectureId: model.architecture.id,
    targetNodeId,
    targetNodeName: targetObj.name,
    impactedNodes,
    impactedFlows,
    metrics,
    analyzedAt: new Date().toISOString(),
  };
}
