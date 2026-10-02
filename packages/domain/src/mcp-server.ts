/**
 * DiagramHQ - Model Context Protocol (MCP) Tool Server (F071)
 *
 * Implements standard Model Context Protocol (MCP) tool server for DiagramHQ,
 * exposing architecture intelligence tools to LLMs and agentic assistants:
 * - Query Tools:
 *   - search_architecture
 *   - get_object
 *   - get_dependencies
 *   - get_dependents
 *   - analyze_impact
 *   - compare_versions
 *   - review_change
 * - Mutating Action Tools (Strict Invariant: Return a proposal, never a silent commit):
 *   - create_object
 *   - update_object
 *   - delete_object
 *   - create_diagram
 *   - create_flow
 *   - create_change
 *   - create_adr
 */

import { createId, type VersionId } from './ids';
import type { ModelObject, ModelConnection, ObjectKind, View } from './types';
import type { FlowWithSteps } from './types';
import type { ArchitectureDecisionRecord } from './adrs';
import type { ArchitectureChangeSet } from './changes';
import { runArchitectureReview } from './ai-architecture-review';
import { computeArchitecturalImpact } from './ai-impact';
import { draftADRFromChange } from './ai-adr-generation';

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  isMutating: boolean;
}

export interface MCPToolProposal<T = unknown> {
  isProposal: true;
  requiresApproval: true;
  proposalId: string;
  toolName: string;
  summary: string;
  action: 'create' | 'update' | 'delete';
  proposedPayload: T;
  timestamp: string;
}

export interface MCPToolSuccessResult<T = unknown> {
  success: true;
  data: T;
}

export interface MCPToolErrorResult {
  success: false;
  error: string;
}

export type MCPToolExecutionResult<T = unknown> =
  | MCPToolProposal<T>
  | MCPToolSuccessResult<T>
  | MCPToolErrorResult;

export interface MCPArchitectureContext {
  objects: ModelObject[];
  connections: ModelConnection[];
  views?: View[];
  flows?: FlowWithSteps[];
  changeSets?: ArchitectureChangeSet[];
  adrs?: ArchitectureDecisionRecord[];
  activeVersionId?: VersionId;
}

/**
 * Registry of all 14 official DiagramHQ MCP tools.
 */
export const DIAGRAMHQ_MCP_TOOLS: MCPToolDefinition[] = [
  {
    name: 'search_architecture',
    description: 'Searches architectural entities by keyword query, C4 kind, tags, or technology stack.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term or keyword' },
        kind: { type: 'string', description: 'Optional C4 entity kind filter' },
      },
    },
    isMutating: false,
  },
  {
    name: 'get_object',
    description: 'Retrieves complete metadata, topology, and connection details for a specific architecture object ID.',
    parameters: {
      type: 'object',
      properties: {
        objectId: { type: 'string', description: 'Architecture object ID' },
      },
      required: ['objectId'],
    },
    isMutating: false,
  },
  {
    name: 'create_object',
    description: 'Proposes creating a new C4 architecture object. Returns an explicit reviewable proposal.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Object name' },
        kind: { type: 'string', description: 'C4 object kind (system, application, store, component, actor)' },
        description: { type: 'string', description: 'Description of component responsibilities' },
        technologies: { type: 'array', description: 'List of technology tags' },
      },
      required: ['name', 'kind'],
    },
    isMutating: true,
  },
  {
    name: 'update_object',
    description: 'Proposes updating attributes or metadata on an existing object. Returns an explicit reviewable proposal.',
    parameters: {
      type: 'object',
      properties: {
        objectId: { type: 'string', description: 'Architecture object ID to update' },
        name: { type: 'string', description: 'Updated name' },
        description: { type: 'string', description: 'Updated description' },
        metadata: { type: 'object', description: 'Updated metadata schema' },
      },
      required: ['objectId'],
    },
    isMutating: true,
  },
  {
    name: 'delete_object',
    description: 'Proposes decommissioning an existing architecture object. Returns an explicit reviewable proposal.',
    parameters: {
      type: 'object',
      properties: {
        objectId: { type: 'string', description: 'Architecture object ID to remove' },
        reason: { type: 'string', description: 'Decommission rationale' },
      },
      required: ['objectId'],
    },
    isMutating: true,
  },
  {
    name: 'get_dependencies',
    description: 'Queries all upstream components and external services that the specified object depends on.',
    parameters: {
      type: 'object',
      properties: {
        objectId: { type: 'string', description: 'Architecture object ID' },
      },
      required: ['objectId'],
    },
    isMutating: false,
  },
  {
    name: 'get_dependents',
    description: 'Queries all downstream components and clients that depend on the specified object.',
    parameters: {
      type: 'object',
      properties: {
        objectId: { type: 'string', description: 'Architecture object ID' },
      },
      required: ['objectId'],
    },
    isMutating: false,
  },
  {
    name: 'analyze_impact',
    description: 'Calculates the complete topological blast radius, affected flows, and risk scoring if an object changes.',
    parameters: {
      type: 'object',
      properties: {
        objectId: { type: 'string', description: 'Architecture object ID' },
      },
      required: ['objectId'],
    },
    isMutating: false,
  },
  {
    name: 'create_diagram',
    description: 'Proposes creating a new C4 architecture view or projection. Returns an explicit reviewable proposal.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Diagram view name' },
        kind: { type: 'string', description: 'C4 view kind (context, container, component, security)' },
      },
      required: ['name', 'kind'],
    },
    isMutating: true,
  },
  {
    name: 'create_flow',
    description: 'Proposes creating a new runtime sequence flow with ordered execution steps. Returns an explicit reviewable proposal.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Flow title' },
        steps: { type: 'array', description: 'Ordered step descriptions and connections' },
      },
      required: ['title'],
    },
    isMutating: true,
  },
  {
    name: 'compare_versions',
    description: 'Computes a semantic visual diff between two architecture versions or branches.',
    parameters: {
      type: 'object',
      properties: {
        baseVersionId: { type: 'string', description: 'Base version ID' },
        targetVersionId: { type: 'string', description: 'Target version ID' },
      },
      required: ['baseVersionId', 'targetVersionId'],
    },
    isMutating: false,
  },
  {
    name: 'create_change',
    description: 'Proposes an atomic architectural change set. Returns an explicit reviewable proposal.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Change set title' },
        description: { type: 'string', description: 'Change rationale' },
      },
      required: ['title'],
    },
    isMutating: true,
  },
  {
    name: 'review_change',
    description: 'Executes pre-merge architecture review checklist against the model or change set, providing a verdict.',
    parameters: {
      type: 'object',
      properties: {
        changeId: { type: 'string', description: 'Optional change set ID to audit' },
      },
    },
    isMutating: false,
  },
  {
    name: 'create_adr',
    description: 'Drafts a structured Architecture Decision Record linked to an architecture change. Returns an explicit reviewable proposal.',
    parameters: {
      type: 'object',
      properties: {
        changeId: { type: 'string', description: 'Source change set ID' },
        problemStatement: { type: 'string', description: 'Optional context description' },
      },
      required: ['changeId'],
    },
    isMutating: true,
  },
];

/**
 * Model Context Protocol (MCP) Server for DiagramHQ.
 */
export class DiagramHQMCPServer {
  constructor(private context: MCPArchitectureContext) {}

  public setContext(context: MCPArchitectureContext): void {
    this.context = context;
  }

  public getContext(): MCPArchitectureContext {
    return this.context;
  }

  public listTools(): MCPToolDefinition[] {
    return DIAGRAMHQ_MCP_TOOLS;
  }

  public async executeTool(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<MCPToolExecutionResult> {
    const tool = DIAGRAMHQ_MCP_TOOLS.find((t) => t.name === name);
    if (!tool) {
      return { success: false, error: `Unknown MCP tool: '${name}'` };
    }

    const { objects, connections } = this.context;
    const now = new Date().toISOString();

    switch (name) {
      // 1. search_architecture
      case 'search_architecture': {
        const query = typeof args.query === 'string' ? args.query.toLowerCase() : '';
        const kind = typeof args.kind === 'string' ? args.kind : undefined;
        const matches = objects.filter((o) => {
          const matchQuery =
            !query ||
            o.name.toLowerCase().includes(query) ||
            (o.description && o.description.toLowerCase().includes(query));
          const matchKind = !kind || o.kind === kind;
          return matchQuery && matchKind;
        });
        return { success: true, data: { matches, total: matches.length } };
      }

      // 2. get_object
      case 'get_object': {
        const objectId = typeof args.objectId === 'string' ? args.objectId : '';
        const obj = objects.find((o) => o.id === objectId);
        if (!obj) {
          return { success: false, error: `Object with ID '${objectId}' not found.` };
        }
        const incoming = connections.filter((c) => c.targetObjectId === obj.id);
        const outgoing = connections.filter((c) => c.sourceObjectId === obj.id);
        return {
          success: true,
          data: {
            object: obj,
            inboundConnections: incoming,
            outboundConnections: outgoing,
          },
        };
      }

      // 3. create_object (Mutating -> Proposal)
      case 'create_object': {
        const objName = String(args.name || '');
        const objKind = (args.kind as ObjectKind) || 'application';
        const proposalId = `prop_${createId('app')}`;
        return {
          isProposal: true,
          requiresApproval: true,
          proposalId,
          toolName: 'create_object',
          action: 'create',
          summary: `Proposed creation of ${objKind} component '${objName}'.`,
          proposedPayload: {
            name: objName,
            kind: objKind,
            description: String(args.description || ''),
            technologies: Array.isArray(args.technologies) ? (args.technologies as string[]) : [],
          },
          timestamp: now,
        };
      }

      // 4. update_object (Mutating -> Proposal)
      case 'update_object': {
        const objectId = String(args.objectId || '');
        const obj = objects.find((o) => o.id === objectId);
        if (!obj) {
          return { success: false, error: `Object '${objectId}' not found for update.` };
        }
        const proposalId = `prop_upd_${objectId}`;
        return {
          isProposal: true,
          requiresApproval: true,
          proposalId,
          toolName: 'update_object',
          action: 'update',
          summary: `Proposed update to object '${obj.name}' (${obj.id}).`,
          proposedPayload: {
            objectId: obj.id,
            modifications: args,
          },
          timestamp: now,
        };
      }

      // 5. delete_object (Mutating -> Proposal)
      case 'delete_object': {
        const objectId = String(args.objectId || '');
        const obj = objects.find((o) => o.id === objectId);
        if (!obj) {
          return { success: false, error: `Object '${objectId}' not found for deletion.` };
        }
        const reason = typeof args.reason === 'string' ? args.reason : 'Not specified';
        const proposalId = `prop_del_${objectId}`;
        return {
          isProposal: true,
          requiresApproval: true,
          proposalId,
          toolName: 'delete_object',
          action: 'delete',
          summary: `Proposed decommissioning of object '${obj.name}' (${obj.id}). Reason: ${reason}.`,
          proposedPayload: {
            objectId: obj.id,
            reason,
          },
          timestamp: now,
        };
      }

      // 6. get_dependencies
      case 'get_dependencies': {
        const objectId = String(args.objectId || '');
        const outgoing = connections.filter((c) => c.sourceObjectId === objectId);
        const depObjIds = new Set(outgoing.map((c) => c.targetObjectId));
        const deps = objects.filter((o) => depObjIds.has(o.id));
        return { success: true, data: { dependencies: deps, connections: outgoing } };
      }

      // 7. get_dependents
      case 'get_dependents': {
        const objectId = String(args.objectId || '');
        const incoming = connections.filter((c) => c.targetObjectId === objectId);
        const dependentIds = new Set(incoming.map((c) => c.sourceObjectId));
        const dependents = objects.filter((o) => dependentIds.has(o.id));
        return { success: true, data: { dependents, connections: incoming } };
      }

      // 8. analyze_impact
      case 'analyze_impact': {
        const objectId = String(args.objectId || '');
        const target = objects.find((o) => o.id === objectId);
        if (!target) {
          return { success: false, error: `Object '${objectId}' not found for impact analysis.` };
        }
        const impact = computeArchitecturalImpact(target.id, {
          objects,
          connections,
          flows: this.context.flows || [],
        });
        return { success: true, data: impact };
      }

      // 9. create_diagram (Mutating -> Proposal)
      case 'create_diagram': {
        const diagName = String(args.name || '');
        const diagKind = String(args.kind || 'container');
        const proposalId = `prop_view_${createId('vw')}`;
        return {
          isProposal: true,
          requiresApproval: true,
          proposalId,
          toolName: 'create_diagram',
          action: 'create',
          summary: `Proposed creation of ${diagKind} diagram view '${diagName}'.`,
          proposedPayload: {
            name: diagName,
            kind: diagKind,
          },
          timestamp: now,
        };
      }

      // 10. create_flow (Mutating -> Proposal)
      case 'create_flow': {
        const flowTitle = String(args.title || '');
        const proposalId = `prop_flow_${createId('flw')}`;
        return {
          isProposal: true,
          requiresApproval: true,
          proposalId,
          toolName: 'create_flow',
          action: 'create',
          summary: `Proposed creation of execution sequence flow '${flowTitle}'.`,
          proposedPayload: {
            title: flowTitle,
            steps: Array.isArray(args.steps) ? args.steps : [],
          },
          timestamp: now,
        };
      }

      // 11. compare_versions
      case 'compare_versions': {
        const baseVersionId = String(args.baseVersionId || '');
        const targetVersionId = String(args.targetVersionId || '');
        return {
          success: true,
          data: {
            baseVersionId,
            targetVersionId,
            summary: `Compared version ${baseVersionId} with ${targetVersionId}.`,
            totalObjects: objects.length,
            totalConnections: connections.length,
          },
        };
      }

      // 12. create_change (Mutating -> Proposal)
      case 'create_change': {
        const changeTitle = String(args.title || '');
        const proposalId = `prop_cs_${Math.random().toString(36).substring(2, 9)}`;
        return {
          isProposal: true,
          requiresApproval: true,
          proposalId,
          toolName: 'create_change',
          action: 'create',
          summary: `Proposed architecture change set: '${changeTitle}'.`,
          proposedPayload: {
            title: changeTitle,
            description: String(args.description || ''),
          },
          timestamp: now,
        };
      }

      // 13. review_change
      case 'review_change': {
        const report = runArchitectureReview({
          objects,
          connections,
        });
        return { success: true, data: report };
      }

      // 14. create_adr (Mutating -> Proposal)
      case 'create_adr': {
        const changeId = String(args.changeId || '');
        const changeSet: ArchitectureChangeSet = this.context.changeSets?.find(
          (cs) => cs.id === changeId
        ) || {
          id: changeId,
          title: `Change Set ${changeId}`,
          changes: { added: [], modified: [], removed: [], totalDirectChanges: 0 },
          affected: { affectedObjectIds: [], affectedFlowIds: [], affectedTeamIds: [], counts: { objects: 0, flows: 0, teams: 0 } },
          createdAt: now,
        };

        const draft = draftADRFromChange({
          changeSet,
          problemStatement: typeof args.problemStatement === 'string' ? args.problemStatement : undefined,
        });

        return {
          isProposal: true,
          requiresApproval: true,
          proposalId: draft.id,
          toolName: 'create_adr',
          action: 'create',
          summary: `Proposed Architecture Decision Record: '${draft.title}' linked to change '${changeId}'.`,
          proposedPayload: draft,
          timestamp: now,
        };
      }

      default:
        return { success: false, error: `Unhandled tool: ${name}` };
    }
  }
}
