/**
 * F041 — Flow model — integration spec.
 *
 * Verifies acceptance criteria:
 * - A flow is an ordered list of existing connections
 * - Flow persists independently of diagrams
 * - Test: build a flow from connections; an invalid step is rejected
 */
import { describe, it, expect } from 'vitest';
import {
  createId,
  createArchitectureModel,
  addModelObject,
  addModelConnection,
  createFlow,
  updateFlow,
  getFlowConnections,
  reorderFlowSteps,
  InvariantViolationError,
  type Architecture,
  type Version,
  type ArchitectureId,
  type VersionId,
  type WorkspaceId,
  type ObjectId,
  type ConnectionId,
} from '@diagramhq/domain';

describe('F041 — Flow model (Web / Integration)', () => {
  const archId = createId('arch') as ArchitectureId;
  const wsId = createId('ws') as WorkspaceId;
  const verId = createId('ver') as VersionId;
  const NOW = new Date('2026-01-01T00:00:00Z');

  const arch: Architecture = {
    id: archId,
    workspaceId: wsId,
    name: 'E-commerce Architecture',
    createdAt: NOW,
    updatedAt: NOW,
  };

  const ver: Version = {
    id: verId,
    architectureId: archId,
    name: 'main',
    kind: 'main',
    status: 'approved',
    createdAt: NOW,
  };

  // Build a model with 3 objects and 2 connections
  const webAppId = createId('app') as ObjectId;
  const apiId = createId('app') as ObjectId;
  const dbId = createId('sto') as ObjectId;

  const conn1Id = createId('con') as ConnectionId;
  const conn2Id = createId('con') as ConnectionId;

  let model = createArchitectureModel(arch, ver);

  model = addModelObject(model, {
    id: webAppId,
    architectureId: archId,
    versionId: verId,
    kind: 'application',
    name: 'Storefront Web',
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelObject(model, {
    id: apiId,
    architectureId: archId,
    versionId: verId,
    kind: 'application',
    name: 'Store API',
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelObject(model, {
    id: dbId,
    architectureId: archId,
    versionId: verId,
    kind: 'store',
    name: 'Store Database',
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: conn1Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: webAppId,
    targetObjectId: apiId,
    kind: 'sync',
    label: 'HTTPS REST /checkout',
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: conn2Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: apiId,
    targetObjectId: dbId,
    kind: 'data',
    label: 'SQL INSERT order',
    createdAt: NOW,
    updatedAt: NOW,
  });

  it('builds a flow as an ordered sequence of existing connections', () => {
    const flow = createFlow(
      {
        architectureId: archId,
        name: 'Checkout Flow',
        description: 'Storefront places order via API to database',
        steps: [
          { connectionId: conn1Id, stepIndex: 0, note: 'User initiates checkout' },
          { connectionId: conn2Id, stepIndex: 1, note: 'API writes order record' },
        ],
      },
      model.connections,
    );

    expect(flow.id).toBeDefined();
    expect(flow.name).toBe('Checkout Flow');
    expect(flow.architectureId).toBe(archId);
    expect(flow.steps).toHaveLength(2);

    expect(flow.steps[0]?.connectionId).toBe(conn1Id);
    expect(flow.steps[0]?.stepIndex).toBe(0);
    expect(flow.steps[0]?.note).toBe('User initiates checkout');

    expect(flow.steps[1]?.connectionId).toBe(conn2Id);
    expect(flow.steps[1]?.stepIndex).toBe(1);
    expect(flow.steps[1]?.note).toBe('API writes order record');
  });

  it('rejects an invalid step referencing a non-existent connection', () => {
    const nonexistentConnId = createId('con') as ConnectionId;

    expect(() => {
      createFlow(
        {
          architectureId: archId,
          name: 'Invalid Step Flow',
          steps: [
            { connectionId: conn1Id, stepIndex: 0 },
            { connectionId: nonexistentConnId, stepIndex: 1, note: 'Does not exist' },
          ],
        },
        model.connections,
      );
    }).toThrow(InvariantViolationError);
  });

  it('persists independently of diagrams and views', () => {
    // Flows exist as model entities independently of any diagram or view.
    // They reference connections directly, not view layout coordinates or view IDs.
    const flow = createFlow(
      {
        architectureId: archId,
        name: 'Independent Flow',
        steps: [{ connectionId: conn1Id, stepIndex: 0 }],
      },
      model.connections,
    );

    expect(flow.architectureId).toBe(archId);
    const flowRecord = flow as unknown as Record<string, unknown>;
    expect(flowRecord['viewId']).toBeUndefined();
    expect(flowRecord['diagramId']).toBeUndefined();

    // Resolving connections works over the architecture model without any view
    const connections = getFlowConnections(flow, model.connections);
    expect(connections).toHaveLength(1);
    expect(connections[0]?.id).toBe(conn1Id);
    expect(connections[0]?.label).toBe('HTTPS REST /checkout');
  });

  it('supports updating and reordering steps', () => {
    const flow = createFlow(
      {
        architectureId: archId,
        name: 'Initial Flow',
        steps: [
          { connectionId: conn1Id, stepIndex: 0 },
          { connectionId: conn2Id, stepIndex: 1 },
        ],
      },
      model.connections,
    );

    const reordered = reorderFlowSteps(flow.steps, [conn2Id, conn1Id]);
    expect(reordered[0]?.connectionId).toBe(conn2Id);
    expect(reordered[0]?.stepIndex).toBe(0);
    expect(reordered[1]?.connectionId).toBe(conn1Id);
    expect(reordered[1]?.stepIndex).toBe(1);

    const updated = updateFlow(
      flow,
      {
        name: 'Renamed Flow',
        description: 'New description',
        steps: [{ connectionId: conn1Id, stepIndex: 0, note: 'Updated note' }],
      },
      model.connections,
    );

    expect(updated.name).toBe('Renamed Flow');
    expect(updated.description).toBe('New description');
    expect(updated.steps).toHaveLength(1);
    expect(updated.steps[0]?.note).toBe('Updated note');
  });
});
