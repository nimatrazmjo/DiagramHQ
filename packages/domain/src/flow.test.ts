import { describe, expect, it } from 'vitest';
import {
  createFlow,
  updateFlow,
  validateFlowSteps,
  getFlowConnections,
  reorderFlowSteps,
} from './flow';
import { createId, type ConnectionId, type ObjectId } from './ids';
import { InvariantViolationError } from './invariants';
import type { ModelConnection } from './types';

describe('F041 — Flow model', () => {
  const archId = createId('arch');
  const verId = createId('ver');

  const obj1 = createId('app') as ObjectId;
  const obj2 = createId('app') as ObjectId;
  const obj3 = createId('sto') as ObjectId;

  const conn1Id = createId('con');
  const conn2Id = createId('con');
  const conn3Id = createId('con');

  const mockConnections: ModelConnection[] = [
    {
      id: conn1Id,
      architectureId: archId,
      versionId: verId,
      sourceObjectId: obj1,
      targetObjectId: obj2,
      kind: 'sync',
      label: 'HTTP GET /orders',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: conn2Id,
      architectureId: archId,
      versionId: verId,
      sourceObjectId: obj2,
      targetObjectId: obj3,
      kind: 'data',
      label: 'Query DB',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: conn3Id,
      architectureId: archId,
      versionId: verId,
      sourceObjectId: obj2,
      targetObjectId: obj1,
      kind: 'sync',
      label: 'Return Response',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it('builds a flow from existing connections in ordered sequence', () => {
    const flow = createFlow(
      {
        architectureId: archId,
        name: 'Order Lookup Flow',
        description: 'Customer requests order history',
        steps: [
          { connectionId: conn1Id, stepIndex: 0, note: 'Client calls API' },
          { connectionId: conn2Id, stepIndex: 1, note: 'API queries database' },
          { connectionId: conn3Id, stepIndex: 2, note: 'API responds with data' },
        ],
      },
      mockConnections,
    );

    expect(flow.id).toMatch(/^flw_/);
    expect(flow.name).toBe('Order Lookup Flow');
    expect(flow.description).toBe('Customer requests order history');
    expect(flow.steps).toHaveLength(3);
    expect(flow.steps[0].connectionId).toBe(conn1Id);
    expect(flow.steps[0].stepIndex).toBe(0);
    expect(flow.steps[0].note).toBe('Client calls API');
    expect(flow.steps[1].connectionId).toBe(conn2Id);
    expect(flow.steps[1].stepIndex).toBe(1);
    expect(flow.steps[2].connectionId).toBe(conn3Id);
    expect(flow.steps[2].stepIndex).toBe(2);
  });

  it('rejects an invalid step referencing a non-existent connection', () => {
    const invalidConnId = 'con_nonexistent' as ConnectionId;

    expect(() => {
      createFlow(
        {
          architectureId: archId,
          name: 'Invalid Step Flow',
          steps: [
            { connectionId: conn1Id, stepIndex: 0 },
            { connectionId: invalidConnId, stepIndex: 1, note: 'Ghost step' },
          ],
        },
        mockConnections,
      );
    }).toThrow(InvariantViolationError);

    try {
      createFlow(
        {
          architectureId: archId,
          name: 'Invalid Step Flow',
          steps: [{ connectionId: invalidConnId, stepIndex: 0 }],
        },
        mockConnections,
      );
    } catch (e: unknown) {
      const err = e as InvariantViolationError;
      expect(err.code).toBe('INVALID_FLOW_STEPS');
      expect(err.message).toContain('unknown connection "con_nonexistent"');
    }
  });

  it('validates flow steps independently via validateFlowSteps', () => {
    const validResult = validateFlowSteps(
      [
        { connectionId: conn1Id, stepIndex: 0 },
        { connectionId: conn2Id, stepIndex: 1 },
      ],
      mockConnections,
    );
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    const invalidResult = validateFlowSteps(
      [
        { connectionId: conn1Id, stepIndex: 0 },
        { connectionId: 'con_unknown' as ConnectionId, stepIndex: 1 },
      ],
      mockConnections,
    );
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors[0]).toContain('con_unknown');
  });

  it('flow persists independently of diagrams (no view dependency)', () => {
    const flow = createFlow({
      architectureId: archId,
      name: 'Diagram-independent flow',
      steps: [{ connectionId: conn1Id, stepIndex: 0 }],
    });

    // Flow connects model entities directly, with zero references to view IDs or layout coordinates
    expect((flow as Record<string, unknown>).viewId).toBeUndefined();
    expect((flow as Record<string, unknown>).diagramId).toBeUndefined();
    expect(flow.steps[0].connectionId).toBe(conn1Id);
  });

  it('resolves the ordered list of ModelConnection objects for playback and visualization', () => {
    const flow = createFlow(
      {
        architectureId: archId,
        name: 'Resolved Flow',
        steps: [
          { connectionId: conn2Id, stepIndex: 1 },
          { connectionId: conn1Id, stepIndex: 0 },
        ],
      },
      mockConnections,
    );

    const resolved = getFlowConnections(flow, mockConnections);
    expect(resolved).toHaveLength(2);
    // Index 0 was conn1, index 1 was conn2
    expect(resolved[0].id).toBe(conn1Id);
    expect(resolved[1].id).toBe(conn2Id);
  });

  it('updates flow and replaces steps with validation', () => {
    const flow = createFlow(
      {
        architectureId: archId,
        name: 'Initial Flow',
        steps: [{ connectionId: conn1Id, stepIndex: 0 }],
      },
      mockConnections,
    );

    const updated = updateFlow(
      flow,
      {
        name: 'Updated Flow Name',
        steps: [
          { connectionId: conn2Id, stepIndex: 0, note: 'Step 1' },
          { connectionId: conn3Id, stepIndex: 1, note: 'Step 2' },
        ],
      },
      mockConnections,
    );

    expect(updated.name).toBe('Updated Flow Name');
    expect(updated.steps).toHaveLength(2);
    expect(updated.steps[0].connectionId).toBe(conn2Id);
    expect(updated.steps[1].connectionId).toBe(conn3Id);
  });

  it('reorders existing flow steps according to new connection order', () => {
    const flow = createFlow(
      {
        architectureId: archId,
        name: 'Reorder Test',
        steps: [
          { connectionId: conn1Id, stepIndex: 0, note: 'First' },
          { connectionId: conn2Id, stepIndex: 1, note: 'Second' },
          { connectionId: conn3Id, stepIndex: 2, note: 'Third' },
        ],
      },
      mockConnections,
    );

    const reordered = reorderFlowSteps(flow.steps, [conn3Id, conn1Id, conn2Id]);
    expect(reordered[0].connectionId).toBe(conn3Id);
    expect(reordered[0].stepIndex).toBe(0);
    expect(reordered[0].note).toBe('Third');

    expect(reordered[1].connectionId).toBe(conn1Id);
    expect(reordered[1].stepIndex).toBe(1);

    expect(reordered[2].connectionId).toBe(conn2Id);
    expect(reordered[2].stepIndex).toBe(2);
  });

  it('rejects empty flow name', () => {
    expect(() => {
      createFlow({
        architectureId: archId,
        name: '   ',
      });
    }).toThrow(InvariantViolationError);
  });
});
