import { describe, it, expect } from 'vitest';
import type {
  ArchitectureId,
  VersionId,
  ObjectId,
  ConnectionId,
} from './ids';
import type { ModelObject, ModelConnection } from './types';
import type { MCPArchitectureContext } from './mcp-server';
import {
  SpecializedAgentDispatcher,
  SPECIALIZED_AGENT_REGISTRY,
  type SpecializedAgentRole,
} from './specialized-agents';

describe('Specialized Role Agents on the MCP Surface (F121)', () => {
  const archId = 'arch-test-specialized' as ArchitectureId;
  const verId = 'ver-v1' as VersionId;

  const edgeApp: ModelObject = {
    id: 'app-edge' as ObjectId,
    architectureId: archId,
    versionId: verId,
    name: 'Edge API Gateway',
    kind: 'application',
    position: { x: 100, y: 100 },
    description: 'Reverse proxy and auth boundary',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const orderApp: ModelObject = {
    id: 'app-orders' as ObjectId,
    architectureId: archId,
    versionId: verId,
    name: 'Order Service',
    kind: 'application',
    position: { x: 300, y: 100 },
    description: 'Order processing and checkout orchestrator',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const dbStore: ModelObject = {
    id: 'sto-db' as ObjectId,
    architectureId: archId,
    versionId: verId,
    name: 'Primary PostgreSQL DB',
    kind: 'store',
    position: { x: 500, y: 100 },
    description: 'Primary ACID database',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const conn1: ModelConnection = {
    id: 'con-edge-orders' as ConnectionId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: edgeApp.id,
    targetObjectId: orderApp.id,
    label: 'Forward API',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const conn2: ModelConnection = {
    id: 'con-orders-db' as ConnectionId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: orderApp.id,
    targetObjectId: dbStore.id,
    label: 'Persist Orders',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const context: MCPArchitectureContext = {
    objects: [edgeApp, orderApp, dbStore],
    connections: [conn1, conn2],
    views: [],
    flows: [],
    changeSets: [],
    adrs: [],
    activeVersionId: verId,
  };

  const dispatcher = new SpecializedAgentDispatcher(context);

  it('exposes all 7 specialized agent metadata records in the registry', () => {
    const roles: SpecializedAgentRole[] = [
      'analyst',
      'designer',
      'security',
      'cloud',
      'documentation',
      'migration',
      'code',
    ];

    expect(Object.keys(SPECIALIZED_AGENT_REGISTRY)).toHaveLength(7);
    for (const role of roles) {
      const meta = SPECIALIZED_AGENT_REGISTRY[role];
      expect(meta).toBeDefined();
      expect(meta.role).toBe(role);
      expect(meta.preferredMCPTools.length).toBeGreaterThan(0);
    }
  });

  describe('Acceptance Criteria: Each agent completes a scoped task over the MCP surface', () => {
    it('1. Analyst Agent completes domain boundary and coupling analysis', async () => {
      const result = await dispatcher.executeTask({
        role: 'analyst',
        instruction: 'Evaluate coupling index and fan-in/fan-out for the order service',
        targetObjectId: orderApp.id,
      });

      expect(result.status).toBe('completed');
      expect(result.role).toBe('analyst');
      expect(result.findings.analyzedObjectId).toBe(orderApp.id);
      expect(result.findings.fanIn).toBe(1);
      expect(result.findings.fanOut).toBe(1);
      expect(result.findings.couplingDegree).toBe(2);
      expect(result.mcpToolsInvoked.map((t) => t.toolName)).toContain('get_dependencies');
      expect(result.mcpToolsInvoked.map((t) => t.toolName)).toContain('get_dependents');
    });

    it('2. Designer Agent formulates a C4 topology proposal via MCP create_object', async () => {
      const result = await dispatcher.executeTask({
        role: 'designer',
        instruction: 'Propose an in-memory Redis cache between orders and database',
        parameters: { name: 'Redis Cache Cluster', kind: 'store' },
      });

      expect(result.status).toBe('completed');
      expect(result.role).toBe('designer');
      expect(result.mcpToolsInvoked[0]?.toolName).toBe('create_object');
      expect(result.mcpToolsInvoked[0]?.isMutating).toBe(true);

      // Proposal returned with required approval
      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0]?.isProposal).toBe(true);
      expect(result.proposals[0]?.requiresApproval).toBe(true);
      expect(result.proposals[0]?.summary).toContain('Redis Cache Cluster');
    });

    it('3. Security Agent executes blast-radius and perimeter ingress audit', async () => {
      const result = await dispatcher.executeTask({
        role: 'security',
        instruction: 'Audit datastore security and calculate blast radius for database',
        targetObjectId: dbStore.id,
      });

      expect(result.status).toBe('completed');
      expect(result.role).toBe('security');
      expect(result.findings.inspectedTarget).toBe(dbStore.id);
      expect(result.findings.downstreamBlastRadius).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.mcpToolsInvoked.map((t) => t.toolName)).toContain('analyze_impact');
    });

    it('4. Cloud Agent evaluates cloud infrastructure and datastore reliability', async () => {
      const result = await dispatcher.executeTask({
        role: 'cloud',
        instruction: 'Review high-availability and multi-AZ setup for persistent datastores',
      });

      expect(result.status).toBe('completed');
      expect(result.role).toBe('cloud');
      expect(result.findings.totalComponents).toBe(3);
      expect(result.findings.datastoreCount).toBe(1);
      expect(result.findings.highAvailabilityScore).toBeGreaterThanOrEqual(90);
    });

    it('5. Documentation Agent synthesizes grounded Markdown technical specification', async () => {
      const result = await dispatcher.executeTask({
        role: 'documentation',
        instruction: 'Generate C4 catalog specification for the order service',
        targetObjectId: orderApp.id,
      });

      expect(result.status).toBe('completed');
      expect(result.role).toBe('documentation');
      expect(result.findings.documentedObjectId).toBe(orderApp.id);
      const markdown = result.findings.markdownDocument as string;
      expect(markdown).toContain('# Architecture Catalog: Order Service');
      expect(markdown).toContain('Order processing and checkout orchestrator');
    });

    it('6. Migration Agent creates phased transition change proposal', async () => {
      const result = await dispatcher.executeTask({
        role: 'migration',
        instruction: 'Plan phased migration from monolithic database to distributed cluster',
        parameters: { title: 'PostgreSQL Distributed Sharding Migration' },
      });

      expect(result.status).toBe('completed');
      expect(result.role).toBe('migration');
      expect(result.findings.changeProposalTitle).toBe('PostgreSQL Distributed Sharding Migration');
      expect(result.mcpToolsInvoked.map((t) => t.toolName)).toContain('create_change');
      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0]?.isProposal).toBe(true);
    });

    it('7. Code Agent verifies repository-to-model mapping and drift detection', async () => {
      const result = await dispatcher.executeTask({
        role: 'code',
        instruction: 'Verify codebase AST references against model objects',
        parameters: { repo: 'github.com/acme/order-service' },
      });

      expect(result.status).toBe('completed');
      expect(result.role).toBe('code');
      expect(result.findings.verifiedObjectsCount).toBe(3);
      expect(result.findings.driftDetected).toBe(false);
      expect(result.findings.sourceRepo).toBe('github.com/acme/order-service');
    });
  });
});
