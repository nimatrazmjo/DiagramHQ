import { describe, it, expect } from 'vitest';
import {
  DiagramHQMCPServer,
  type MCPArchitectureContext,
  type MCPToolProposal,
  type MCPToolSuccessResult,
} from './mcp-server';
import type { ObjectId, ConnectionId, ArchitectureId, VersionId } from './ids';
import type { ModelObject, ModelConnection } from './types';

describe('Model Context Protocol (MCP) Tool Server (F071)', () => {
  const archId = 'arch-mcp-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  const edgeService: ModelObject = {
    id: 'app-edge' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Edge Gateway',
    kind: 'application',
    position: { x: 100, y: 100 },
    description: 'Reverse proxy and TLS termination',
    metadata: { owner: 'Infra' },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const authService: ModelObject = {
    id: 'app-auth' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Auth Service',
    kind: 'application',
    position: { x: 300, y: 100 },
    description: 'OAuth2 and token validation',
    metadata: { owner: 'Security' },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const edgeToAuthConn: ModelConnection = {
    id: 'con-edge-auth' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: edgeService.id,
    targetObjectId: authService.id,
    label: 'Validate Token',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const context: MCPArchitectureContext = {
    objects: [edgeService, authService],
    connections: [edgeToAuthConn],
    activeVersionId: v1,
  };

  it('1. Exposes all 14 official DiagramHQ MCP tools with correct schemas', () => {
    const server = new DiagramHQMCPServer(context);
    const tools = server.listTools();

    expect(tools.length).toBe(14);
    const toolNames = tools.map((t) => t.name);

    const requiredTools = [
      'search_architecture',
      'get_object',
      'create_object',
      'update_object',
      'delete_object',
      'get_dependencies',
      'get_dependents',
      'analyze_impact',
      'create_diagram',
      'create_flow',
      'compare_versions',
      'create_change',
      'review_change',
      'create_adr',
    ];

    for (const reqTool of requiredTools) {
      expect(toolNames).toContain(reqTool);
    }
  });

  it('2. Acceptance Test: create_object returns an explicit reviewable proposal, never a silent commit', async () => {
    const server = new DiagramHQMCPServer(context);

    const result = await server.executeTool('create_object', {
      name: 'Redis Cache',
      kind: 'store',
      description: 'Distributed session cache',
      technologies: ['Redis', 'Docker'],
    });

    expect(result).toBeDefined();
    // Key Invariant: isProposal is true, requiresApproval is true
    expect('isProposal' in result && result.isProposal).toBe(true);
    if ('isProposal' in result) {
      const proposal = result as MCPToolProposal;
      expect(proposal.requiresApproval).toBe(true);
      expect(proposal.toolName).toBe('create_object');
      expect(proposal.action).toBe('create');
      expect(proposal.summary).toContain("Proposed creation of store component 'Redis Cache'");
      expect(proposal.proposalId).toBeDefined();
    }

    // Invariant: The active context was NOT silently mutated
    expect(server.getContext().objects.length).toBe(2);
    expect(server.getContext().objects.some((o) => o.name === 'Redis Cache')).toBe(false);
  });

  it('3. Acceptance Test: Mutating tools (update_object, delete_object, create_diagram, create_flow, create_change, create_adr) return proposals', async () => {
    const server = new DiagramHQMCPServer(context);

    // update_object
    const updateRes = await server.executeTool('update_object', {
      objectId: edgeService.id,
      name: 'Global Edge Gateway',
    });
    expect('isProposal' in updateRes && updateRes.isProposal).toBe(true);

    // delete_object
    const deleteRes = await server.executeTool('delete_object', {
      objectId: authService.id,
      reason: 'Replacing with cloud identity provider',
    });
    expect('isProposal' in deleteRes && deleteRes.isProposal).toBe(true);

    // create_diagram
    const diagramRes = await server.executeTool('create_diagram', {
      name: 'Security Boundary View',
      kind: 'security',
    });
    expect('isProposal' in diagramRes && diagramRes.isProposal).toBe(true);

    // create_flow
    const flowRes = await server.executeTool('create_flow', {
      title: 'Customer Authentication Flow',
      steps: [{ sequenceNumber: 1, name: 'Authenticate' }],
    });
    expect('isProposal' in flowRes && flowRes.isProposal).toBe(true);

    // create_change
    const changeRes = await server.executeTool('create_change', {
      title: 'Upgrade Edge Gateway',
    });
    expect('isProposal' in changeRes && changeRes.isProposal).toBe(true);

    // create_adr
    const adrRes = await server.executeTool('create_adr', {
      changeId: 'cs-edge-upgrade-01',
      problemStatement: 'Need rate limiting at edge',
    });
    expect('isProposal' in adrRes && adrRes.isProposal).toBe(true);
  });

  it('4. Acceptance Test: Each query tool is callable and returns structured query results', async () => {
    interface SearchData {
      matches: ModelObject[];
      total: number;
    }
    interface ObjectData {
      object: ModelObject;
      inboundConnections: ModelConnection[];
      outboundConnections: ModelConnection[];
    }
    interface DependenciesData {
      dependencies: ModelObject[];
      connections: ModelConnection[];
    }
    interface DependentsData {
      dependents: ModelObject[];
      connections: ModelConnection[];
    }
    interface ImpactData {
      targetObject: ModelObject;
    }
    interface ReviewData {
      verdict: string;
    }

    const server = new DiagramHQMCPServer(context);

    // search_architecture
    const searchRes = (await server.executeTool('search_architecture', {
      query: 'edge',
    })) as MCPToolSuccessResult<SearchData>;
    expect(searchRes.success).toBe(true);
    expect(searchRes.data.matches.length).toBe(1);

    // get_object
    const getRes = (await server.executeTool('get_object', {
      objectId: edgeService.id,
    })) as MCPToolSuccessResult<ObjectData>;
    expect(getRes.success).toBe(true);
    expect(getRes.data.object.name).toBe('Edge Gateway');
    expect(getRes.data.outboundConnections.length).toBe(1);

    // get_dependencies (edge depends on auth)
    const depsRes = (await server.executeTool('get_dependencies', {
      objectId: edgeService.id,
    })) as MCPToolSuccessResult<DependenciesData>;
    expect(depsRes.success).toBe(true);
    expect(depsRes.data.dependencies.length).toBe(1);
    expect(depsRes.data.dependencies[0].id).toBe(authService.id);

    // get_dependents (auth has dependent edge)
    const dependentsRes = (await server.executeTool('get_dependents', {
      objectId: authService.id,
    })) as MCPToolSuccessResult<DependentsData>;
    expect(dependentsRes.success).toBe(true);
    expect(dependentsRes.data.dependents.length).toBe(1);
    expect(dependentsRes.data.dependents[0].id).toBe(edgeService.id);

    // analyze_impact
    const impactRes = (await server.executeTool('analyze_impact', {
      objectId: authService.id,
    })) as MCPToolSuccessResult<ImpactData>;
    expect(impactRes.success).toBe(true);
    expect(impactRes.data.targetObject.id).toBe(authService.id);

    // compare_versions
    const compareRes = (await server.executeTool('compare_versions', {
      baseVersionId: 'ver-v1',
      targetVersionId: 'ver-v2',
    })) as MCPToolSuccessResult;
    expect(compareRes.success).toBe(true);

    // review_change
    const reviewRes = (await server.executeTool('review_change', {})) as MCPToolSuccessResult<ReviewData>;
    expect(reviewRes.success).toBe(true);
    expect(reviewRes.data.verdict).toBeDefined();
  });
});
