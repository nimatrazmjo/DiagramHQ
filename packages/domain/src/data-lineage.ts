/**
 * Data Lineage Tracing & Compliance Engine (F091)
 *
 * Strict Acceptance Criteria:
 * - End-to-end trace from source of truth to consumption
 * - Highlight compliance zones (PII / PCI) along the path
 * - Test: trace renders across 4+ hops; compliance boundary crossings flagged.
 */

import { type ArchitectureId, type ObjectId, type ConnectionId } from './ids';
import type { ModelObject, ModelConnection, ArchitectureModel } from './types';
import { type ComplianceStandard } from './security-architecture';

// ============================================================================
// Types
// ============================================================================

export type LineageDirection = 'downstream' | 'upstream' | 'both';

export interface LineageBoundaryCrossing {
  fromNodeId: ObjectId;
  fromNodeName: string;
  fromZone: string;
  toNodeId: ObjectId;
  toNodeName: string;
  toZone: string;
  complianceStandards: ComplianceStandard[];
  hasInTransitEncryption: boolean;
  isCompliant: boolean;
  warning?: string;
}

export interface LineageHop {
  hopIndex: number;
  nodeId: ObjectId;
  nodeName: string;
  nodeKind: string;
  complianceZones: ComplianceStandard[];
  dataClassification?: string;
  transformation?: string;
  connectionId?: ConnectionId;
  connectionLabel?: string;
  isBoundaryCrossing: boolean;
  boundaryCrossing?: LineageBoundaryCrossing;
}

export interface LineagePath {
  pathId: string;
  sourceNodeId: ObjectId;
  sourceNodeName: string;
  targetNodeId: ObjectId;
  targetNodeName: string;
  targetKind: string;
  hops: LineageHop[];
  totalHops: number;
  complianceZones: ComplianceStandard[];
  boundaryCrossings: LineageBoundaryCrossing[];
  hasComplianceViolation: boolean;
}

export interface DataLineageMetrics {
  totalPaths: number;
  maxHopsReached: number;
  uniqueNodesReached: number;
  consumerCount: number;
  complianceZoneCounts: Record<ComplianceStandard, number>;
  boundaryCrossingCount: number;
  nonCompliantCrossingCount: number;
  isFullyEncryptedInTransit: boolean;
}

export interface DataLineageReport {
  architectureId: ArchitectureId;
  sourceNodeId: ObjectId;
  sourceNodeName: string;
  sourceKind: string;
  sourceComplianceZones: ComplianceStandard[];
  paths: LineagePath[];
  uniqueNodes: LineageHop[];
  boundaryCrossings: LineageBoundaryCrossing[];
  metrics: DataLineageMetrics;
  tracedAt: string;
}

export interface LineageTraceOptions {
  direction?: LineageDirection;
  maxHops?: number;
  requireActiveDataFlow?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const SENSITIVE_KEYWORDS: Record<ComplianceStandard, string[]> = {
  PII: ['pii', 'user_data', 'profile', 'ssn', 'email', 'personal', 'identity'],
  PCI: ['pci', 'card', 'payment', 'credit_card', 'cvv', 'billing', 'pan'],
  HIPAA: ['hipaa', 'phi', 'health', 'medical', 'patient', 'diagnosis', 'ehr'],
  GDPR: ['gdpr', 'consent', 'eu_data', 'cookie'],
  SOC2: ['soc2', 'audit', 'confidential'],
};

function extractComplianceZones(obj: ModelObject): ComplianceStandard[] {
  const standards: ComplianceStandard[] = [];
  const meta = obj.metadata || {};

  if (meta.pii === true) standards.push('PII');
  if (meta.pci === true) standards.push('PCI');
  if (meta.hipaa === true) standards.push('HIPAA');
  if (meta.gdpr === true) standards.push('GDPR');
  if (meta.soc2 === true) standards.push('SOC2');

  if (Array.isArray(meta.compliance)) {
    for (const c of meta.compliance) {
      const upper = String(c).toUpperCase();
      if (['PII', 'PCI', 'HIPAA', 'GDPR', 'SOC2'].includes(upper)) {
        if (!standards.includes(upper as ComplianceStandard)) {
          standards.push(upper as ComplianceStandard);
        }
      }
    }
  }

  const tags: string[] = [
    ...(Array.isArray(meta.tags) ? meta.tags.map(String) : []),
    ...(meta.dataClassification ? [String(meta.dataClassification)] : []),
    obj.name.toLowerCase(),
  ];

  for (const [standard, keywords] of Object.entries(SENSITIVE_KEYWORDS)) {
    if (standards.includes(standard as ComplianceStandard)) continue;
    const match = tags.some((tag) =>
      keywords.some((kw) => tag.toLowerCase().includes(kw))
    );
    if (match) {
      standards.push(standard as ComplianceStandard);
    }
  }

  return standards;
}

function resolveZoneName(obj: ModelObject): string {
  const meta = obj.metadata || {};
  if (meta.trustZone || meta.boundary || meta.zone || meta.vpc) {
    return String(meta.trustZone || meta.boundary || meta.zone || meta.vpc);
  }
  if (obj.kind === 'actor') return 'Public Internet';
  if (obj.kind === 'store') return 'Data Tier';
  return 'Internal Network';
}

function isTlsEncrypted(conn: ModelConnection): boolean {
  const meta = conn.metadata || {};
  if (meta.tls === true || meta.ssl === true || meta.encrypted === true) return true;
  const label = (conn.label || '').toLowerCase();
  return (
    label.includes('https') ||
    label.includes('tls') ||
    label.includes('ssl') ||
    label.includes('wss') ||
    label.includes('grpc-tls')
  );
}

// ============================================================================
// Core Traversal
// ============================================================================

interface DirectedEdge {
  connectionId: ConnectionId;
  sourceId: ObjectId;
  targetId: ObjectId;
  label?: string;
  connection: ModelConnection;
}

/**
 * Build directed data flow graph.
 * Handles both explicit data flows (A -> B) and query patterns (Service -> Store where Store feeds Service).
 */
function buildDataFlowAdjacency(
  model: ArchitectureModel
): Map<ObjectId, DirectedEdge[]> {
  const adj = new Map<ObjectId, DirectedEdge[]>();

  const addEdge = (src: ObjectId, tgt: ObjectId, conn: ModelConnection) => {
    if (!adj.has(src)) adj.set(src, []);
    adj.get(src)!.push({
      connectionId: conn.id,
      sourceId: src,
      targetId: tgt,
      label: conn.label || undefined,
      connection: conn,
    });
  };

  const objectMap = new Map(model.objects.map((o) => [o.id, o]));

  for (const conn of model.connections) {
    const srcObj = objectMap.get(conn.sourceObjectId);
    const tgtObj = objectMap.get(conn.targetObjectId);
    if (!srcObj || !tgtObj) continue;

    // Direct forward flow
    addEdge(conn.sourceObjectId, conn.targetObjectId, conn);

    // If target is store and connection is read/query, data also flows store -> service
    if (tgtObj.kind === 'store') {
      const label = (conn.label || '').toLowerCase();
      const meta = conn.metadata || {};
      const isRead =
        label.includes('read') ||
        label.includes('query') ||
        label.includes('fetch') ||
        label.includes('get') ||
        label.includes('select') ||
        meta.operation === 'read' ||
        meta.mode === 'pull';

      if (isRead) {
        addEdge(conn.targetObjectId, conn.sourceObjectId, conn);
      }
    }
  }

  return adj;
}

/**
 * Trace end-to-end data lineage from a given source node (e.g. database or service).
 * Discovers consumption paths, multi-hop reachability across 4+ hops, and flags compliance boundary crossings.
 */
export function traceDataLineage(
  model: ArchitectureModel,
  sourceNodeId: ObjectId,
  options?: LineageTraceOptions
): DataLineageReport {
  const maxHops = options?.maxHops ?? 10;
  const objectMap = new Map<ObjectId, ModelObject>(model.objects.map((o) => [o.id, o]));
  const sourceObj = objectMap.get(sourceNodeId);

  if (!sourceObj) {
    throw new Error(`Source object with ID '${sourceNodeId}' not found in architecture.`);
  }
  const source = sourceObj;

  const sourceComplianceZones = extractComplianceZones(source);

  const adj = buildDataFlowAdjacency(model);

  // DFS Path Enumeration with loop prevention
  const allPaths: LineagePath[] = [];
  const allCrossings: LineageBoundaryCrossing[] = [];
  const uniqueHopMap = new Map<ObjectId, LineageHop>();

  // Add source node at hop 0
  uniqueHopMap.set(sourceObj.id, {
    hopIndex: 0,
    nodeId: sourceObj.id,
    nodeName: sourceObj.name,
    nodeKind: sourceObj.kind,
    complianceZones: sourceComplianceZones,
    dataClassification: sourceObj.metadata?.dataClassification as string | undefined,
    isBoundaryCrossing: false,
  });

  function dfs(
    currentId: ObjectId,
    visitedInPath: Set<ObjectId>,
    currentHops: LineageHop[],
    currentCrossings: LineageBoundaryCrossing[],
    currentCompliance: Set<ComplianceStandard>
  ) {
    const edges = adj.get(currentId) || [];
    const currentObj = objectMap.get(currentId)!;
    const currentZone = resolveZoneName(currentObj);

    let hasExpanded = false;

    if (currentHops.length <= maxHops) {
      for (const edge of edges) {
        const nextId = edge.targetId;
        if (visitedInPath.has(nextId)) continue; // avoid cycles

        const nextObj = objectMap.get(nextId);
        if (!nextObj) continue;

        hasExpanded = true;
        const nextZone = resolveZoneName(nextObj);
        const nextCompliance = extractComplianceZones(nextObj);
        const hasTls = isTlsEncrypted(edge.connection);

        // Detect boundary crossing
        const isCrossing = currentZone !== nextZone;
        let boundaryCrossing: LineageBoundaryCrossing | undefined;

        if (isCrossing) {
          const combinedStandards = Array.from(
            new Set([...Array.from(currentCompliance), ...nextCompliance])
          );
          const isCompliant = hasTls;
          const warning = !hasTls
            ? `Data crossing from '${currentZone}' to '${nextZone}' without in-transit encryption (missing TLS/HTTPS).`
            : undefined;

          boundaryCrossing = {
            fromNodeId: currentId,
            fromNodeName: currentObj.name,
            fromZone: currentZone,
            toNodeId: nextId,
            toNodeName: nextObj.name,
            toZone: nextZone,
            complianceStandards: combinedStandards,
            hasInTransitEncryption: hasTls,
            isCompliant,
            warning,
          };

          allCrossings.push(boundaryCrossing);
          currentCrossings.push(boundaryCrossing);
        }

        const nextHop: LineageHop = {
          hopIndex: currentHops.length,
          nodeId: nextId,
          nodeName: nextObj.name,
          nodeKind: nextObj.kind,
          complianceZones: nextCompliance,
          dataClassification: nextObj.metadata?.dataClassification as string | undefined,
          transformation: edge.connection.metadata?.transformation as string | undefined,
          connectionId: edge.connectionId,
          connectionLabel: edge.label,
          isBoundaryCrossing: isCrossing,
          boundaryCrossing,
        };

        if (
          !uniqueHopMap.has(nextId) ||
          uniqueHopMap.get(nextId)!.hopIndex > nextHop.hopIndex
        ) {
          uniqueHopMap.set(nextId, nextHop);
        }

        const updatedVisited = new Set(visitedInPath).add(nextId);
        const updatedCompliance = new Set([
          ...Array.from(currentCompliance),
          ...nextCompliance,
        ]);

        dfs(
          nextId,
          updatedVisited,
          [...currentHops, nextHop],
          [...currentCrossings],
          updatedCompliance
        );
      }
    }

    // Leaf node reached or maxHops reached (and at least 1 hop traversed)
    if (!hasExpanded && currentHops.length > 1) {
      const targetHop = currentHops[currentHops.length - 1]!;
      const hasViolation = currentCrossings.some((c) => !c.isCompliant);

      allPaths.push({
        pathId: `lineage-path-${source.id}-${targetHop.nodeId}-${allPaths.length + 1}`,
        sourceNodeId: source.id,
        sourceNodeName: source.name,
        targetNodeId: targetHop.nodeId,
        targetNodeName: targetHop.nodeName,
        targetKind: targetHop.nodeKind,
        hops: currentHops,
        totalHops: currentHops.length - 1,
        complianceZones: Array.from(currentCompliance),
        boundaryCrossings: currentCrossings,
        hasComplianceViolation: hasViolation,
      });
    }
  }

  // Start traversal
  const initialHop: LineageHop = {
    hopIndex: 0,
    nodeId: source.id,
    nodeName: source.name,
    nodeKind: source.kind,
    complianceZones: sourceComplianceZones,
    dataClassification: source.metadata?.dataClassification as string | undefined,
    isBoundaryCrossing: false,
  };

  dfs(
    source.id,
    new Set([source.id]),
    [initialHop],
    [],
    new Set(sourceComplianceZones)
  );


  // Compute Metrics
  const complianceZoneCounts: Record<ComplianceStandard, number> = {
    PII: 0,
    PCI: 0,
    HIPAA: 0,
    GDPR: 0,
    SOC2: 0,
  };

  for (const hop of uniqueHopMap.values()) {
    for (const std of hop.complianceZones) {
      complianceZoneCounts[std] = (complianceZoneCounts[std] || 0) + 1;
    }
  }

  const maxHopsReached = allPaths.reduce(
    (max, p) => Math.max(max, p.totalHops),
    0
  );

  const nonCompliantCrossings = allCrossings.filter((c) => !c.isCompliant);

  const metrics: DataLineageMetrics = {
    totalPaths: allPaths.length,
    maxHopsReached,
    uniqueNodesReached: uniqueHopMap.size,
    consumerCount: allPaths.length,
    complianceZoneCounts,
    boundaryCrossingCount: allCrossings.length,
    nonCompliantCrossingCount: nonCompliantCrossings.length,
    isFullyEncryptedInTransit: nonCompliantCrossings.length === 0,
  };

  return {
    architectureId: model.architecture.id,
    sourceNodeId: source.id,
    sourceNodeName: source.name,
    sourceKind: source.kind,
    sourceComplianceZones,

    paths: allPaths,
    uniqueNodes: Array.from(uniqueHopMap.values()),
    boundaryCrossings: allCrossings,
    metrics,
    tracedAt: new Date().toISOString(),
  };
}
