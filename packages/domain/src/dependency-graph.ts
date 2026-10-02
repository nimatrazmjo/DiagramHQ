/**
 * Architecture Dependency Graph & Path Analysis Engine (F087)
 *
 * Strict Acceptance Criteria:
 * - Dedicated graph; filters: direct/indirect/runtime/compile-time/data/external
 * - Test: cyclic dependency detected; indirect path found.
 */

import { type ArchitectureId, type ObjectId, type ConnectionId } from './ids';
import type { ModelObject, ModelConnection, ArchitectureModel } from './types';

// ============================================================================
// Types
// ============================================================================

export type DependencyCategory = 'runtime' | 'compile-time' | 'data' | 'external';
export type DependencyTypeFilter = 'all' | 'direct' | 'indirect';
export type DependencyCategoryFilter = 'all' | DependencyCategory;

export interface DependencyFilterOptions {
  type?: DependencyTypeFilter; // 'all' | 'direct' | 'indirect'
  category?: DependencyCategoryFilter; // 'all' | 'runtime' | 'compile-time' | 'data' | 'external'
  selectedNodeId?: ObjectId;
}

export interface DependencyNode {
  id: ObjectId;
  name: string;
  kind: string;
  inDegree: number;
  outDegree: number;
  isExternal: boolean;
}

export interface DependencyEdge {
  id: string;
  connectionId?: ConnectionId;
  sourceObjectId: ObjectId;
  targetObjectId: ObjectId;
  sourceName: string;
  targetName: string;
  kind: string;
  type: 'direct' | 'indirect';
  category: DependencyCategory;
  hopCount: number;
  label?: string | null;
  pathNodeIds?: ObjectId[];
}

export interface DependencyCycle {
  id: string;
  nodeIds: ObjectId[];
  nodeNames: string[];
  pathDescription: string;
  length: number;
}

export interface DependencyPath {
  sourceObjectId: ObjectId;
  targetObjectId: ObjectId;
  sourceName: string;
  targetName: string;
  hopCount: number;
  isIndirect: boolean;
  nodeIds: ObjectId[];
  nodeNames: string[];
  edges: DependencyEdge[];
}

export interface DependencyGraphMetrics {
  totalNodes: number;
  directDependencyCount: number;
  indirectDependencyCount: number;
  runtimeCount: number;
  compileTimeCount: number;
  dataCount: number;
  externalCount: number;
  cycleCount: number;
  hasCycles: boolean;
}

export interface DependencyGraphReport {
  architectureId: ArchitectureId;
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  directEdges: DependencyEdge[];
  indirectEdges: DependencyEdge[];
  cycles: DependencyCycle[];
  metrics: DependencyGraphMetrics;
  analyzedAt: string;
}

// ============================================================================
// Helpers
// ============================================================================

export function inferDependencyCategory(
  conn: ModelConnection,
  sourceObj?: ModelObject,
  targetObj?: ModelObject
): DependencyCategory {
  // External
  if (
    sourceObj?.kind === 'actor' ||
    targetObj?.kind === 'actor' ||
    sourceObj?.metadata?.external === true ||
    targetObj?.metadata?.external === true
  ) {
    return 'external';
  }

  // Data
  if (conn.kind === 'data' || targetObj?.kind === 'store' || sourceObj?.kind === 'store') {
    return 'data';
  }

  // Compile-time
  if (
    conn.kind === 'dependency' ||
    conn.metadata?.dependencyType === 'compile-time' ||
    conn.metadata?.dependencyType === 'build' ||
    conn.metadata?.dependencyType === 'package'
  ) {
    return 'compile-time';
  }

  // Runtime default for sync/async RPC/API calls
  return 'runtime';
}

// ============================================================================
// Cycle Detection (DFS Back-Edge Analysis)
// ============================================================================

export function detectDependencyCycles(
  nodes: ModelObject[],
  connections: ModelConnection[]
): DependencyCycle[] {
  const objectMap = new Map<ObjectId, ModelObject>(nodes.map((n) => [n.id, n]));
  const adj = new Map<ObjectId, ObjectId[]>();

  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const conn of connections) {
    // Only consider edges where both endpoints exist
    if (adj.has(conn.sourceObjectId) && adj.has(conn.targetObjectId)) {
      adj.get(conn.sourceObjectId)!.push(conn.targetObjectId);
    }
  }

  const visited = new Set<ObjectId>();
  const inStack = new Set<ObjectId>();
  const stack: ObjectId[] = [];
  const cycles: DependencyCycle[] = [];
  const recordedCycles = new Set<string>();

  function dfs(curr: ObjectId) {
    visited.add(curr);
    inStack.add(curr);
    stack.push(curr);

    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        dfs(next);
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

            cycles.push({
              id: `cycle-${cycles.length + 1}`,
              nodeIds: cycleNodes,
              nodeNames,
              pathDescription: pathNames.join(' ➔ '),
              length: cycleNodes.length,
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

  return cycles;
}

// ============================================================================
// Path Finding (All Direct & Indirect Paths)
// ============================================================================

export function findDependencyPaths(
  model: ArchitectureModel,
  sourceId: ObjectId,
  targetId: ObjectId,
  maxHops: number = 6
): DependencyPath[] {
  const objectMap = new Map<ObjectId, ModelObject>(model.objects.map((o) => [o.id, o]));
  const sourceObj = objectMap.get(sourceId);
  const targetObj = objectMap.get(targetId);

  if (!sourceObj || !targetObj) return [];

  const adj = new Map<ObjectId, Array<{ targetId: ObjectId; conn: ModelConnection }>>();
  for (const obj of model.objects) {
    adj.set(obj.id, []);
  }

  for (const conn of model.connections) {
    if (adj.has(conn.sourceObjectId) && adj.has(conn.targetObjectId)) {
      adj.get(conn.sourceObjectId)!.push({ targetId: conn.targetObjectId, conn });
    }
  }

  const results: DependencyPath[] = [];
  const currentPath: ObjectId[] = [sourceId];
  const currentEdges: DependencyEdge[] = [];
  const visited = new Set<ObjectId>([sourceId]);

  function dfs(curr: ObjectId) {
    if (curr === targetId && currentEdges.length > 0) {
      const hopCount = currentEdges.length;
      const nodeNames = currentPath.map((id) => objectMap.get(id)?.name || id);

      results.push({
        sourceObjectId: sourceId,
        targetObjectId: targetId,
        sourceName: sourceObj!.name,
        targetName: targetObj!.name,
        hopCount,
        isIndirect: hopCount > 1,
        nodeIds: [...currentPath],
        nodeNames,
        edges: [...currentEdges],
      });
      return;
    }

    if (currentEdges.length >= maxHops) return;

    const neighbors = adj.get(curr) || [];
    for (const { targetId: next, conn } of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        currentPath.push(next);

        const edgeSrc = objectMap.get(curr);
        const edgeTgt = objectMap.get(next);
        const edgeCategory = inferDependencyCategory(conn, edgeSrc, edgeTgt);

        currentEdges.push({
          id: `edge-${conn.id}`,
          connectionId: conn.id,
          sourceObjectId: curr,
          targetObjectId: next,
          sourceName: edgeSrc?.name || curr,
          targetName: edgeTgt?.name || next,
          kind: conn.kind,
          type: 'direct',
          category: edgeCategory,
          hopCount: 1,
          label: conn.label,
        });

        dfs(next);

        currentEdges.pop();
        currentPath.pop();
        visited.delete(next);
      }
    }
  }

  dfs(sourceId);

  return results.sort((a, b) => a.hopCount - b.hopCount);
}

// ============================================================================
// Core Dependency Graph Analysis & Filtering
// ============================================================================

export function analyzeArchitectureDependencies(
  model: ArchitectureModel,
  filters?: DependencyFilterOptions
): DependencyGraphReport {
  const objectMap = new Map<ObjectId, ModelObject>(model.objects.map((o) => [o.id, o]));
  const inDegreeMap = new Map<ObjectId, number>();
  const outDegreeMap = new Map<ObjectId, number>();

  for (const obj of model.objects) {
    inDegreeMap.set(obj.id, 0);
    outDegreeMap.set(obj.id, 0);
  }

  // 1. Build Direct Edges
  const directEdges: DependencyEdge[] = [];
  let runtimeCount = 0;
  let compileTimeCount = 0;
  let dataCount = 0;
  let externalCount = 0;

  for (const conn of model.connections) {
    const src = objectMap.get(conn.sourceObjectId);
    const tgt = objectMap.get(conn.targetObjectId);

    if (src && tgt) {
      outDegreeMap.set(src.id, (outDegreeMap.get(src.id) || 0) + 1);
      inDegreeMap.set(tgt.id, (inDegreeMap.get(tgt.id) || 0) + 1);

      const category = inferDependencyCategory(conn, src, tgt);
      if (category === 'runtime') runtimeCount++;
      else if (category === 'compile-time') compileTimeCount++;
      else if (category === 'data') dataCount++;
      else if (category === 'external') externalCount++;

      directEdges.push({
        id: `direct-${conn.id}`,
        connectionId: conn.id,
        sourceObjectId: src.id,
        targetObjectId: tgt.id,
        sourceName: src.name,
        targetName: tgt.name,
        kind: conn.kind,
        type: 'direct',
        category,
        hopCount: 1,
        label: conn.label,
        pathNodeIds: [src.id, tgt.id],
      });
    }
  }

  // 2. Transitive / Indirect Edges Discovery (Hop count >= 2)
  // Compute reachability for all node pairs
  const indirectEdges: DependencyEdge[] = [];
  const directPairSet = new Set<string>(
    directEdges.map((e) => `${e.sourceObjectId}->${e.targetObjectId}`)
  );
  const indirectPairRecorded = new Set<string>();

  for (const src of model.objects) {
    for (const tgt of model.objects) {
      if (src.id === tgt.id) continue;
      const pairKey = `${src.id}->${tgt.id}`;
      if (directPairSet.has(pairKey)) continue; // Already direct

      if (!indirectPairRecorded.has(pairKey)) {
        const paths = findDependencyPaths(model, src.id, tgt.id, 4);
        const shortestPath = paths[0];
        if (shortestPath && shortestPath.isIndirect) {
          indirectPairRecorded.add(pairKey);

          // Infer indirect category: if any hop is data -> data, if compile-time -> compile-time, else runtime
          const hasData = shortestPath.edges.some((e) => e.category === 'data');
          const hasExternal = shortestPath.edges.some((e) => e.category === 'external');
          const hasCompile = shortestPath.edges.some((e) => e.category === 'compile-time');

          const indirectCategory: DependencyCategory = hasExternal
            ? 'external'
            : hasData
              ? 'data'
              : hasCompile
                ? 'compile-time'
                : 'runtime';

          indirectEdges.push({
            id: `indirect-${src.id}-${tgt.id}`,
            sourceObjectId: src.id,
            targetObjectId: tgt.id,
            sourceName: src.name,
            targetName: tgt.name,
            kind: 'indirect',
            type: 'indirect',
            category: indirectCategory,
            hopCount: shortestPath.hopCount,
            label: `Indirect via ${shortestPath.hopCount} hops (${shortestPath.nodeNames.slice(1, -1).join(', ')})`,
            pathNodeIds: shortestPath.nodeIds,
          });
        }
      }
    }
  }

  // 3. Cycle Detection
  const cycles = detectDependencyCycles(model.objects, model.connections);

  // 4. Construct Nodes List
  const nodes: DependencyNode[] = model.objects.map((obj) => ({
    id: obj.id,
    name: obj.name,
    kind: obj.kind,
    inDegree: inDegreeMap.get(obj.id) || 0,
    outDegree: outDegreeMap.get(obj.id) || 0,
    isExternal: obj.kind === 'actor' || obj.metadata?.external === true,
  }));

  // 5. Apply Active Filters
  let edgesToInclude = [...directEdges, ...indirectEdges];

  if (filters?.type === 'direct') {
    edgesToInclude = edgesToInclude.filter((e) => e.type === 'direct');
  } else if (filters?.type === 'indirect') {
    edgesToInclude = edgesToInclude.filter((e) => e.type === 'indirect');
  }

  if (filters?.category && filters.category !== 'all') {
    edgesToInclude = edgesToInclude.filter((e) => e.category === filters.category);
  }

  if (filters?.selectedNodeId) {
    const selectedId = filters.selectedNodeId;
    edgesToInclude = edgesToInclude.filter(
      (e) => e.sourceObjectId === selectedId || e.targetObjectId === selectedId
    );
  }

  const metrics: DependencyGraphMetrics = {
    totalNodes: nodes.length,
    directDependencyCount: directEdges.length,
    indirectDependencyCount: indirectEdges.length,
    runtimeCount,
    compileTimeCount,
    dataCount,
    externalCount,
    cycleCount: cycles.length,
    hasCycles: cycles.length > 0,
  };

  return {
    architectureId: model.architecture.id,
    nodes,
    edges: edgesToInclude,
    directEdges,
    indirectEdges,
    cycles,
    metrics,
    analyzedAt: new Date().toISOString(),
  };
}
