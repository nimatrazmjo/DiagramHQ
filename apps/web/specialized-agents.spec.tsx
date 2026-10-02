import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  SpecializedAgentDispatcher,
  SPECIALIZED_AGENT_REGISTRY,
  type SpecializedAgentRole,
  type MCPArchitectureContext,
  type ModelObject,
  type ModelConnection,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
} from '@diagramhq/domain';
import {
  SpecializedAgentSelector,
  SpecializedAgentResultCard,
  SpecializedAgentDrawer,
} from './components/canvas/specialized-agents-panel';

describe('Specialized AI Role Agents on MCP Surface (F121)', () => {
  const archId = 'arch-spec-agents-web' as ArchitectureId;
  const verId = 'ver-v1' as VersionId;

  const ordersApp: ModelObject = {
    id: 'app-orders' as ObjectId,
    architectureId: archId,
    versionId: verId,
    name: 'Order Service',
    kind: 'application',
    position: { x: 100, y: 100 },
    description: 'Processes checkout and billing transactions',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const inventoryApp: ModelObject = {
    id: 'app-inventory' as ObjectId,
    architectureId: archId,
    versionId: verId,
    name: 'Inventory Service',
    kind: 'application',
    position: { x: 300, y: 100 },
    description: 'Tracks warehouse stock and SKU reservations',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const dbStore: ModelObject = {
    id: 'sto-db' as ObjectId,
    architectureId: archId,
    versionId: verId,
    name: 'Transactional PostgreSQL',
    kind: 'store',
    position: { x: 500, y: 100 },
    description: 'Persistent ACID datastore',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const conn1: ModelConnection = {
    id: 'con-orders-inv' as ConnectionId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: ordersApp.id,
    targetObjectId: inventoryApp.id,
    label: 'Reserve Stock',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const conn2: ModelConnection = {
    id: 'con-inv-db' as ConnectionId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: inventoryApp.id,
    targetObjectId: dbStore.id,
    label: 'Query Inventory',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const context: MCPArchitectureContext = {
    objects: [ordersApp, inventoryApp, dbStore],
    connections: [conn1, conn2],
    views: [],
    flows: [],
    changeSets: [],
    adrs: [],
    activeVersionId: verId,
  };

  const dispatcher = new SpecializedAgentDispatcher(context);

  it('acceptance test: each of the 7 specialized agents completes a scoped task on the MCP surface', async () => {
    const roles: SpecializedAgentRole[] = [
      'analyst',
      'designer',
      'security',
      'cloud',
      'documentation',
      'migration',
      'code',
    ];

    for (const role of roles) {
      const result = await dispatcher.executeTask({
        role,
        instruction: `Run scoped verification task for role: ${role}`,
        targetObjectId: dbStore.id,
      });

      expect(result.status).toBe('completed');
      expect(result.role).toBe(role);
      expect(result.mcpToolsInvoked.length).toBeGreaterThan(0);
      expect(result.completedAt).toBeDefined();
    }
  });

  it('verifies mutating agent tasks (designer, migration) produce reviewable proposals', async () => {
    // Designer
    const designerRes = await dispatcher.executeTask({
      role: 'designer',
      instruction: 'Design an event broker',
      parameters: { name: 'Kafka Event Bus', kind: 'store' },
    });
    expect(designerRes.proposals).toHaveLength(1);
    expect(designerRes.proposals[0]?.isProposal).toBe(true);
    expect(designerRes.proposals[0]?.requiresApproval).toBe(true);

    // Migration
    const migrationRes = await dispatcher.executeTask({
      role: 'migration',
      instruction: 'Plan phased queue migration',
      parameters: { title: 'Async Queue Cutover' },
    });
    expect(migrationRes.proposals).toHaveLength(1);
    expect(migrationRes.proposals[0]?.isProposal).toBe(true);
  });

  it('renders SpecializedAgentSelector with all 7 agent role options', () => {
    const html = renderToString(
      <SpecializedAgentSelector
        selectedRole="analyst"
        onSelectRole={vi.fn()}
        onRunTask={vi.fn()}
      />,
    );

    for (const role of Object.keys(SPECIALIZED_AGENT_REGISTRY)) {
      expect(html).toContain(`data-testid="agent-card-${role}"`);
    }
    expect(html).toContain('Domain Boundaries &amp; Coupling Analyst');
    expect(html).toContain('MCP Tool Surface:');
  });

  it('renders SpecializedAgentResultCard with tools invoked, findings, and proposal approvals', async () => {
    const designerRes = await dispatcher.executeTask({
      role: 'designer',
      instruction: 'Propose Redis cluster',
      parameters: { name: 'Redis Cache Cluster', kind: 'store' },
    });

    const html = renderToString(
      <SpecializedAgentResultCard
        result={designerRes}
        onApproveProposal={vi.fn()}
      />,
    );

    expect(html).toContain('designer Agent');
    expect(html).toContain('COMPLETED');
    expect(html).toContain('create_object');
    expect(html).toContain('PROPOSAL');
    expect(html).toContain('Reviewable Proposals Generated');
    expect(html).toContain('Approve Proposal');
  });

  it('renders SpecializedAgentDrawer modal with activity history', async () => {
    const analystRes = await dispatcher.executeTask({
      role: 'analyst',
      instruction: 'Inspect system',
    });

    const html = renderToString(
      <SpecializedAgentDrawer
        isOpen={true}
        onClose={vi.fn()}
        results={[analystRes]}
        onRunTask={vi.fn()}
      />,
    );

    expect(html).toContain('Specialized AI Role Agents on MCP');
    expect(html).toContain('Agent Execution Activity');
    expect(html).toContain('analyst Agent');
  });
});
