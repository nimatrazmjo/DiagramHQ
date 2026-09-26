import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import {
  createArchitectureModel,
  createId,
  createPerson,
  isModelIdentical,
  projectPersonToCanvas,
  type Architecture,
  type ModelConnection,
  type Version,
} from '@diagramhq/domain';
import { PersonNode } from './components/canvas/person-node';
import { InfiniteCanvas } from './components/canvas';
import { ArchitectureModelClient } from './lib/model/architecture-model-client';

describe('Person UI Rendering & Canvas Projection (F022)', () => {
  const archId = createId('arch');
  const verId = createId('ver');

  const baseArch: Architecture = {
    id: archId,
    workspaceId: createId('ws'),
    name: 'Enterprise Architecture',
    defaultVersionId: verId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseVersion: Version = {
    id: verId,
    architectureId: archId,
    name: 'main',
    kind: 'main',
    status: 'draft',
    createdAt: new Date(),
  };

  const renderWithFlow = (element: React.ReactElement): string => {
    return renderToString(React.createElement(ReactFlowProvider, null, element));
  };

  const createTestNodeProps = (id: string, data: Record<string, unknown>, selected = false): NodeProps => ({
    id,
    data,
    selected,
    type: 'person',
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
    selectable: true,
    deletable: true,
    draggable: true,
  });

  describe('1. PersonNode Component Rendering', () => {
    it('renders an internal Person with role, department, and actor badge', () => {
      const props = createTestNodeProps('node-person-1', {
        label: 'Alice Engineer',
        role: 'Staff Platform Engineer',
        department: 'Infrastructure',
        external: false,
        email: 'alice@company.com',
        description: 'Oversees Kubernetes and cloud infra',
      });

      const html = renderWithFlow(React.createElement(PersonNode, props));
      expect(html).toContain('data-testid="person-node"');
      expect(html).toContain('Alice Engineer');
      expect(html).toContain('[Role: Staff Platform Engineer]');
      expect(html).toContain('[Dept: Infrastructure]');
      expect(html).toContain('Actor');
      expect(html).not.toContain('External Actor');
      expect(html).toContain('alice@company.com');
      expect(html).toContain('Oversees Kubernetes and cloud infra');
    });

    it('renders an external Person with external badge and role', () => {
      const props = createTestNodeProps('node-person-2', {
        label: 'Banking Customer',
        role: 'Account Holder',
        external: true,
        description: 'Personal banking customer with savings account',
      });

      const html = renderWithFlow(React.createElement(PersonNode, props));
      expect(html).toContain('data-testid="person-node"');
      expect(html).toContain('Banking Customer');
      expect(html).toContain('[Role: Account Holder]');
      expect(html).toContain('External Actor');
      expect(html).toContain('Personal banking customer with savings account');
    });

    it('renders selected visual ring when selected is true', () => {
      const props = createTestNodeProps('node-person-3', {
        label: 'Security Analyst',
      }, true);

      const html = renderWithFlow(React.createElement(PersonNode, props));
      expect(html).toContain('ring-pink-500/30');
    });
  });

  describe('2. Canvas Projection & Model Integration', () => {
    it('mounts InfiniteCanvas with projected Person node', () => {
      const person = createPerson(archId, verId, 'Ops Engineer', {
        role: 'SRE',
        department: 'Site Reliability',
        position: { x: 200, y: 150 },
      });

      const node = projectPersonToCanvas(person);
      expect(node.id).toBe(person.id);
      expect(node.type).toBe('person');
      expect(node.position).toEqual({ x: 200, y: 150 });
      expect(node.data.label).toBe('Ops Engineer');

      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: [node],
          initialEdges: [],
        }),
      );

      expect(html).toContain('data-testid="canvas-status-badge"');
    });

    it('creates Person and connects to System through ArchitectureModelClient with reload identity', async () => {
      const client = new ArchitectureModelClient(createArchitectureModel(baseArch, baseVersion));

      // 1. Create Person
      const person = await client.createObject({
        name: 'Jane Customer',
        kind: 'actor',
        metadata: {
          role: 'Customer',
          external: true,
        },
      });

      // 2. Create System
      const system = await client.createObject({
        name: 'Core Banking API',
        kind: 'system',
      });

      // 3. Connect Person to System
      const conn: ModelConnection = await client.createConnection({
        sourceObjectId: person.id,
        targetObjectId: system.id,
        kind: 'sync',
        label: 'Initiates Payments',
      });

      const snapshot = client.getModel()!;
      expect(snapshot.objects).toHaveLength(2);
      expect(snapshot.connections).toHaveLength(1);

      // 4. Reload identity check
      const reloadedSnapshot = {
        architecture: { ...snapshot.architecture },
        version: { ...snapshot.version },
        objects: [system, person],
        connections: [conn],
      };

      expect(client.isIdenticalTo(reloadedSnapshot)).toBe(true);
      expect(isModelIdentical(snapshot, reloadedSnapshot)).toBe(true);
    });
  });
});
