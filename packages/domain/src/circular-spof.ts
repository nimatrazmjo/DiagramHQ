/**
 * Circular Dependency & Single Point of Failure (SPOF) Detection Engine (F130)
 *
 * Strict Acceptance Criteria:
 * - Detect circular dependencies; detect single points of failure
 * - Test: seeded cycle detected; SPOF flagged on a fan-in.
 */

import { type ArchitectureId, type ObjectId, type ConnectionId } from './ids';
import type { ArchitectureModel, ModelObject, ModelConnection } from './types';

// ============================================================================
// Types
// ============================================================================

export type SpofRiskSeverity = 'critical' | 'high' | 'medium' | 'low';

export type SpofCategory =
  | 'fan_in_bottleneck'
  | 'sole_provider'
  | 'articulation_point'
  | 'unreplicated_store'
  | 'unmitigated_hub';

export interface CircularDependency {
  id: string;
  nodeIds: ObjectId[];
  nodeNames: string[];
  pathDescription: string;
  length: number;
  isSynchronous: boolean;
  severity: SpofRiskSeverity;
  connectionIds: ConnectionId[];
  breakingEdgeSuggestion?: {
    sourceId: ObjectId;
    sourceName: string;
    targetId: ObjectId;
    targetName: string;
    reason: string;
  };
}

export interface SpofFinding {
  id: string;
  targetId: ObjectId;
  targetName: string;
  targetKind: string;
  severity: SpofRiskSeverity;
  categories: SpofCategory[];
  inDegree: number;
  dependentIds: ObjectId[];
  dependentNames: string[];
  isArticulationPoint: boolean;
  blastRadiusCount: number;
  rationale: string;
  mitigation: string;
}

export interface StructuralRiskMetrics {
  totalNodes: number;
  totalConnections: number;
  cycleCount: number;
  spofCount: number;
  articulationPointCount: number;
  maxFanIn: number;
  criticalRisksCount: number;
  structuralHealthScore: number; // 0 – 100
  overallRiskLevel: 'healthy' | 'warning' | 'critical';
}

export interface StructuralRiskReport {
  architectureId: ArchitectureId;
  cycles: CircularDependency[];
  spofs: SpofFinding[];
  metrics: StructuralRiskMetrics;
  recommendations: string[];
  analyzedAt: string;
}

export interface StructuralRiskOptions {
  fanInThreshold?: number; // default: 2 (>= 2 incoming dependencies flagged if unmitigated)
  criticalFanInThreshold?: number; // default: 4 (>= 4 is critical)
  ignoreActorsAndGroups?: boolean; // default: true
}

// ============================================================================
// Cycle Detection
// ============================================================================

/**
 * Detect all directed circular dependency loops in an architecture model.
 */
export function detectCircularDependencies(
  model: ArchitectureModel
): CircularDependency[] {
  const nodes = model.objects || [];
  const connections = model.connections || [];
  const objectMap = new Map<ObjectId, ModelObject>(nodes.map((n) => [n.id, n]));

  // Adjacency map with connection refs
  const adj = new Map<ObjectId, Array<{ targetId: ObjectId; conn: ModelConnection }>>();
  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const conn of connections) {
    if (adj.has(conn.sourceObjectId) && adj.has(conn.targetObjectId)) {
      adj.get(conn.sourceObjectId)!.push({ targetId: conn.targetObjectId, conn });
    }
  }

  const visited = new Set<ObjectId>();
  const inStack = new Set<ObjectId>();
  const stack: ObjectId[] = [];
  const edgeStack: ModelConnection[] = [];
  const recordedCycles = new Set<string>();
  const cycles: CircularDependency[] = [];

  function dfs(curr: ObjectId) {
    visited.add(curr);
    inStack.add(curr);
    stack.push(curr);

    const neighbors = adj.get(curr) || [];
    for (const { targetId: next, conn } of neighbors) {
      if (!visited.has(next)) {
        edgeStack.push(conn);
        dfs(next);
        edgeStack.pop();
      } else if (inStack.has(next)) {
        // Cycle detected: extract nodes from stack between next and curr
        const cycleStartIndex = stack.indexOf(next);
        if (cycleStartIndex !== -1) {
          const cycleNodes = stack.slice(cycleStartIndex);
          const cycleKey = [...cycleNodes].sort().join('->');

          if (!recordedCycles.has(cycleKey)) {
            recordedCycles.add(cycleKey);
            const nodeNames = cycleNodes.map((id) => objectMap.get(id)?.name || id);
            const pathNames = [...nodeNames, objectMap.get(next)?.name || next];

            // Extract cycle connections
            const cycleEdges = edgeStack.slice(cycleStartIndex).concat(conn);
            const connectionIds = cycleEdges.map((e) => e.id);

            // Determine if cycle contains synchronous RPC or data links
            const hasSyncConn = cycleEdges.some(
              (e) =>
                e.kind === 'sync' ||
                !e.kind ||
                e.label?.toLowerCase().includes('http') ||
                e.label?.toLowerCase().includes('grpc') ||
                e.label?.toLowerCase().includes('rpc')
            );

            const hasStore = cycleNodes.some(
              (id) => objectMap.get(id)?.kind === 'store'
            );

            let severity: SpofRiskSeverity = 'medium';
            if (hasSyncConn) severity = 'critical';
            else if (hasStore || cycleNodes.length >= 4) severity = 'high';

            // Recommend breaking the last edge in the cycle
            const lastSrcId = cycleNodes[cycleNodes.length - 1] as ObjectId;
            const firstTgtId = cycleNodes[0] as ObjectId;
            const lastSrcName = (lastSrcId ? objectMap.get(lastSrcId)?.name : null) || lastSrcId || '';
            const firstTgtName = (firstTgtId ? objectMap.get(firstTgtId)?.name : null) || firstTgtId || '';

            cycles.push({
              id: `cycle-${cycles.length + 1}`,
              nodeIds: cycleNodes,
              nodeNames,
              pathDescription: pathNames.join(' ➔ '),
              length: cycleNodes.length,
              isSynchronous: hasSyncConn,
              severity,
              connectionIds,
              breakingEdgeSuggestion:
                lastSrcId && firstTgtId
                  ? {
                      sourceId: lastSrcId,
                      sourceName: lastSrcName,
                      targetId: firstTgtId,
                      targetName: firstTgtName,
                      reason: `Invert dependency between '${lastSrcName}' and '${firstTgtName}' or convert to an asynchronous event bus topic.`,
                    }
                  : undefined,
            });
          }
        }
      }
    }

    stack.pop();
    inStack.delete(curr);
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }

  return cycles.sort((a, _b) => (a.severity === 'critical' ? -1 : 1));
}

// ============================================================================
// Tarjan's Articulation Points (Cut Vertices)
// ============================================================================

/**
 * Finds articulation points (cut vertices) where node removal partitions
 * the component graph.
 */
export function findArticulationPoints(
  nodes: ModelObject[],
  connections: ModelConnection[]
): Set<ObjectId> {
  const adj = new Map<ObjectId, Set<ObjectId>>();
  for (const n of nodes) adj.set(n.id, new Set());

  for (const c of connections) {
    if (adj.has(c.sourceObjectId) && adj.has(c.targetObjectId)) {
      adj.get(c.sourceObjectId)!.add(c.targetObjectId);
      adj.get(c.targetObjectId)!.add(c.sourceObjectId);
    }
  }

  const visited = new Set<ObjectId>();
  const disc = new Map<ObjectId, number>();
  const low = new Map<ObjectId, number>();
  const parent = new Map<ObjectId, ObjectId | null>();
  const articulationPoints = new Set<ObjectId>();
  let time = 0;

  function dfs(u: ObjectId) {
    visited.add(u);
    disc.set(u, ++time);
    low.set(u, time);
    let children = 0;

    for (const v of adj.get(u) || []) {
      if (!visited.has(v)) {
        children++;
        parent.set(v, u);
        dfs(v);

        low.set(u, Math.min(low.get(u)!, low.get(v)!));

        if (parent.get(u) === null && children > 1) {
          articulationPoints.add(u);
        }
        if (parent.get(u) !== null && low.get(v)! >= disc.get(u)!) {
          articulationPoints.add(u);
        }
      } else if (v !== parent.get(u)) {
        low.set(u, Math.min(low.get(u)!, disc.get(v)!));
      }
    }
  }

  for (const n of nodes) {
    if (!visited.has(n.id)) {
      parent.set(n.id, null);
      dfs(n.id);
    }
  }

  return articulationPoints;
}

// ============================================================================
// Single Point of Failure (SPOF) Detection
// ============================================================================

/**
 * Detect Single Points of Failure across the architecture model.
 */
export function detectSinglePointsOfFailure(
  model: ArchitectureModel,
  options?: StructuralRiskOptions
): SpofFinding[] {
  const fanInThreshold = options?.fanInThreshold ?? 2;
  const criticalFanIn = options?.criticalFanInThreshold ?? 4;
  const ignoreActors = options?.ignoreActorsAndGroups ?? true;

  const nodes = model.objects || [];
  const connections = model.connections || [];
  const objectMap = new Map<ObjectId, ModelObject>(nodes.map((n) => [n.id, n]));

  // Pre-calculate articulation points
  const articulationPoints = findArticulationPoints(nodes, connections);

  // Incoming and outgoing connections per node
  const incomingMap = new Map<ObjectId, ModelConnection[]>();
  const outgoingMap = new Map<ObjectId, ModelConnection[]>();
  for (const n of nodes) {
    incomingMap.set(n.id, []);
    outgoingMap.set(n.id, []);
  }

  for (const c of connections) {
    if (incomingMap.has(c.targetObjectId)) {
      incomingMap.get(c.targetObjectId)!.push(c);
    }
    if (outgoingMap.has(c.sourceObjectId)) {
      outgoingMap.get(c.sourceObjectId)!.push(c);
    }
  }

  const spofs: SpofFinding[] = [];

  for (const node of nodes) {
    if (ignoreActors && (node.kind === 'actor' || node.kind === 'group')) {
      continue;
    }

    const inConns = incomingMap.get(node.id) || [];
    const inDegree = inConns.length;
    const dependentNodeIds = Array.from(new Set(inConns.map((c) => c.sourceObjectId)));
    const dependentNames = dependentNodeIds
      .map((id) => objectMap.get(id)?.name || id)
      .filter(Boolean);

    const isArtPoint = articulationPoints.has(node.id);

    // Check redundancy / High Availability metadata
    const metadata = node.metadata || {};
    const hasRedundancy = Boolean(
      metadata.redundant === true ||
        metadata.ha === true ||
        metadata.multiAz === true ||
        metadata.multiRegion === true ||
        metadata.clustered === true ||
        (typeof metadata.replicas === 'number' && metadata.replicas > 1)
    );

    // Sole provider: upstream nodes that ONLY communicate with this node
    const soleProviderFor: ObjectId[] = [];
    for (const depId of dependentNodeIds) {
      const depOutgoing = outgoingMap.get(depId) || [];
      if (depOutgoing.length === 1 && depOutgoing[0]?.targetObjectId === node.id) {
        soleProviderFor.push(depId);
      }
    }

    const isStore = node.kind === 'store';
    const isUnreplicatedStore = isStore && !hasRedundancy && inDegree >= 1;
    const isFanInBottleneck = inDegree >= fanInThreshold && !hasRedundancy;
    const isSoleProvider = soleProviderFor.length > 0 && !hasRedundancy;
    const isUnmitigatedHub = isArtPoint && !hasRedundancy;

    const categories: SpofCategory[] = [];
    if (isFanInBottleneck) categories.push('fan_in_bottleneck');
    if (isSoleProvider) categories.push('sole_provider');
    if (isArtPoint && !hasRedundancy) categories.push('articulation_point');
    if (isUnreplicatedStore) categories.push('unreplicated_store');
    if (isUnmitigatedHub) categories.push('unmitigated_hub');

    // Only flag as SPOF if at least one risk category matched
    if (categories.length > 0) {
      let severity: SpofRiskSeverity = 'medium';
      if (
        inDegree >= criticalFanIn ||
        (isArtPoint && isStore) ||
        soleProviderFor.length >= 3
      ) {
        severity = 'critical';
      } else if (inDegree >= fanInThreshold || isArtPoint || isUnreplicatedStore) {
        severity = 'high';
      }

      // Generate clear rationale
      const reasons: string[] = [];
      if (isFanInBottleneck) {
        reasons.push(
          `High fan-in bottleneck: ${inDegree} incoming connection(s) converge on '${node.name}' without active redundancy.`
        );
      }
      if (isSoleProvider) {
        const soleNames = soleProviderFor.map((id) => objectMap.get(id)?.name || id).join(', ');
        reasons.push(
          `Sole downstream provider: ${soleNames} route 100% of external communication through '${node.name}'.`
        );
      }
      if (isArtPoint) {
        reasons.push(
          `Articulation point: Failure of '${node.name}' structurally partitions the architecture topology.`
        );
      }
      if (isUnreplicatedStore) {
        reasons.push(
          `Unreplicated datastore: Primary database '${node.name}' lacks multi-AZ replication or replica fallback.`
        );
      }

      // Actionable mitigation advice
      const mitigations: string[] = [];
      if (isStore) {
        mitigations.push(
          'Deploy multi-AZ primary/replica database replication, enable automated failover, or place behind a connection pool proxy.'
        );
      } else {
        mitigations.push(
          'Introduce load balancing with at least 2 active replicas (metadata: { ha: true, replicas: 2 }).'
        );
      }
      if (isSoleProvider || isFanInBottleneck) {
        mitigations.push(
          'Add circuit breakers, retry with backoff, and asynchronous fallback messaging to decouple dependents.'
        );
      }

      const blastRadiusCount = dependentNodeIds.length + (outgoingMap.get(node.id) || []).length;

      spofs.push({
        id: `spof-${node.id}`,
        targetId: node.id,
        targetName: node.name,
        targetKind: node.kind,
        severity,
        categories,
        inDegree,
        dependentIds: dependentNodeIds,
        dependentNames,
        isArticulationPoint: isArtPoint,
        blastRadiusCount,
        rationale: reasons.join(' '),
        mitigation: mitigations.join(' '),
      });
    }
  }

  return spofs.sort((a, b) => {
    const rank: Record<SpofRiskSeverity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return rank[b.severity] - rank[a.severity] || b.inDegree - a.inDegree;
  });
}

// ============================================================================
// Structural Risk Analyzer Engine
// ============================================================================

/**
 * Perform comprehensive structural risk analysis on an architecture model,
 * combining cycle detection, SPOF analysis, and overall health scoring.
 */
export function analyzeStructuralRisks(
  model: ArchitectureModel,
  options?: StructuralRiskOptions
): StructuralRiskReport {
  const cycles = detectCircularDependencies(model);
  const spofs = detectSinglePointsOfFailure(model, options);

  const totalNodes = (model.objects || []).length;
  const totalConnections = (model.connections || []).length;
  const articulationPoints = findArticulationPoints(model.objects || [], model.connections || []);

  const maxFanIn = Math.max(0, ...spofs.map((s) => s.inDegree));
  const criticalRisksCount =
    cycles.filter((c) => c.severity === 'critical').length +
    spofs.filter((s) => s.severity === 'critical').length;

  // Structural Health Score: 100 base, penalized by cycles and SPOFs
  const cyclePenalty = cycles.reduce((acc, c) => acc + (c.severity === 'critical' ? 25 : 15), 0);
  const spofPenalty = spofs.reduce(
    (acc, s) => acc + (s.severity === 'critical' ? 20 : s.severity === 'high' ? 12 : 5),
    0
  );

  const structuralHealthScore = Math.max(0, Math.min(100, Math.round(100 - (cyclePenalty + spofPenalty))));

  let overallRiskLevel: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (criticalRisksCount > 0 || structuralHealthScore < 60) {
    overallRiskLevel = 'critical';
  } else if (cycles.length > 0 || spofs.length > 0 || structuralHealthScore < 80) {
    overallRiskLevel = 'warning';
  }

  // Generate prioritized recommendations
  const recommendations: string[] = [];
  if (cycles.length > 0) {
    recommendations.push(
      `Break ${cycles.length} circular dependency loop(s). Prioritize ${cycles.filter((c) => c.isSynchronous).length} synchronous cycle(s) to avoid distributed deadlocks.`
    );
  }
  if (spofs.length > 0) {
    const criticalSpofs = spofs.filter((s) => s.severity === 'critical');
    if (criticalSpofs.length > 0) {
      recommendations.push(
        `Eliminate ${criticalSpofs.length} critical Single Point(s) of Failure: ${criticalSpofs.map((s) => s.targetName).join(', ')}.`
      );
    } else {
      recommendations.push(
        `Configure redundancy or fallback paths for ${spofs.length} identified Single Point(s) of Failure.`
      );
    }
  }
  if (articulationPoints.size > 0) {
    recommendations.push(
      `Review ${articulationPoints.size} articulation point bridge node(s) that disconnect network partitions upon failure.`
    );
  }
  if (recommendations.length === 0) {
    recommendations.push('Architecture has zero circular dependencies and zero unmitigated SPOFs.');
  }

  return {
    architectureId: model.architecture.id,
    cycles,
    spofs,
    metrics: {
      totalNodes,
      totalConnections,
      cycleCount: cycles.length,
      spofCount: spofs.length,
      articulationPointCount: articulationPoints.size,
      maxFanIn,
      criticalRisksCount,
      structuralHealthScore,
      overallRiskLevel,
    },
    recommendations,
    analyzedAt: new Date().toISOString(),
  };
}
