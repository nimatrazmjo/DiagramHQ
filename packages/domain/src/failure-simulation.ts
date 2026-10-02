/**
 * Architecture Failure Simulation Engine (F089)
 *
 * Strict Acceptance Criteria:
 * - Mark an object down; highlight the blast radius with severity; distinguish fallback vs no-fallback.
 * - Test: simulate a DB outage; downstream flagged; fallbacks distinguished.
 */

import { type ArchitectureId, type ObjectId } from './ids';
import type { ModelObject, ModelConnection, ArchitectureModel } from './types';
import { computeBlastRadius } from './blast-radius';
import type { BlastRadiusReport } from './blast-radius';

// ============================================================================
// Types
// ============================================================================

export type NodeSimulationStatus = 'down' | 'degraded' | 'fallback' | 'healthy';

export interface SimulationConfig {
  downedNodeIds: ObjectId[];
  reason?: string;
  simulatedAt?: string;
  maxHops?: number;
}

export interface SimulatedNodeImpact {
  nodeId: ObjectId;
  nodeName: string;
  nodeKind: string;
  status: NodeSimulationStatus;
  isDirectlyDowned: boolean;
  hasFallback: boolean;
  cascadeChain: string[]; // Names of the downed nodes causing this impact, in order
  hopCount: number;       // Distance from the downed node
  reason: string;
}

export type SimulatedImpact = SimulatedNodeImpact;


export interface FailureSimulationMetrics {
  totalDownedNodes: number;
  totalDegradedNodes: number;
  totalFallbackNodes: number;
  totalHealthyNodes: number;
  impactedCustomerFacingCount: number;
  impactedTeamCount: number;
  maxCascadeDepth: number;
  hasFullOutage: boolean; // Any downed node with customer-facing + no fallback
}

export interface FailureSimulationReport {
  architectureId: ArchitectureId;
  simulationConfig: SimulationConfig;
  nodeImpacts: SimulatedNodeImpact[];
  blastRadiusReports: BlastRadiusReport[]; // One per downed node
  metrics: FailureSimulationMetrics;
  simulatedAt: string;
}

// ============================================================================
// Helpers
// ============================================================================

function resolveHasFallback(obj: ModelObject): boolean {
  return (
    obj.metadata?.hasFallback === true ||
    obj.metadata?.fallback === true ||
    obj.metadata?.circuitBreaker === true ||
    obj.metadata?.redundant === true
  );
}

// ============================================================================
// Core Simulation
// ============================================================================

/**
 * simulateFailure:
 * Given a set of downed nodes, compute how the failure cascades through the architecture.
 *
 * Algorithm:
 * 1. Mark all downed nodes as `status: 'down'`.
 * 2. For each downed node, run computeBlastRadius (reverse BFS) to find upstream dependents.
 * 3. For each upstream dependent:
 *    - If it has a fallback mechanism → `status: 'fallback'`
 *    - Otherwise → `status: 'degraded'`
 * 4. Nodes not downed or impacted → `status: 'healthy'`
 * 5. Merge impacts from multiple downed nodes (worst-case status wins: down > degraded > fallback > healthy)
 */
export function simulateFailure(
  model: ArchitectureModel,
  config: SimulationConfig
): FailureSimulationReport {
  const objectMap = new Map<ObjectId, ModelObject>(model.objects.map((o) => [o.id, o]));
  const downedSet = new Set<ObjectId>(config.downedNodeIds);
  const maxHops = config.maxHops ?? 8;

  // Compute blast radius for each downed node
  const blastRadiusReports: BlastRadiusReport[] = config.downedNodeIds
    .filter((id) => objectMap.has(id))
    .map((id) => computeBlastRadius(model, id, maxHops));

  // Build impact map: nodeId → SimulatedNodeImpact (worst-case merged)
  const statusPriority: Record<NodeSimulationStatus, number> = {
    down: 3,
    degraded: 2,
    fallback: 1,
    healthy: 0,
  };

  const impactMap = new Map<ObjectId, SimulatedNodeImpact>();

  // First pass: mark all downed nodes
  for (const nodeId of config.downedNodeIds) {
    const obj = objectMap.get(nodeId);
    if (!obj) continue;
    impactMap.set(nodeId, {
      nodeId,
      nodeName: obj.name,
      nodeKind: obj.kind,
      status: 'down',
      isDirectlyDowned: true,
      hasFallback: resolveHasFallback(obj),
      cascadeChain: [obj.name],
      hopCount: 0,
      reason: config.reason
        ? `Simulated failure: ${config.reason}`
        : `Simulated outage of ${obj.name}`,
    });
  }

  // Second pass: cascade impacts from each blast radius
  for (const brReport of blastRadiusReports) {
    const downedObj = objectMap.get(brReport.targetNodeId);
    if (!downedObj) continue;

    for (const impacted of brReport.impactedNodes) {
      // Don't override a 'down' status for co-downed nodes
      if (downedSet.has(impacted.id)) continue;

      const obj = objectMap.get(impacted.id);
      if (!obj) continue;

      const hasFallback = resolveHasFallback(obj);
      const newStatus: NodeSimulationStatus = hasFallback ? 'fallback' : 'degraded';
      const existing = impactMap.get(impacted.id);

      if (!existing || statusPriority[newStatus] > statusPriority[existing.status]) {
        impactMap.set(impacted.id, {
          nodeId: impacted.id,
          nodeName: impacted.name,
          nodeKind: impacted.kind,
          status: newStatus,
          isDirectlyDowned: false,
          hasFallback,
          cascadeChain: [downedObj.name],
          hopCount: impacted.hopCount,
          reason: hasFallback
            ? `Degraded — ${downedObj.name} is down (fallback available)`
            : `Degraded — ${downedObj.name} is down (no fallback)`,
        });
      }
    }
  }

  // Third pass: all remaining nodes are healthy
  for (const obj of model.objects) {
    if (!impactMap.has(obj.id)) {
      impactMap.set(obj.id, {
        nodeId: obj.id,
        nodeName: obj.name,
        nodeKind: obj.kind,
        status: 'healthy',
        isDirectlyDowned: false,
        hasFallback: resolveHasFallback(obj),
        cascadeChain: [],
        hopCount: -1,
        reason: 'Unaffected by simulated failure',
      });
    }
  }

  const nodeImpacts = Array.from(impactMap.values());

  // Compute metrics
  const totalDownedNodes = nodeImpacts.filter((n) => n.status === 'down').length;
  const totalDegradedNodes = nodeImpacts.filter((n) => n.status === 'degraded').length;
  const totalFallbackNodes = nodeImpacts.filter((n) => n.status === 'fallback').length;
  const totalHealthyNodes = nodeImpacts.filter((n) => n.status === 'healthy').length;

  const actorIds = new Set<ObjectId>(
    model.objects.filter((o) => o.kind === 'actor').map((o) => o.id)
  );
  const impactedCustomerFacingCount = nodeImpacts.filter(
    (n) =>
      n.status !== 'healthy' &&
      (actorIds.has(n.nodeId) || objectMap.get(n.nodeId)?.metadata?.customerFacing === true)
  ).length;

  const impactedTeamSet = new Set<string>(
    nodeImpacts
      .filter((n) => n.status !== 'healthy')
      .map((n) => {
        const obj = objectMap.get(n.nodeId);
        return (obj?.metadata?.owner as string | undefined) ?? (obj?.metadata?.team as string | undefined);
      })
      .filter((t): t is string => !!t)
  );

  const maxCascadeDepth = nodeImpacts
    .filter((n) => n.hopCount >= 0)
    .reduce((m, n) => Math.max(m, n.hopCount), 0);

  const hasFullOutage = nodeImpacts.some(
    (n) => n.status === 'degraded' && actorIds.has(n.nodeId)
  );

  const metrics: FailureSimulationMetrics = {
    totalDownedNodes,
    totalDegradedNodes,
    totalFallbackNodes,
    totalHealthyNodes,
    impactedCustomerFacingCount,
    impactedTeamCount: impactedTeamSet.size,
    maxCascadeDepth,
    hasFullOutage,
  };

  return {
    architectureId: model.architecture.id,
    simulationConfig: config,
    nodeImpacts,
    blastRadiusReports,
    metrics,
    simulatedAt: config.simulatedAt ?? new Date().toISOString(),
  };
}

// ============================================================================
// Downstream-affected connections helper (for UI highlighting)
// ============================================================================

/**
 * getAffectedConnections:
 * Returns the subset of model connections that are disrupted by the failure simulation.
 * A connection is disrupted if its source or target is downed or degraded.
 */
export function getAffectedConnections(
  model: ArchitectureModel,
  report: FailureSimulationReport
): ModelConnection[] {
  const affectedNodeIds = new Set<ObjectId>(
    report.nodeImpacts
      .filter((n) => n.status === 'down' || n.status === 'degraded')
      .map((n) => n.nodeId)
  );

  return model.connections.filter(
    (conn) => affectedNodeIds.has(conn.sourceObjectId) || affectedNodeIds.has(conn.targetObjectId)
  );
}
