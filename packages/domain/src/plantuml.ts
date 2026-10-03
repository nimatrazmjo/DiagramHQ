import type {
  ArchitectureModel,
  ModelObject,
  ModelConnection,
  View,
  FlowStep,
  FlowWithSteps,
  ObjectKind,
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
// Types & Interfaces
// ============================================================================

export type PlantUmlDirection = 'top to bottom' | 'left to right';

export interface PlantUmlExportOptions {
  c4Mode?: boolean; // Use C4-PlantUML macros (default true) vs standard PlantUML
  direction?: PlantUmlDirection;
  includeLegend?: boolean;
  includeNotes?: boolean;
  title?: string;
  skinParamTheme?: string;
}

export interface PlantUmlSequenceExportOptions {
  autonumber?: boolean;
  includeNotes?: boolean;
  includeSchemas?: boolean;
  title?: string;
}

export interface PlantUmlExportResult {
  script: string;
  diagramType: 'c4' | 'component' | 'sequence';
  nodeCount: number;
  edgeCount: number;
}

export interface PlantUmlImportResult {
  success: boolean;
  diagramType: 'c4' | 'component' | 'sequence';
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
 * Sanitizes a string into a safe PlantUML identifier/alias.
 */
export function toPlantUmlId(rawId: string): string {
  if (!rawId) return 'id_unknown';
  const clean = rawId.replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[a-zA-Z]/.test(clean) ? clean : `id_${clean}`;
}

/**
 * Sanitizes labels, escaping quotes and newlines.
 */
export function sanitizePlantUmlText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/"/g, "'")
    .replace(/\r?\n/g, '\\n')
    .trim();
}

/**
 * Resolves C4 macro name for a given ModelObject kind and view level.
 */
function getC4MacroForKind(kind: ObjectKind, metadata?: Record<string, unknown>): string {
  const isExternal = Boolean(metadata?.external);

  switch (kind) {
    case 'actor':
      return isExternal ? 'Person_Ext' : 'Person';
    case 'system':
      return isExternal ? 'System_Ext' : 'System';
    case 'store':
      return metadata?.queue ? 'ContainerQueue' : 'ContainerDb';
    case 'application':
      return 'Container';
    case 'component':
      return 'Component';
    default:
      return 'System';
  }
}

// ============================================================================
// PlantUML C4 & Component Architecture Exporter
// ============================================================================

/**
 * Exports an architecture view into PlantUML format (C4-PlantUML or Native Component).
 */
export function exportViewToPlantUml(
  view: View,
  model: ArchitectureModel,
  options?: PlantUmlExportOptions,
): string {
  const c4Mode = options?.c4Mode !== false;
  const direction = options?.direction ?? 'top to bottom';
  const includeLegend = options?.includeLegend ?? true;

  // Filter relevant objects by view level
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

  const lines: string[] = ['@startuml'];

  const title = options?.title || view.name;
  if (title) {
    lines.push(`title ${sanitizePlantUmlText(title)}`);
  }

  if (c4Mode) {
    // Official C4-PlantUML includes
    if (view.kind === 'component') {
      lines.push('!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml');
    } else if (view.kind === 'container') {
      lines.push('!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml');
    } else {
      lines.push('!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml');
    }

    if (direction === 'left to right') {
      lines.push('LAYOUT_LEFT_RIGHT()');
    } else {
      lines.push('LAYOUT_TOP_DOWN()');
    }
  } else {
    // Standard PlantUML direction
    if (direction === 'left to right') {
      lines.push('left to right direction');
    } else {
      lines.push('top to bottom direction');
    }

    lines.push('skinparam roundcorner 8');
    lines.push('skinparam componentStyle uml2');
  }

  lines.push('');

  // Group objects by parentId for boundary representation
  const allObjectsMap = new Map<string, ModelObject>(model.objects.map((o) => [o.id, o]));
  const childMap = new Map<string, ModelObject[]>();

  for (const obj of relevantObjects) {
    if (obj.parentId) {
      const list = childMap.get(obj.parentId) || [];
      list.push(obj);
      childMap.set(obj.parentId, list);
    }
  }

  const renderedObjectIds = new Set<string>();

  // Render object node
  const renderObjectNode = (obj: ModelObject, indent = ''): void => {
    const alias = toPlantUmlId(obj.id);
    const label = sanitizePlantUmlText(obj.name);
    const desc = sanitizePlantUmlText(obj.description || '');
    const tech = sanitizePlantUmlText((obj.metadata?.technology as string) || '');

    if (c4Mode) {
      const macro = getC4MacroForKind(obj.kind, obj.metadata);
      if (macro.startsWith('Container') || macro === 'Component') {
        lines.push(`${indent}${macro}(${alias}, "${label}", "${tech}", "${desc}")`);
      } else {
        lines.push(`${indent}${macro}(${alias}, "${label}", "${desc}")`);
      }
    } else {
      // Standard PlantUML element notation
      switch (obj.kind) {
        case 'actor':
          lines.push(`${indent}actor "${label}" as ${alias}`);
          break;
        case 'store':
          if (obj.metadata?.queue) {
            lines.push(`${indent}queue "${label}${tech ? `\\n[${tech}]` : ''}" as ${alias}`);
          } else {
            lines.push(`${indent}database "${label}${tech ? `\\n[${tech}]` : ''}" as ${alias}`);
          }
          break;
        default:
          lines.push(`${indent}component [${label}${tech ? `\\n[${tech}]` : ''}] as ${alias}`);
          break;
      }
    }
    renderedObjectIds.add(obj.id);
  };

  // Render parent boundaries with their children
  for (const [parentId, children] of childMap.entries()) {
    const parentObj = allObjectsMap.get(parentId);
    if (!parentObj) continue;

    const bAlias = toPlantUmlId(parentObj.id);
    const bLabel = sanitizePlantUmlText(parentObj.name);

    if (c4Mode) {
      const boundaryMacro = parentObj.kind === 'system' ? 'System_Boundary' : 'Container_Boundary';
      lines.push(`${boundaryMacro}(b_${bAlias}, "${bLabel}") {`);
      for (const child of children) {
        renderObjectNode(child, '    ');
      }
      lines.push('}');
    } else {
      lines.push(`package "${bLabel}" as b_${bAlias} {`);
      for (const child of children) {
        renderObjectNode(child, '    ');
      }
      lines.push('}');
    }
    renderedObjectIds.add(parentObj.id);
  }

  // Render any remaining nodes
  for (const obj of relevantObjects) {
    if (!renderedObjectIds.has(obj.id)) {
      renderObjectNode(obj);
    }
  }

  // Render Connections / Relationships
  if (relevantConnections.length > 0) {
    lines.push('');
    for (const conn of relevantConnections) {
      const srcAlias = toPlantUmlId(conn.sourceObjectId);
      const tgtAlias = toPlantUmlId(conn.targetObjectId);
      const label = sanitizePlantUmlText(conn.label || conn.description || '');
      const tech = sanitizePlantUmlText((conn.metadata?.protocol as string) || (conn.metadata?.technology as string) || '');

      if (c4Mode) {
        if (tech) {
          lines.push(`Rel(${srcAlias}, ${tgtAlias}, "${label}", "${tech}")`);
        } else {
          lines.push(`Rel(${srcAlias}, ${tgtAlias}, "${label}")`);
        }
      } else {
        const arrow = conn.kind === 'async' ? '..>' : '-->';
        const labelText = label || tech ? ` : ${[label, tech ? `[${tech}]` : ''].filter(Boolean).join(' ')}` : '';
        lines.push(`${srcAlias} ${arrow} ${tgtAlias}${labelText}`);
      }
    }
  }

  if (c4Mode && includeLegend) {
    lines.push('');
    lines.push('SHOW_LEGEND()');
  }

  lines.push('@enduml');
  return lines.join('\n');
}

/**
 * Bundles export view into structured PlantUmlExportResult with metrics.
 */
export function exportViewToPlantUmlResult(
  view: View,
  model: ArchitectureModel,
  options?: PlantUmlExportOptions,
): PlantUmlExportResult {
  const script = exportViewToPlantUml(view, model, options);
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
    diagramType: options?.c4Mode !== false ? 'c4' : 'component',
    nodeCount: relevantObjects.length,
    edgeCount: relevantConnections.length,
  };
}

// ============================================================================
// PlantUML Sequence Diagram Exporter (Execution Flows -> Sequence)
// ============================================================================

/**
 * Exports an Execution Flow into a PlantUML sequence diagram.
 */
export function exportFlowToPlantUmlSequence(
  flow: FlowWithSteps,
  model: ArchitectureModel,
  options?: PlantUmlSequenceExportOptions,
): PlantUmlExportResult {
  const connectionMap = new Map<string, ModelConnection>(model.connections.map((c) => [c.id, c]));
  const objectMap = new Map<string, ModelObject>(model.objects.map((o) => [o.id, o]));

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

  const lines: string[] = ['@startuml'];

  const title = options?.title || flow.name;
  if (title) {
    lines.push(`title ${sanitizePlantUmlText(title)}`);
  }

  if (options?.autonumber !== false) {
    lines.push('autonumber');
  }

  lines.push('skinparam BoxPadding 10');
  lines.push('skinparam ParticipantPadding 10');
  lines.push('');

  const aliasMap = new Map<string, string>();

  // Declare participants
  for (const objId of participantIds) {
    const obj = objectMap.get(objId as ObjectId);
    const alias = `p_${toPlantUmlId(objId)}`;
    aliasMap.set(objId, alias);
    const label = sanitizePlantUmlText(obj ? obj.name : objId);

    if (obj?.kind === 'actor') {
      lines.push(`actor "${label}" as ${alias}`);
    } else if (obj?.kind === 'store') {
      if (obj.metadata?.queue) {
        lines.push(`queue "${label}" as ${alias}`);
      } else {
        lines.push(`database "${label}" as ${alias}`);
      }
    } else {
      lines.push(`participant "${label}" as ${alias}`);
    }
  }

  lines.push('');

  // Step messages
  for (const step of sortedSteps) {
    const conn = connectionMap.get(step.connectionId);
    if (!conn) continue;

    const sourceAlias = aliasMap.get(conn.sourceObjectId) ?? toPlantUmlId(conn.sourceObjectId);
    const targetAlias = aliasMap.get(conn.targetObjectId) ?? toPlantUmlId(conn.targetObjectId);

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

    const cleanMessage = sanitizePlantUmlText(messageText);
    const arrow = conn.kind === 'async' ? '->>' : '->';
    lines.push(`${sourceAlias} ${arrow} ${targetAlias} : ${cleanMessage}`);

    if (options?.includeNotes !== false && step.note && (method || endpoint)) {
      lines.push(`note over ${targetAlias} : ${sanitizePlantUmlText(step.note)}`);
    }

    if (options?.includeSchemas) {
      if (step.requestSchema) {
        lines.push(`note over ${sourceAlias}, ${targetAlias} : Req: ${sanitizePlantUmlText(step.requestSchema)}`);
      }
      if (step.responseSchema) {
        lines.push(`note over ${targetAlias}, ${sourceAlias} : Res: ${sanitizePlantUmlText(step.responseSchema)}`);
      }
    }

    const statusCode = step.statusCode ?? (step.stepIndex === sortedSteps.length - 1 ? flow.statusCode : null);
    if (statusCode) {
      lines.push(`${targetAlias} --> ${sourceAlias} : ${statusCode}`);
    }
  }

  lines.push('@enduml');

  return {
    script: lines.join('\n'),
    diagramType: 'sequence',
    nodeCount: participantIds.length,
    edgeCount: sortedSteps.length,
  };
}

// ============================================================================
// PlantUML Importer (PlantUML Scripts -> DiagramHQ Model)
// ============================================================================

/**
 * Parses a PlantUML script (C4, component, or sequence) into DiagramHQ model objects, connections, and flows.
 */
export function importPlantUml(
  script: string,
  architectureId: ArchitectureId,
  versionId: VersionId,
  flowName = 'Imported PlantUML Flow',
): PlantUmlImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const rawLines = script
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("'") && !l.startsWith('/'));

  if (rawLines.length === 0) {
    return {
      success: false,
      diagramType: 'c4',
      objects: [],
      connections: [],
      warnings: [],
      errors: ['Empty PlantUML script provided.'],
    };
  }

  // Detect whether sequence diagram or architecture diagram
  const isSequence = rawLines.some(
    (l) =>
      /^(actor|participant|database|queue)\s+[a-zA-Z0-9_"\s]+as\s+[a-zA-Z0-9_]+/i.test(l) ||
      /^[a-zA-Z0-9_]+\s*(->|-->|->>)\s*[a-zA-Z0-9_]+\s*:/i.test(l) ||
      l.toLowerCase() === 'autonumber',
  );

  const objects: ModelObject[] = [];
  const connections: ModelConnection[] = [];
  const participantMap = new Map<string, ObjectId>();

  if (isSequence) {
    const steps: FlowStep[] = [];
    const flowId = createId('flw') as FlowId;

    const getOrCreateParticipant = (alias: string, label?: string, kind: ObjectKind = 'system'): ObjectId => {
      const cleanAlias = alias.trim();
      const existing = participantMap.get(cleanAlias);
      if (existing) return existing;

      const objId = createId(kind === 'actor' ? 'act' : kind === 'store' ? 'sto' : 'sys') as ObjectId;
      participantMap.set(cleanAlias, objId);

      objects.push({
        id: objId,
        architectureId,
        versionId,
        parentId: null,
        kind,
        name: label || cleanAlias,
        description: `Sequence Participant [${cleanAlias}]`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return objId;
    };

    // Regex for participant declarations: actor "Customer" as cust
    const participantRegex = /^(actor|participant|database|queue)\s+"([^"]+)"\s+as\s+([a-zA-Z0-9_]+)/i;
    // Regex for messages: src -> tgt : message
    const msgRegex = /^([a-zA-Z0-9_]+)\s*(->|-->|->>)\s*([a-zA-Z0-9_]+)\s*:\s*(.+)$/;
    // Regex for note over: note over tgt : text
    const noteRegex = /^note\s+over\s+([a-zA-Z0-9_,\s]+)\s*:\s*(.+)$/i;

    let stepIdx = 0;
    let lastStep: FlowStep | null = null;

    for (const line of rawLines) {
      if (line.startsWith('@') || line.toLowerCase().startsWith('skinparam') || line.toLowerCase() === 'autonumber' || line.toLowerCase().startsWith('title')) {
        continue;
      }

      const partMatch = line.match(participantRegex);
      if (partMatch && partMatch[1] && partMatch[2] && partMatch[3]) {
        const typeStr = partMatch[1].toLowerCase();
        const label = partMatch[2].trim();
        const alias = partMatch[3].trim();
        const kind: ObjectKind = typeStr === 'actor' ? 'actor' : (typeStr === 'database' || typeStr === 'queue') ? 'store' : 'system';
        getOrCreateParticipant(alias, label, kind);
        continue;
      }

      const noteMatch = line.match(noteRegex);
      if (noteMatch && noteMatch[2] && lastStep) {
        lastStep.note = noteMatch[2].trim();
        continue;
      }

      const msgMatch = line.match(msgRegex);
      if (msgMatch && msgMatch[1] && msgMatch[2] && msgMatch[3] && msgMatch[4]) {
        const srcAlias = msgMatch[1].trim();
        const arrow = msgMatch[2].trim();
        const tgtAlias = msgMatch[3].trim();
        const msgText = msgMatch[4].trim();

        const sourceId = getOrCreateParticipant(srcAlias);
        const targetId = getOrCreateParticipant(tgtAlias);

        const connId = createId('con') as ConnectionId;
        connections.push({
          id: connId,
          architectureId,
          versionId,
          sourceObjectId: sourceId,
          targetObjectId: targetId,
          kind: arrow.includes('-->') ? 'async' : 'sync',
          label: msgText,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const step: FlowStep = {
          id: `step_${stepIdx + 1}`,
          flowId,
          connectionId: connId,
          stepIndex: stepIdx,
          note: msgText,
        };

        steps.push(step);
        lastStep = step;
        stepIdx++;
      }
    }

    const flow: FlowWithSteps = {
      id: flowId,
      architectureId,
      name: flowName,
      description: 'Execution flow imported from PlantUML sequence diagram.',
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

  // C4 / Component Architecture diagram importer
  let currentParentId: ObjectId | null = null;

  // C4 Macro Regex: Macro(alias, "Label", "Tech", "Desc") or Macro(alias, "Label", "Desc")
  const c4MacroRegex = /^(Person|Person_Ext|System|System_Ext|Container|ContainerDb|ContainerQueue|Component)\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*"([^"]+)"(?:\s*,\s*"([^"]*)")?(?:\s*,\s*"([^"]*)")?\s*\)/i;
  // C4 Boundary Regex: System_Boundary(alias, "Label") {
  const c4BoundaryRegex = /^(System_Boundary|Container_Boundary)\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*"([^"]+)"\s*\)\s*\{?/i;
  // C4 Rel Regex: Rel(src, tgt, "label", "tech")
  const c4RelRegex = /^(Rel|Rel_R|Rel_L|Rel_U|Rel_D|Rel_Back|Rel_Neighbor)\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*,\s*"([^"]*)"(?:\s*,\s*"([^"]*)")?\s*\)/i;

  // Standard PlantUML regexes
  const standardComponentRegex = /^(component\s+\[([^\]]+)\]|\[([^\]]+)\]|database\s+"([^"]+)"|queue\s+"([^"]+)"|actor\s+"([^"]+)")\s+as\s+([a-zA-Z0-9_]+)/i;
  const standardRelRegex = /^([a-zA-Z0-9_]+)\s*(-->|\.\.>|==>)\s*([a-zA-Z0-9_]+)(?:\s*:\s*(.+))?$/;

  const getOrCreateNode = (alias: string, name: string, kind: ObjectKind, desc?: string, tech?: string): ObjectId => {
    const cleanAlias = alias.trim();
    const existing = participantMap.get(cleanAlias);
    if (existing) return existing;

    const prefix = kind === 'actor' ? 'act' : kind === 'store' ? 'sto' : kind === 'component' ? 'cmp' : 'sys';
    const objId = createId(prefix) as ObjectId;
    participantMap.set(cleanAlias, objId);

    objects.push({
      id: objId,
      architectureId,
      versionId,
      parentId: currentParentId,
      kind,
      name: name || cleanAlias,
      description: desc || `Imported [${cleanAlias}]`,
      metadata: tech ? { technology: tech } : {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return objId;
  };

  for (const line of rawLines) {
    if (line.startsWith('@') || line.startsWith('!') || line.toLowerCase().startsWith('skinparam') || line.toLowerCase().startsWith('layout_') || line.toLowerCase().startsWith('title') || line.toLowerCase().startsWith('show_legend')) {
      continue;
    }

    if (line === '}') {
      currentParentId = null;
      continue;
    }

    // C4 Boundary start
    const bMatch = line.match(c4BoundaryRegex);
    if (bMatch && bMatch[2] && bMatch[3]) {
      const bAlias = bMatch[2].trim();
      const bLabel = bMatch[3].trim();
      const boundObjId = createId('sys') as ObjectId;
      participantMap.set(bAlias, boundObjId);
      objects.push({
        id: boundObjId,
        architectureId,
        versionId,
        parentId: null,
        kind: 'system',
        name: bLabel,
        description: `Boundary [${bLabel}]`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      currentParentId = boundObjId;
      continue;
    }

    // C4 Macro declaration
    const c4Match = line.match(c4MacroRegex);
    if (c4Match && c4Match[1] && c4Match[2] && c4Match[3]) {
      const macro = c4Match[1].toLowerCase();
      const alias = c4Match[2].trim();
      const label = c4Match[3].trim();
      const arg4 = c4Match[4]?.trim();
      const arg5 = c4Match[5]?.trim();

      let kind: ObjectKind = 'system';
      let tech: string | undefined;
      let desc: string | undefined;

      if (macro.startsWith('person')) {
        kind = 'actor';
        desc = arg4;
      } else if (macro.startsWith('system')) {
        kind = 'system';
        desc = arg4;
      } else if (macro === 'containerdb') {
        kind = 'store';
        tech = arg4;
        desc = arg5;
      } else if (macro === 'containerqueue') {
        kind = 'store';
        tech = arg4 || 'Message Queue';
        desc = arg5;
      } else if (macro === 'container') {
        kind = 'application';
        tech = arg4;
        desc = arg5;
      } else if (macro === 'component') {
        kind = 'component';
        tech = arg4;
        desc = arg5;
      }

      getOrCreateNode(alias, label, kind, desc, tech);
      continue;
    }

    // C4 Relationship
    const relMatch = line.match(c4RelRegex);
    if (relMatch && relMatch[2] && relMatch[3]) {
      const srcAlias = relMatch[2].trim();
      const tgtAlias = relMatch[3].trim();
      const relLabel = relMatch[4]?.trim() || '';
      const relTech = relMatch[5]?.trim() || '';

      const srcId = getOrCreateNode(srcAlias, srcAlias, 'system');
      const tgtId = getOrCreateNode(tgtAlias, tgtAlias, 'system');

      connections.push({
        id: createId('con') as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: srcId,
        targetObjectId: tgtId,
        kind: 'sync',
        label: relLabel,
        metadata: relTech ? { technology: relTech } : {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      continue;
    }

    // Standard PlantUML Component/Database/Actor
    const stdMatch = line.match(standardComponentRegex);
    if (stdMatch && stdMatch[7]) {
      const alias = stdMatch[7].trim();
      const label = stdMatch[2] || stdMatch[3] || stdMatch[4] || stdMatch[5] || stdMatch[6] || alias;
      const lower = line.toLowerCase();
      let kind: ObjectKind = 'application';
      if (lower.startsWith('database') || lower.startsWith('queue')) kind = 'store';
      else if (lower.startsWith('actor')) kind = 'actor';

      getOrCreateNode(alias, label, kind);
      continue;
    }

    // Standard PlantUML arrow relationship
    const stdRelMatch = line.match(standardRelRegex);
    if (stdRelMatch && stdRelMatch[1] && stdRelMatch[2] && stdRelMatch[3]) {
      const srcAlias = stdRelMatch[1].trim();
      const arrow = stdRelMatch[2].trim();
      const tgtAlias = stdRelMatch[3].trim();
      const label = stdRelMatch[4]?.trim() || '';

      const srcId = getOrCreateNode(srcAlias, srcAlias, 'system');
      const tgtId = getOrCreateNode(tgtAlias, tgtAlias, 'system');

      connections.push({
        id: createId('con') as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: srcId,
        targetObjectId: tgtId,
        kind: arrow === '..>' ? 'async' : 'sync',
        label,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      continue;
    }
  }

  return {
    success: objects.length > 0 || connections.length > 0,
    diagramType: 'c4',
    objects,
    connections,
    warnings,
    errors,
  };
}
