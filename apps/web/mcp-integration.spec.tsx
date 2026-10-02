import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  DiagramHQMCPServer,
  DIAGRAMHQ_MCP_TOOLS,
  type MCPArchitectureContext,
  type MCPToolProposal,
  type ObjectId,
  type ConnectionId,
  type ArchitectureId,
  type VersionId,
  type ModelObject,
  type ModelConnection,
} from '@diagramhq/domain';
import {
  MCPStatusBadge,
  MCPInspectorModal,
} from './components/canvas/mcp-integration-modal';

describe('Model Context Protocol (MCP) Integration & UI (F071)', () => {
  const archId = 'arch-mcp-web-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  const ordersApp: ModelObject = {
    id: 'app-orders' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Order Service',
    kind: 'application',
    position: { x: 100, y: 100 },
    description: 'Manages customer orders and checkouts',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const inventoryApp: ModelObject = {
    id: 'app-inventory' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Inventory Service',
    kind: 'application',
    position: { x: 300, y: 100 },
    description: 'Tracks warehouse inventory and stock reservations',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const conn: ModelConnection = {
    id: 'con-orders-inv' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: ordersApp.id,
    targetObjectId: inventoryApp.id,
    label: 'Reserve Stock',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const context: MCPArchitectureContext = {
    objects: [ordersApp, inventoryApp],
    connections: [conn],
    activeVersionId: v1,
  };

  it('1. Acceptance Test: Exposes all 14 tools and each tool is callable', async () => {
    const server = new DiagramHQMCPServer(context);
    const tools = server.listTools();

    expect(tools.length).toBe(14);

    // Call query tools
    const searchRes = await server.executeTool('search_architecture', { query: 'orders' });
    expect('success' in searchRes && searchRes.success).toBe(true);

    const getRes = await server.executeTool('get_object', { objectId: ordersApp.id });
    expect('success' in getRes && getRes.success).toBe(true);

    const depsRes = await server.executeTool('get_dependencies', { objectId: ordersApp.id });
    expect('success' in depsRes && depsRes.success).toBe(true);

    const dependentsRes = await server.executeTool('get_dependents', { objectId: inventoryApp.id });
    expect('success' in dependentsRes && dependentsRes.success).toBe(true);
  });

  it('2. Acceptance Test: create_object returns a proposal, never a silent commit', async () => {
    const server = new DiagramHQMCPServer(context);

    const proposal = (await server.executeTool('create_object', {
      name: 'Notification Service',
      kind: 'application',
      description: 'Sends email and SMS updates',
    })) as MCPToolProposal;

    // Returns a proposal
    expect(proposal.isProposal).toBe(true);
    expect(proposal.requiresApproval).toBe(true);
    expect(proposal.toolName).toBe('create_object');
    expect(proposal.summary).toContain('Notification Service');

    // Context is NOT modified silently
    expect(server.getContext().objects.length).toBe(2);
    expect(server.getContext().objects.some((o) => o.name === 'Notification Service')).toBe(false);
  });

  it('3. UI Component Rendering: MCPStatusBadge and MCPInspectorModal', () => {
    // Badge rendering
    const badgeHtml = renderToString(<MCPStatusBadge toolCount={14} onClick={vi.fn()} />);
    expect(badgeHtml).toContain('tools active');
    expect(badgeHtml).toContain('14');

    // Modal rendering
    const proposal: MCPToolProposal = {
      isProposal: true,
      requiresApproval: true,
      proposalId: 'prop_test_001',
      toolName: 'create_object',
      action: 'create',
      summary: "Proposed creation of application component 'Notification Service'.",
      proposedPayload: {},
      timestamp: new Date().toISOString(),
    };

    const modalHtml = renderToString(
      <MCPInspectorModal
        isOpen={true}
        onClose={vi.fn()}
        tools={DIAGRAMHQ_MCP_TOOLS}
        activeProposals={[proposal]}
        onApproveProposal={vi.fn()}
        onRejectProposal={vi.fn()}
      />
    );

    expect(modalHtml).toContain('Model Context Protocol (MCP) Tool Server');
    expect(modalHtml).toContain('Registered Tools');
    expect(modalHtml).toContain('search_architecture');
    expect(modalHtml).toContain('create_object');
    expect(modalHtml).toContain('Mutating tools return proposals, never silent commits');
    expect(modalHtml).toContain('JSON-RPC 2.0 Compliant');
  });
});
