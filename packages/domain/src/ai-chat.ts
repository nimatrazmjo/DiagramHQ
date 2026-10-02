/**
 * DiagramHQ - AI Architecture Copilot Domain Logic (F062)
 *
 * Pure, framework-agnostic AI Copilot grounded Q&A engine.
 * Provides:
 * - Persistent grounded Q&A over the architecture model
 * - Automatic citation of concrete ObjectIds and ConnectionIds
 * - Deep dependency rationale resolution ("why does X depend on Y?")
 * - Transitive dependency path discovery via graph traversal
 */

import {
  createId,
  type MessageId,
  type ObjectId,
} from './ids';
import type { ModelObject, ModelConnection, FlowWithSteps } from './types';
import type { ArchitectureDecisionRecord } from './adrs';

export type CitationKind = 'object' | 'connection' | 'flow' | 'adr';

export interface ModelCitation {
  kind: CitationKind;
  id: string;
  name: string;
  label?: string | null;
  description?: string | null;
}

export type AIChatRole = 'user' | 'assistant' | 'system';

export interface AIChatMessage {
  id: MessageId;
  role: AIChatRole;
  content: string;
  citations: ModelCitation[];
  timestamp: string;
}

export interface ArchitectureGroundedContext {
  objects: ModelObject[];
  connections: ModelConnection[];
  flows?: FlowWithSteps[];
  adrs?: ArchitectureDecisionRecord[];
}

export interface DependencyRationaleResult {
  sourceObjectId: ObjectId;
  targetObjectId: ObjectId;
  sourceObjectName: string;
  targetObjectName: string;
  direct: boolean;
  connection: ModelConnection | null;
  transitivePath?: Array<{
    object: ModelObject;
    connection: ModelConnection;
  }>;
  explanation: string;
  citations: ModelCitation[];
}

/**
 * Resolves architectural dependency rationale between two entities.
 * Cites the concrete connection(s) and explains direct or transitive relationships.
 */
export function resolveDependencyRationale(
  sourceObjectId: ObjectId,
  targetObjectId: ObjectId,
  context: ArchitectureGroundedContext
): DependencyRationaleResult {
  const sourceObj = context.objects.find((o) => o.id === sourceObjectId);
  const targetObj = context.objects.find((o) => o.id === targetObjectId);

  const sourceName = sourceObj?.name || (sourceObjectId as string);
  const targetName = targetObj?.name || (targetObjectId as string);

  if (!sourceObj || !targetObj) {
    return {
      sourceObjectId,
      targetObjectId,
      sourceObjectName: sourceName,
      targetObjectName: targetName,
      direct: false,
      connection: null,
      explanation: `Cannot resolve dependency: one or both entities (${sourceObjectId}, ${targetObjectId}) do not exist in the active architecture model.`,
      citations: [],
    };
  }

  // 1. Check for direct connection from source to target
  const directConn = context.connections.find(
    (c) => c.sourceObjectId === sourceObjectId && c.targetObjectId === targetObjectId
  );

  if (directConn) {
    const citations: ModelCitation[] = [
      {
        kind: 'object',
        id: sourceObj.id,
        name: sourceObj.name,
        description: sourceObj.description,
      },
      {
        kind: 'connection',
        id: directConn.id,
        name: directConn.label || `${sourceObj.name} → ${targetObj.name}`,
        label: directConn.label,
        description: directConn.description,
      },
      {
        kind: 'object',
        id: targetObj.id,
        name: targetObj.name,
        description: targetObj.description,
      },
    ];

    const labelText = directConn.label ? `for "${directConn.label}"` : '';
    const kindText = directConn.kind ? `(${directConn.kind} communication)` : '';
    const descText = directConn.description ? ` Details: ${directConn.description}.` : '';

    const explanation = `${sourceName} (${sourceObj.id}) directly depends on ${targetName} (${targetObj.id}) via connection ${directConn.id} ${labelText} ${kindText}.${descText}`;

    return {
      sourceObjectId,
      targetObjectId,
      sourceObjectName: sourceName,
      targetObjectName: targetName,
      direct: true,
      connection: directConn,
      explanation: explanation.replace(/\s+/g, ' ').trim(),
      citations,
    };
  }

  // 2. Check for transitive multi-hop dependency path using BFS
  const queue: Array<{
    currentObjectId: ObjectId;
    path: Array<{ object: ModelObject; connection: ModelConnection }>;
  }> = [];

  const visited = new Set<string>([sourceObjectId]);

  const outgoingFromSource = context.connections.filter((c) => c.sourceObjectId === sourceObjectId);
  for (const conn of outgoingFromSource) {
    const nextObj = context.objects.find((o) => o.id === conn.targetObjectId);
    if (nextObj) {
      queue.push({
        currentObjectId: nextObj.id,
        path: [{ object: nextObj, connection: conn }],
      });
      visited.add(nextObj.id);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    if (current.currentObjectId === targetObjectId) {
      // Found transitive path
      const citations: ModelCitation[] = [
        { kind: 'object', id: sourceObj.id, name: sourceObj.name },
      ];

      for (const step of current.path) {
        citations.push({
          kind: 'connection',
          id: step.connection.id,
          name: step.connection.label || 'Connection',
        });
        citations.push({
          kind: 'object',
          id: step.object.id,
          name: step.object.name,
        });
      }

      const hops = current.path
        .map((step) => `→ [${step.connection.id} (${step.connection.label || 'sync'})] → ${step.object.name} (${step.object.id})`)
        .join(' ');

      const explanation = `${sourceName} (${sourceObj.id}) transitively depends on ${targetName} (${targetObj.id}) across ${current.path.length} hops: ${sourceName} ${hops}`;

      return {
        sourceObjectId,
        targetObjectId,
        sourceObjectName: sourceName,
        targetObjectName: targetName,
        direct: false,
        connection: null,
        transitivePath: current.path,
        explanation,
        citations,
      };
    }

    const nextOutgoing = context.connections.filter(
      (c) => c.sourceObjectId === current.currentObjectId && !visited.has(c.targetObjectId)
    );

    for (const conn of nextOutgoing) {
      const nextObj = context.objects.find((o) => o.id === conn.targetObjectId);
      if (nextObj) {
        visited.add(nextObj.id);
        queue.push({
          currentObjectId: nextObj.id,
          path: [...current.path, { object: nextObj, connection: conn }],
        });
      }
    }
  }

  // 3. No connection found
  return {
    sourceObjectId,
    targetObjectId,
    sourceObjectName: sourceName,
    targetObjectName: targetName,
    direct: false,
    connection: null,
    explanation: `No architectural dependency was found between ${sourceName} (${sourceObj.id}) and ${targetName} (${targetObj.id}) in the active model graph.`,
    citations: [
      { kind: 'object', id: sourceObj.id, name: sourceObj.name },
      { kind: 'object', id: targetObj.id, name: targetObj.name },
    ],
  };
}

/**
 * Handles grounded architecture Q&A queries, citing real model entity IDs.
 */
export function queryModelGroundedQA(
  query: string,
  context: ArchitectureGroundedContext
): AIChatMessage {
  const normalizedQuery = query.toLowerCase().trim();
  const now = new Date().toISOString();

  // Pattern A: "why does X depend on Y" or "how does X connect to Y"
  const dependMatch =
    normalizedQuery.match(/why does (.+?) depend on (.+?)\??$/i) ||
    normalizedQuery.match(/how does (.+?) connect to (.+?)\??$/i);

  if (dependMatch && dependMatch[1] && dependMatch[2]) {
    const sourceQuery = dependMatch[1].trim();
    const targetQuery = dependMatch[2].trim();

    const findObj = (q: string) =>
      context.objects.find(
        (o) =>
          o.id.toLowerCase() === q ||
          o.name.toLowerCase() === q ||
          o.name.toLowerCase().includes(q)
      );

    const source = findObj(sourceQuery);
    const target = findObj(targetQuery);

    if (source && target) {
      const rationale = resolveDependencyRationale(source.id, target.id, context);
      return {
        id: createId('msg') as MessageId,
        role: 'assistant',
        content: rationale.explanation,
        citations: rationale.citations,
        timestamp: now,
      };
    }
  }

  // Pattern B: "what depends on X" or "dependents of X"
  const whatDependsMatch = normalizedQuery.match(/what depends on (.+?)\??$/i);
  if (whatDependsMatch && whatDependsMatch[1]) {
    const targetQuery = whatDependsMatch[1].trim();
    const target = context.objects.find(
      (o) =>
        o.id.toLowerCase() === targetQuery ||
        o.name.toLowerCase().includes(targetQuery)
    );

    if (target) {
      const incoming = context.connections.filter((c) => c.targetObjectId === target.id);
      const dependentObjects = incoming
        .map((c) => context.objects.find((o) => o.id === c.sourceObjectId))
        .filter((o): o is ModelObject => Boolean(o));

      const citations: ModelCitation[] = [
        { kind: 'object', id: target.id, name: target.name },
        ...dependentObjects.map((d) => ({
          kind: 'object' as CitationKind,
          id: d.id,
          name: d.name,
        })),
        ...incoming.map((c) => ({
          kind: 'connection' as CitationKind,
          id: c.id,
          name: c.label || 'Connection',
        })),
      ];

      if (dependentObjects.length === 0) {
        return {
          id: createId('msg') as MessageId,
          role: 'assistant',
          content: `No upstream systems depend on ${target.name} (${target.id}) in the current model.`,
          citations: [{ kind: 'object', id: target.id, name: target.name }],
          timestamp: now,
        };
      }

      const depNames = dependentObjects
        .map((d) => `${d.name} (${d.id})`)
        .join(', ');

      return {
        id: createId('msg') as MessageId,
        role: 'assistant',
        content: `${dependentObjects.length} system(s) depend on ${target.name} (${target.id}): ${depNames}.`,
        citations,
        timestamp: now,
      };
    }
  }

  // Fallback: General model summary / entity search
  const matchedObjects = context.objects.filter((o) =>
    normalizedQuery.includes(o.name.toLowerCase()) || normalizedQuery.includes(o.id.toLowerCase())
  );

  if (matchedObjects.length > 0) {
    const citations: ModelCitation[] = matchedObjects.map((o) => ({
      kind: 'object',
      id: o.id,
      name: o.name,
      description: o.description,
    }));

    const descriptions = matchedObjects
      .map((o) => `• ${o.name} (${o.id}, ${o.kind}): ${o.description || 'No description provided'}`)
      .join('\n');

    return {
      id: createId('msg') as MessageId,
      role: 'assistant',
      content: `Here are the matching architecture entities:\n${descriptions}`,
      citations,
      timestamp: now,
    };
  }

  // Default helpful response with general context citations
  return {
    id: createId('msg') as MessageId,
    role: 'assistant',
    content: `DiagramHQ Copilot active across ${context.objects.length} architecture objects and ${context.connections.length} connections. You can ask dependency questions (e.g., "Why does Edge Gateway depend on Auth Service?"), inspect system blast radiuses, or analyze architecture flows.`,
    citations: context.objects.slice(0, 3).map((o) => ({
      kind: 'object',
      id: o.id,
      name: o.name,
    })),
    timestamp: now,
  };
}
