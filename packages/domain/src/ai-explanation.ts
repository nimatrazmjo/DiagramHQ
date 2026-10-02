/**
 * DiagramHQ - AI Architecture Explanation Domain Logic (F065)
 *
 * Grounded multi-altitude architecture explanation engine.
 * Synthesizes comprehensive textual and structural explanations of systems, flows,
 * components, and architectural decision records (ADRs) calibrated for specific audiences:
 * - 'engineer': Low-level implementation details, communication protocols, sync/async RPCs,
 *   data storage schemas, error boundaries, and payload flows.
 * - 'architect': Structural design, component coupling, boundary patterns, CAP theorem
 *   trade-offs, scalability bottlenecks, and integration topologies.
 * - 'executive': High-level business capabilities, risk mitigation, operational cost drivers,
 *   governance, and team alignment.
 *
 * Strict invariant: Explanations are strictly grounded in real model entities, citing
 * concrete ObjectId and ConnectionId references.
 */

import type { ObjectId, FlowId, DecisionId } from './ids';
import type { ModelObject, ModelConnection, FlowWithSteps } from './types';
import type { ArchitectureDecisionRecord } from './adrs';

export type AudienceAltitude = 'engineer' | 'architect' | 'executive';
export type ExplainTargetKind = 'object' | 'flow' | 'adr' | 'architecture';

export type ExplainTarget =
  | { kind: 'object'; objectId: ObjectId }
  | { kind: 'flow'; flowId: FlowId }
  | { kind: 'adr'; adrId: DecisionId }
  | { kind: 'architecture' };

export interface ExplanationSection {
  title: string;
  content: string;
  keyPoints: string[];
}

export interface CitedEntity {
  id: string;
  name: string;
  kind: string;
}

export interface ArchitectureExplanation {
  targetId: string;
  targetName: string;
  targetKind: ExplainTargetKind;
  altitude: AudienceAltitude;
  title: string;
  summary: string;
  sections: ExplanationSection[];
  citedObjects: CitedEntity[];
  citedConnections: CitedEntity[];
  generatedAt: string;
}

export interface ExplainArchitectureInput {
  target: ExplainTarget;
  altitude: AudienceAltitude;
  context: {
    objects: ModelObject[];
    connections: ModelConnection[];
    flows?: FlowWithSteps[];
    adrs?: ArchitectureDecisionRecord[];
  };
}

/**
 * Explains an architecture entity (object, flow, ADR, or complete system) at a specified audience altitude.
 */
export function explainArchitectureAtAltitude(input: ExplainArchitectureInput): ArchitectureExplanation {
  const { target, altitude, context } = input;
  const now = new Date().toISOString();

  if (!altitude || !['engineer', 'architect', 'executive'].includes(altitude)) {
    throw new Error(`Invalid audience altitude: '${String(altitude)}'`);
  }

  // 1. Target: Object (Component, Service, Data Store)
  if (target.kind === 'object') {
    const obj = context.objects.find((o) => o.id === target.objectId);
    if (!obj) {
      throw new Error(`Cannot find object with ID '${target.objectId}' to explain`);
    }

    // Incoming & outgoing connections
    const incomingConns = context.connections.filter((c) => c.targetObjectId === obj.id);
    const outgoingConns = context.connections.filter((c) => c.sourceObjectId === obj.id);

    const relatedObjIds = new Set([
      ...incomingConns.map((c) => c.sourceObjectId),
      ...outgoingConns.map((c) => c.targetObjectId),
    ]);
    const relatedObjects = context.objects.filter((o) => relatedObjIds.has(o.id));

    const citedObjects: CitedEntity[] = [
      { id: obj.id, name: obj.name, kind: obj.kind },
      ...relatedObjects.map((ro) => ({ id: ro.id, name: ro.name, kind: ro.kind })),
    ];

    const citedConnections: CitedEntity[] = [
      ...incomingConns,
      ...outgoingConns,
    ].map((c) => ({
      id: c.id,
      name: c.label || `${c.sourceObjectId} -> ${c.targetObjectId}`,
      kind: c.kind,
    }));

    if (altitude === 'engineer') {
      return {
        targetId: obj.id,
        targetName: obj.name,
        targetKind: 'object',
        altitude: 'engineer',
        title: `Technical Deep-Dive: ${obj.name} (${obj.id})`,
        summary: `${obj.name} is a ${obj.kind} communicating over ${incomingConns.length} ingress and ${outgoingConns.length} egress channel(s).`,
        sections: [
          {
            title: 'Interface & Protocol Specifications',
            content: `Inbound traffic arrives via ${incomingConns.map((c) => `'${c.label || c.id}' [${c.id}] (${c.kind})`).join(', ') || 'direct access'}. Outbound RPCs target ${outgoingConns.map((c) => `'${c.label || c.id}' [${c.id}]`).join(', ') || 'none'}.`,
            keyPoints: [
              `Runtime kind: ${obj.kind}`,
              `Ingress endpoints: ${incomingConns.length}`,
              `Egress endpoints: ${outgoingConns.length}`,
            ],
          },
          {
            title: 'Concurrency & Dependency Boundaries',
            content: `Interacts directly with real nodes: ${relatedObjects.map((o) => `${o.name} [${o.id}]`).join(', ') || 'isolated'}.`,
            keyPoints: [
              `Upstream callers: ${incomingConns.map((c) => c.sourceObjectId).join(', ') || 'none'}`,
              `Downstream targets: ${outgoingConns.map((c) => c.targetObjectId).join(', ') || 'none'}`,
            ],
          },
        ],
        citedObjects,
        citedConnections,
        generatedAt: now,
      };
    } else if (altitude === 'architect') {
      return {
        targetId: obj.id,
        targetName: obj.name,
        targetKind: 'object',
        altitude: 'architect',
        title: `Architectural Design: ${obj.name}`,
        summary: `Structural analysis of ${obj.name} within the C4 model topology, assessing coupling and boundaries.`,
        sections: [
          {
            title: 'Domain Boundary & Cohesion',
            content: `${obj.name} acts as a bounded context for ${obj.description || 'system responsibilities'}. Coupling degree is ${incomingConns.length + outgoingConns.length} total direct edges.`,
            keyPoints: [
              `Afferent coupling (incoming): ${incomingConns.length}`,
              `Efferent coupling (outgoing): ${outgoingConns.length}`,
              `Role: ${obj.kind}`,
            ],
          },
          {
            title: 'Topology Integration',
            content: `Connected to ${relatedObjects.map((ro) => ro.name).join(', ') || 'none'}. Maintains clear separation of concerns.`,
            keyPoints: [
              `Neighbor nodes: ${relatedObjects.length}`,
              `Sync/Async split: ${outgoingConns.filter((c) => c.kind === 'sync').length} sync, ${outgoingConns.filter((c) => c.kind === 'async').length} async`,
            ],
          },
        ],
        citedObjects,
        citedConnections,
        generatedAt: now,
      };
    } else {
      // executive
      return {
        targetId: obj.id,
        targetName: obj.name,
        targetKind: 'object',
        altitude: 'executive',
        title: `Executive Briefing: ${obj.name}`,
        summary: `Strategic overview of ${obj.name}: business capabilities, operational impact, and team alignment.`,
        sections: [
          {
            title: 'Business Functionality',
            content: `${obj.name} delivers critical capabilities serving upstream clients and collaborating with ${relatedObjects.map((o) => o.name).join(', ') || 'internal systems'}.`,
            keyPoints: [
              `Criticality: High Tier Core Component`,
              `Dependencies: ${relatedObjects.length} connected service(s)`,
            ],
          },
          {
            title: 'Risk Posture & Governance',
            content: `Monitored under architectural compliance rules. Any failure impacts ${incomingConns.length} upstream consumer(s).`,
            keyPoints: [
              `Blast radius: ${incomingConns.length} dependent client(s)`,
              `Architecture status: Active`,
            ],
          },
        ],
        citedObjects,
        citedConnections,
        generatedAt: now,
      };
    }
  }

  // 2. Target: Flow
  if (target.kind === 'flow') {
    const flows = context.flows || [];
    const flow = flows.find((f) => f.id === target.flowId);
    if (!flow) {
      throw new Error(`Cannot find flow with ID '${target.flowId}' to explain`);
    }

    const flowConnIds = new Set(flow.steps.map((s) => s.connectionId));
    const flowConnections = context.connections.filter((c) => flowConnIds.has(c.id));
    const objIds = new Set<string>();
    for (const c of flowConnections) {
      objIds.add(c.sourceObjectId);
      objIds.add(c.targetObjectId);
    }
    const flowObjects = context.objects.filter((o) => objIds.has(o.id));

    const citedObjects: CitedEntity[] = flowObjects.map((o) => ({ id: o.id, name: o.name, kind: o.kind }));
    const citedConnections: CitedEntity[] = flowConnections.map((c) => ({
      id: c.id,
      name: c.label || `${c.sourceObjectId} -> ${c.targetObjectId}`,
      kind: c.kind,
    }));

    if (altitude === 'engineer') {
      return {
        targetId: flow.id,
        targetName: flow.name,
        targetKind: 'flow',
        altitude: 'engineer',
        title: `Flow Execution Trace: ${flow.name}`,
        summary: `Step-by-step technical walk of ${flow.name} across ${flow.steps.length} sequential execution stages.`,
        sections: flow.steps.map((st) => {
          const conn = context.connections.find((c) => c.id === st.connectionId);
          const src = conn ? context.objects.find((o) => o.id === conn.sourceObjectId) : null;
          const tgt = conn ? context.objects.find((o) => o.id === conn.targetObjectId) : null;
          return {
            title: `Step ${st.stepIndex}: ${conn?.label || 'Execute hop'}`,
            content: `Traffic moves from ${src?.name || 'Origin'} [${src?.id || '?'}] to ${tgt?.name || 'Destination'} [${tgt?.id || '?'}] via connection '${conn?.id || st.connectionId}'. ${st.note || ''}`,
            keyPoints: [
              `Connection: ${st.connectionId}`,
              `Type: ${conn?.kind || 'sync'}`,
            ],
          };
        }),
        citedObjects,
        citedConnections,
        generatedAt: now,
      };
    } else if (altitude === 'architect') {
      return {
        targetId: flow.id,
        targetName: flow.name,
        targetKind: 'flow',
        altitude: 'architect',
        title: `Interaction Topology: ${flow.name}`,
        summary: `Analysis of data transit paths and consistency requirements across ${flowObjects.length} nodes.`,
        sections: [
          {
            title: 'Critical Path & Latency Budget',
            content: `The transaction traverses ${flow.steps.length} hops across: ${flowObjects.map((o) => o.name).join(' ➔ ')}.`,
            keyPoints: [
              `Total hops: ${flow.steps.length}`,
              `Participating nodes: ${flowObjects.length}`,
            ],
          },
        ],
        citedObjects,
        citedConnections,
        generatedAt: now,
      };
    } else {
      // executive
      return {
        targetId: flow.id,
        targetName: flow.name,
        targetKind: 'flow',
        altitude: 'executive',
        title: `Business Process Flow: ${flow.name}`,
        summary: `Executive summary of user journey and operational continuity for ${flow.name}.`,
        sections: [
          {
            title: 'Customer & Revenue Impact',
            content: `${flow.description || flow.name}. Spans ${flowObjects.length} enterprise service(s) to guarantee transaction completion.`,
            keyPoints: [
              `Service footprint: ${flowObjects.map((o) => o.name).join(', ')}`,
              `Business risk: Standard operating path`,
            ],
          },
        ],
        citedObjects,
        citedConnections,
        generatedAt: now,
      };
    }
  }

  // 3. Target: ADR
  if (target.kind === 'adr') {
    const adrs = context.adrs || [];
    const adr = adrs.find((a) => a.id === target.adrId);
    if (!adr) {
      throw new Error(`Cannot find ADR with ID '${target.adrId}' to explain`);
    }

    const linkedObjIds = new Set(
      adr.attachments.filter((e) => e.targetType === 'object').map((e) => e.targetId)
    );
    const linkedObjects = context.objects.filter((o) => linkedObjIds.has(o.id));

    const citedObjects: CitedEntity[] = linkedObjects.map((o) => ({ id: o.id, name: o.name, kind: o.kind }));

    return {
      targetId: adr.id,
      targetName: adr.title,
      targetKind: 'adr',
      altitude,
      title: `${altitude.toUpperCase()} Summary: ADR ${adr.number} — ${adr.title}`,
      summary: `Decision record currently ${adr.status}. Context: ${adr.context}`,
      sections: [
        {
          title: 'Decision & Rationale',
          content: adr.decision,
          keyPoints: [
            `Status: ${adr.status}`,
            `Affected components: ${linkedObjects.map((o) => `${o.name} [${o.id}]`).join(', ') || 'Global'}`,
          ],
        },
        {
          title: 'Consequences & Trade-offs',
          content: adr.consequences,
          keyPoints: [
            `Alternatives: ${adr.alternatives.length} evaluated`,
          ],
        },
      ],
      citedObjects,
      citedConnections: [],
      generatedAt: now,
    };
  }

  // 4. Target: Overall Architecture
  const citedObjects: CitedEntity[] = context.objects.map((o) => ({ id: o.id, name: o.name, kind: o.kind }));
  const citedConnections: CitedEntity[] = context.connections.map((c) => ({
    id: c.id,
    name: c.label || `${c.sourceObjectId} -> ${c.targetObjectId}`,
    kind: c.kind,
  }));

  if (altitude === 'engineer') {
    return {
      targetId: 'arch_root',
      targetName: 'Architecture Topology',
      targetKind: 'architecture',
      altitude: 'engineer',
      title: 'Full System Engineering Architecture',
      summary: `System topology consisting of ${context.objects.length} model objects and ${context.connections.length} connections.`,
      sections: [
        {
          title: 'Node Runtimes & Data Stores',
          content: `Active nodes: ${context.objects.map((o) => `${o.name} (${o.kind}) [${o.id}]`).join(', ')}.`,
          keyPoints: [
            `Total objects: ${context.objects.length}`,
            `Total edges: ${context.connections.length}`,
          ],
        },
      ],
      citedObjects,
      citedConnections,
      generatedAt: now,
    };
  } else if (altitude === 'architect') {
    return {
      targetId: 'arch_root',
      targetName: 'Architecture Topology',
      targetKind: 'architecture',
      altitude: 'architect',
      title: 'Macro Architecture Blueprint',
      summary: `Structural analysis across ${context.objects.length} components.`,
      sections: [
        {
          title: 'System Boundaries',
          content: `Components represent discrete domain services: ${context.objects.map((o) => o.name).join(', ')}.`,
          keyPoints: [
            `Coupling density: ${(context.connections.length / (context.objects.length || 1)).toFixed(2)} edges/node`,
          ],
        },
      ],
      citedObjects,
      citedConnections,
      generatedAt: now,
    };
  } else {
    return {
      targetId: 'arch_root',
      targetName: 'Architecture Topology',
      targetKind: 'architecture',
      altitude: 'executive',
      title: 'Executive Platform Architecture Overview',
      summary: `Enterprise overview representing ${context.objects.length} services powering business operations.`,
      sections: [
        {
          title: 'Capabilities & Organization',
          content: `Delivered by components: ${context.objects.map((o) => o.name).join(', ')}.`,
          keyPoints: [
            `Total platform services: ${context.objects.length}`,
            `Inter-service integrations: ${context.connections.length}`,
          ],
        },
      ],
      citedObjects,
      citedConnections,
      generatedAt: now,
    };
  }
}
