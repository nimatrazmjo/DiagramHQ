import type {
  ArchitectureModel,
  ModelObject,
  ModelConnection,
  View,
  FlowStep,
  FlowWithSteps,
  ObjectKind,
  ConnectionKind,
} from './types';
import {
  createId,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
  type FlowId,
} from './ids';

// ============================================================================
// Types & Options
// ============================================================================

export type MermaidDirection = 'TB' | 'TD' | 'LR' | 'RL';
export type MermaidTheme = 'dark' | 'light' | 'default';

export interface MermaidFlowchartExportOptions {
  direction?: MermaidDirection;
  theme?: MermaidTheme;
  includeStyles?: boolean;
  groupSubgraphs?: boolean;
  customTitle?: string;
}

export interface MermaidSequenceExportOptions {
  autonumber?: boolean;
  includeNotes?: boolean;
  includeSchemas?: boolean;
  title?: string;
}

export interface MermaidExportResult {
  script: string;
  diagramType: 'flowchart' | 'sequence';
  nodeCount: number;
  edgeCount: number;
}

export interface MermaidImportResult {
  success: boolean;
  diagramType: 'flowchart' | 'sequence';
  objects: ModelObject[];
  connections: ModelConnection[];
  flow?: FlowWithSteps;
  warnings: string[];
  errors: string[];
}

// ============================================================================
// Helper Utilities
// ============================================================================

/**
 * Sanitizes a string to be a safe Mermaid identifier.
 */
export function toMermaidId(rawId: string): string {
  const sanitized = rawId.replace(/[^a-zA-Z0-9_]/g, '_');
  return sanitized.startsWith('_') ? `id${sanitized}` : sanitized;
}

/**
 * Sanitizes labels for Mermaid syntax by removing quotes and escaping special characters.
 */
export function sanitizeMermaidLabel(label: string): string {
  return label
    .replace(/"/g, "'")
    .replace(/[\n\r]+/g, ' ')
    .trim();
}

/**
 * Maps an ObjectKind to a Mermaid shape syntax wrapper.
 */
export function formatMermaidNodeShape(nodeId: string, label: string, kind: ObjectKind): string {
  const cleanLabel = sanitizeMermaidLabel(label);
  switch (kind) {
    case 'store':
      return `${nodeId}[("${cleanLabel}")]`;
    case 'actor':
      return `${nodeId}(["${cleanLabel}"])`;
    case 'component':
      return `${nodeId}[["${cleanLabel}"]]`;
    case 'application':
      return `${nodeId}["${cleanLabel}"]`;
    case 'system':
    default:
      return `${nodeId}["${cleanLabel}"]`;
  }
}

// ============================================================================
// Mermaid Flowchart Exporter (Diagram Views -> Flowchart)
// ============================================================================

/**
 * Exports an architecture view into a Mermaid flowchart script.
 */
export function exportViewToMermaidFlowchart(
  view: View,
  model: ArchitectureModel,
  options?: MermaidFlowchartExportOptions,
): string {
  const direction = options?.direction ?? 'TB';
  const includeStyles = options?.includeStyles ?? true;
  const groupSubgraphs = options?.groupSubgraphs ?? true;

  // Filter relevant objects
  const relevantObjects = model.objects.filter((obj) => {
    if (view.kind === 'context') return obj.kind === 'system' || obj.kind === 'actor';
    if (view.kind === 'container') return obj.kind === 'application' || obj.kind === 'store';
    if (view.kind === 'component') return obj.kind === 'component';
    return true;
  });

  const relevantObjectIds = new Set(relevantObjects.map((o) => o.id));
  const relevantConnections = model.connections.filter(
    (c) => relevantObjectIds.has(c.sourceObjectId) && relevantObjectIds.has(c.targetObjectId),
  );

  const lines: string[] = [];

  // Header
  const title = options?.customTitle || view.name;
  if (title) {
    lines.push(`---`);
    lines.push(`title: ${title}`);
    lines.push(`---`);
  }
  lines.push(`flowchart ${direction}`);

  // Subgraph hierarchy grouping
  const topLevelObjects = relevantObjects.filter((o) => !o.parentId || !groupSubgraphs);
  const childMap = new Map<string, ModelObject[]>();

  if (groupSubgraphs) {
    for (const obj of relevantObjects) {
      if (obj.parentId) {
        const list = childMap.get(obj.parentId) || [];
        list.push(obj);
        childMap.set(obj.parentId, list);
      }
    }
  }

  // Render nodes (grouped in subgraphs if applicable)
  const renderedObjectIds = new Set<string>();

  for (const obj of topLevelObjects) {
    const children = childMap.get(obj.id);
    const mId = toMermaidId(obj.id);

    if (children && children.length > 0) {
      lines.push(`    subgraph sub_${mId} ["${sanitizeMermaidLabel(obj.name)}"]`);
      for (const child of children) {
        const cId = toMermaidId(child.id);
        lines.push(`        ${formatMermaidNodeShape(cId, child.name, child.kind)}:::${child.kind}`);
        renderedObjectIds.add(child.id);
      }
      lines.push(`    end`);
      renderedObjectIds.add(obj.id);
    } else {
      lines.push(`    ${formatMermaidNodeShape(mId, obj.name, obj.kind)}:::${obj.kind}`);
      renderedObjectIds.add(obj.id);
    }
  }

  // Render any remaining children whose parent wasn't a top-level node in this view
  for (const obj of relevantObjects) {
    if (!renderedObjectIds.has(obj.id)) {
      const mId = toMermaidId(obj.id);
      lines.push(`    ${formatMermaidNodeShape(mId, obj.name, obj.kind)}:::${obj.kind}`);
    }
  }

  // Render Connections
  if (relevantConnections.length > 0) {
    lines.push('');
    for (const conn of relevantConnections) {
      const srcId = toMermaidId(conn.sourceObjectId);
      const tgtId = toMermaidId(conn.targetObjectId);
      const label = conn.label || conn.description;
      const labelText = label ? `|"${sanitizeMermaidLabel(label)}"|` : '';

      if (conn.kind === 'async') {
        lines.push(`    ${srcId} -.->${labelText} ${tgtId}`);
      } else if (conn.kind === 'data') {
        lines.push(`    ${srcId} ==>${labelText} ${tgtId}`);
      } else {
        lines.push(`    ${srcId} -->${labelText} ${tgtId}`);
      }
    }
  }

  // Class definitions for styling
  if (includeStyles) {
    lines.push('');
    lines.push(`    classDef system fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff;`);
    lines.push(`    classDef application fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ffffff;`);
    lines.push(`    classDef store fill:#78350f,stroke:#f59e0b,stroke-width:2px,color:#ffffff;`);
    lines.push(`    classDef component fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff;`);
    lines.push(`    classDef actor fill:#831843,stroke:#ec4899,stroke-width:2px,color:#ffffff;`);
  }

  return lines.join('\n');
}

// ============================================================================
// Mermaid Sequence Diagram Exporter (Execution Flows -> Sequence)
// ============================================================================

/**
 * Exports an Execution Flow with steps into a Mermaid sequence diagram.
 */
export function exportFlowToMermaid(
  flow: FlowWithSteps,
  objects: ModelObject[],
  connections: ModelConnection[],
  options?: MermaidSequenceExportOptions,
): string {
  const connectionMap = new Map<string, ModelConnection>(connections.map((c) => [c.id, c]));
  const objectMap = new Map<string, ModelObject>(objects.map((o) => [o.id, o]));

  const sortedSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);

  const participantIds: string[] = [];
  const participantIdSet = new Set<string>();

  for (const step of sortedSteps) {
    const conn = connectionMap.get(step.connectionId);
    if (!conn) continue;

    if (!participantIdSet.has(conn.sourceObjectId)) {
      participantIdSet.add(conn.sourceObjectId);
      participantIds.push(conn.sourceObjectId);
    }
    if (!participantIdSet.has(conn.targetObjectId)) {
      participantIdSet.add(conn.targetObjectId);
      participantIds.push(conn.targetObjectId);
    }
  }

  const lines: string[] = ['sequenceDiagram'];

  if (options?.autonumber !== false) {
    lines.push('    autonumber');
  }

  const title = options?.title ?? flow.name;
  if (title) {
    lines.push(`    %% ${sanitizeMermaidLabel(title)}`);
  }

  const aliasMap = new Map<string, string>();
  for (const objId of participantIds) {
    const obj = objectMap.get(objId as ObjectId);
    const alias = `p_${toMermaidId(objId)}`;
    aliasMap.set(objId, alias);
    const label = obj ? sanitizeMermaidLabel(obj.name) : objId;
    if (obj?.kind === 'actor') {
      lines.push(`    actor ${alias} as ${label}`);
    } else {
      lines.push(`    participant ${alias} as ${label}`);
    }
  }

  for (const step of sortedSteps) {
    const conn = connectionMap.get(step.connectionId);
    if (!conn) continue;

    const sourceAlias = aliasMap.get(conn.sourceObjectId) ?? toMermaidId(conn.sourceObjectId);
    const targetAlias = aliasMap.get(conn.targetObjectId) ?? toMermaidId(conn.targetObjectId);

    const method = step.httpMethod ?? (step.stepIndex === 0 ? flow.httpMethod : null);
    const endpoint = step.endpoint ?? (step.stepIndex === 0 ? flow.endpoint : null);

    let messageText = '';
    if (method && endpoint) {
      messageText = `${method} ${endpoint}`;
    } else if (endpoint) {
      messageText = endpoint;
    } else if (step.note) {
      messageText = step.note;
    } else if (conn.label) {
      messageText = conn.label;
    } else if (conn.description) {
      messageText = conn.description;
    } else {
      messageText = 'invokes';
    }

    const cleanMessage = sanitizeMermaidLabel(messageText);
    lines.push(`    ${sourceAlias}->>${targetAlias}: ${cleanMessage}`);

    if (options?.includeNotes !== false && step.note && (method || endpoint)) {
      lines.push(`    Note over ${targetAlias}: ${sanitizeMermaidLabel(step.note)}`);
    }

    if (options?.includeSchemas) {
      if (step.requestSchema) {
        lines.push(`    Note over ${sourceAlias},${targetAlias}: Req: ${sanitizeMermaidLabel(step.requestSchema)}`);
      }
      if (step.responseSchema) {
        lines.push(`    Note over ${targetAlias},${sourceAlias}: Res: ${sanitizeMermaidLabel(step.responseSchema)}`);
      }
    }

    const statusCode = step.statusCode ?? (step.stepIndex === sortedSteps.length - 1 ? flow.statusCode : null);
    if (statusCode) {
      lines.push(`    ${targetAlias}-->>${sourceAlias}: ${statusCode}`);
    }
  }

  return lines.join('\n');
}

/**
 * Higher-level helper that bundles export results with metrics.
 */
export function exportViewToMermaid(
  view: View,
  model: ArchitectureModel,
  options?: MermaidFlowchartExportOptions,
): MermaidExportResult {
  const script = exportViewToMermaidFlowchart(view, model, options);
  const relevantObjects = model.objects.filter((obj) => {
    if (view.kind === 'context') return obj.kind === 'system' || obj.kind === 'actor';
    if (view.kind === 'container') return obj.kind === 'application' || obj.kind === 'store';
    if (view.kind === 'component') return obj.kind === 'component';
    return true;
  });
  const relevantObjectIds = new Set(relevantObjects.map((o) => o.id));
  const relevantConnections = model.connections.filter(
    (c) => relevantObjectIds.has(c.sourceObjectId) && relevantObjectIds.has(c.targetObjectId),
  );

  return {
    script,
    diagramType: 'flowchart',
    nodeCount: relevantObjects.length,
    edgeCount: relevantConnections.length,
  };
}

/**
 * Higher-level helper for sequence export with metrics.
 */
export function exportFlowToMermaidResult(
  flow: FlowWithSteps,
  model: ArchitectureModel,
  options?: MermaidSequenceExportOptions,
): MermaidExportResult {
  const script = exportFlowToMermaid(flow, model.objects, model.connections, options);
  const connMap = new Map(model.connections.map((c) => [c.id, c]));
  const participantIds = new Set<string>();
  for (const step of flow.steps) {
    const conn = connMap.get(step.connectionId);
    if (conn) {
      participantIds.add(conn.sourceObjectId);
      participantIds.add(conn.targetObjectId);
    }
  }

  return {
    script,
    diagramType: 'sequence',
    nodeCount: participantIds.size,
    edgeCount: flow.steps.length,
  };
}

// ============================================================================
// Mermaid Flowchart Importer (Flowchart -> DiagramHQ Model)
// ============================================================================

/**
 * Parses Mermaid flowchart script into DiagramHQ ModelObjects and ModelConnections.
 */
export function importMermaidFlowchart(
  mermaidScript: string,
  architectureId: ArchitectureId,
  versionId: VersionId,
): MermaidImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const lines = mermaidScript
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%') && !l.startsWith('---'));

  if (lines.length === 0) {
    return {
      success: false,
      diagramType: 'flowchart',
      objects: [],
      connections: [],
      warnings: [],
      errors: ['Empty Mermaid script provided.'],
    };
  }

  const firstLine = lines[0];
  if (!firstLine) {
    return {
      success: false,
      diagramType: 'flowchart',
      objects: [],
      connections: [],
      warnings: [],
      errors: ['Empty Mermaid script provided.'],
    };
  }
  const firstLineLower = firstLine.toLowerCase();
  if (!firstLineLower.startsWith('flowchart') && !firstLineLower.startsWith('graph')) {
    warnings.push(`Expected flowchart or graph header, encountered: "${firstLine}". Attempting to parse.`);
  }

  const objects: ModelObject[] = [];
  const connections: ModelConnection[] = [];
  const objectIdMap = new Map<string, ObjectId>();

  // Subgraph stack tracking: parentId hierarchy
  const parentStack: ObjectId[] = [];

  // Helper to ensure an object exists in our registry
  const getOrCreateObject = (rawId: string, label?: string, inferredKind?: ObjectKind): ObjectId => {
    const cleanId = rawId.trim();
    const existing = objectIdMap.get(cleanId);
    if (existing) return existing;

    const kind: ObjectKind = inferredKind || 'system';
    const prefix = kind === 'store' ? 'sto' : kind === 'actor' ? 'act' : kind === 'component' ? 'cmp' : kind === 'application' ? 'app' : 'sys';
    const objId = createId(prefix) as ObjectId;
    objectIdMap.set(cleanId, objId);

    const parentId = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;

    objects.push({
      id: objId,
      architectureId,
      versionId,
      parentId,
      kind,
      name: label || cleanId,
      description: `Imported from Mermaid node [${cleanId}]`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return objId;
  };

  // Node regex patterns
  // Examples: id[("Database")] -> store, id(["Actor"]) -> actor, id[["Component"]] -> component, id["System"] -> system
  const cylinderPattern = /^([a-zA-Z0-9_-]+)\[\("([^"]+)"\)\]/;
  const stadiumPattern = /^([a-zA-Z0-9_-]+)\(\["([^"]+)"\]\)/;
  const subroutinePattern = /^([a-zA-Z0-9_-]+)\[\["([^"]+)"\]\]/;
  const rectPattern = /^([a-zA-Z0-9_-]+)\["([^"]+)"\]/;
  const simpleRectPattern = /^([a-zA-Z0-9_-]+)\[([^\]]+)\]/;

  // Edge regex patterns
  // e.g.: A -->|"Label"| B, A -.->|"Label"| B, A ==>|"Label"| B, A --> B
  const edgeRegex = /^([a-zA-Z0-9_.-]+)\s*(-->|-\.->|==>|--\s*.*?\s*-->)\s*(?:\|"?([^"|]+)"?\|)?\s*([a-zA-Z0-9_.-]+)/;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Subgraph Start
    if (line.toLowerCase().startsWith('subgraph')) {
      const match = line.match(/subgraph\s+([a-zA-Z0-9_-]+)(?:\s*\["([^"]+)"\])?/i);
      const subId = match && match[1] ? match[1] : `sub_${Date.now().toString(36)}`;
      const subTitle = match && match[2] ? match[2] : subId;
      const subObjId = getOrCreateObject(subId, subTitle, 'system');
      parentStack.push(subObjId);
      continue;
    }

    // Subgraph End
    if (line.toLowerCase() === 'end') {
      parentStack.pop();
      continue;
    }

    // Skip styling declarations
    if (line.toLowerCase().startsWith('classdef') || line.toLowerCase().startsWith('class ')) {
      continue;
    }

    // Check for edge connection first
    const edgeMatch = line.match(edgeRegex);
    if (edgeMatch && edgeMatch[1] && edgeMatch[2] && edgeMatch[4]) {
      const srcRaw = edgeMatch[1];
      const arrow = edgeMatch[2];
      const label = edgeMatch[3];
      const tgtRaw = edgeMatch[4];

      const sourceId = getOrCreateObject(srcRaw);
      const targetId = getOrCreateObject(tgtRaw);

      let kind: ConnectionKind = 'sync';
      if (arrow.includes('-.-')) kind = 'async';
      else if (arrow.includes('===')) kind = 'data';

      connections.push({
        id: createId('con') as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: sourceId,
        targetObjectId: targetId,
        kind,
        label: label ? label.trim() : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      continue;
    }

    // Check for node declaration with shapes
    let nodeMatch = line.match(cylinderPattern);
    if (nodeMatch && nodeMatch[1] && nodeMatch[2]) {
      getOrCreateObject(nodeMatch[1], nodeMatch[2], 'store');
      continue;
    }

    nodeMatch = line.match(stadiumPattern);
    if (nodeMatch && nodeMatch[1] && nodeMatch[2]) {
      getOrCreateObject(nodeMatch[1], nodeMatch[2], 'actor');
      continue;
    }

    nodeMatch = line.match(subroutinePattern);
    if (nodeMatch && nodeMatch[1] && nodeMatch[2]) {
      getOrCreateObject(nodeMatch[1], nodeMatch[2], 'component');
      continue;
    }

    nodeMatch = line.match(rectPattern) || line.match(simpleRectPattern);
    if (nodeMatch && nodeMatch[1] && nodeMatch[2]) {
      getOrCreateObject(nodeMatch[1], nodeMatch[2], 'application');
      continue;
    }
  }

  return {
    success: objects.length > 0 || errors.length === 0,
    diagramType: 'flowchart',
    objects,
    connections,
    warnings,
    errors,
  };
}

// ============================================================================
// Mermaid Sequence Importer (Sequence Diagram -> Execution Flow)
// ============================================================================

/**
 * Parses a Mermaid sequence diagram into DiagramHQ Flow, FlowSteps, ModelObjects, and Connections.
 */
export function importMermaidSequence(
  mermaidScript: string,
  architectureId: ArchitectureId,
  versionId: VersionId,
  flowName = 'Imported Execution Flow',
): MermaidImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const lines = mermaidScript
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%'));

  if (lines.length === 0) {
    return {
      success: false,
      diagramType: 'sequence',
      objects: [],
      connections: [],
      warnings: [],
      errors: ['Empty Mermaid sequence script provided.'],
    };
  }

  const firstLine = lines[0];
  if (!firstLine || !firstLine.toLowerCase().startsWith('sequencediagram')) {
    warnings.push(`Expected sequenceDiagram header, found: "${firstLine ?? ''}". Attempting to parse.`);
  }

  const objects: ModelObject[] = [];
  const connections: ModelConnection[] = [];
  const steps: FlowStep[] = [];
  const participantMap = new Map<string, ObjectId>();

  const flowId = createId('flw') as FlowId;

  // Helper to ensure participant exists
  const getOrCreateParticipant = (alias: string, label?: string, isActor = false): ObjectId => {
    const cleanAlias = alias.trim();
    const existing = participantMap.get(cleanAlias);
    if (existing) return existing;

    const objId = createId(isActor ? 'act' : 'sys') as ObjectId;
    participantMap.set(cleanAlias, objId);

    objects.push({
      id: objId,
      architectureId,
      versionId,
      parentId: null,
      kind: isActor ? 'actor' : 'system',
      name: label || cleanAlias,
      description: `Sequence Participant [${cleanAlias}]`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return objId;
  };

  // Participant regex: participant A as Label or actor A as Label
  const participantRegex = /^(participant|actor)\s+([a-zA-Z0-9_]+)(?:\s+as\s+([^;\n]+))?/i;
  // Message regex: A->>B: Message text or A-->>B: Return text
  const messageRegex = /^([a-zA-Z0-9_]+)\s*(->>|-->>|->|-->)\s*([a-zA-Z0-9_]+)\s*:\s*([^;\n]+)/;
  // Note regex: Note over A: note text
  const noteRegex = /^Note\s+over\s+([a-zA-Z0-9_,\s]+)\s*:\s*([^;\n]+)/i;

  let currentStepIndex = 0;
  let lastStep: FlowStep | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (line.toLowerCase() === 'autonumber') continue;

    // Participant or Actor declaration
    const partMatch = line.match(participantRegex);
    if (partMatch && partMatch[1] && partMatch[2]) {
      const type = partMatch[1].toLowerCase();
      const alias = partMatch[2];
      const label = partMatch[3] ? partMatch[3].trim() : alias;
      getOrCreateParticipant(alias, label, type === 'actor');
      continue;
    }

    // Note over participant(s)
    const noteMatch = line.match(noteRegex);
    if (noteMatch && noteMatch[2] && lastStep) {
      lastStep.note = noteMatch[2].trim();
      continue;
    }

    // Message call
    const msgMatch = line.match(messageRegex);
    if (msgMatch && msgMatch[1] && msgMatch[2] && msgMatch[3] && msgMatch[4]) {
      const srcAlias = msgMatch[1];
      const arrow = msgMatch[2];
      const tgtAlias = msgMatch[3];
      const message = msgMatch[4].trim();

      const sourceId = getOrCreateParticipant(srcAlias);
      const targetId = getOrCreateParticipant(tgtAlias);

      // Create or reuse connection
      const connId = createId('con') as ConnectionId;
      connections.push({
        id: connId,
        architectureId,
        versionId,
        sourceObjectId: sourceId,
        targetObjectId: targetId,
        kind: arrow.includes('--') ? 'async' : 'sync',
        label: message,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const step: FlowStep = {
        id: `step_${currentStepIndex + 1}`,
        flowId,
        connectionId: connId,
        stepIndex: currentStepIndex,
        note: message,
      };

      steps.push(step);
      lastStep = step;
      currentStepIndex++;
    }
  }

  const flow: FlowWithSteps = {
    id: flowId,
    architectureId,
    name: flowName,
    description: 'Execution flow imported from Mermaid sequence diagram.',
    type: 'sequence',
    createdAt: new Date(),
    updatedAt: new Date(),
    steps,
  };

  return {
    success: objects.length > 0 || steps.length > 0,
    diagramType: 'sequence',
    objects,
    connections,
    flow,
    warnings,
    errors,
  };
}
