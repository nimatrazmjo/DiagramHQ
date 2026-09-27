import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DatabaseNode } from './components/canvas/database-node';
import { createId, createDatabase, projectDatabaseToCanvas } from '@diagramhq/domain';
import React from 'react';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';

const createTestNodeProps = (id: string, data: Record<string, unknown>, selected = false): NodeProps => ({
  id, data, selected, type: 'database', zIndex: 0, isConnectable: true,
  positionAbsoluteX: 0, positionAbsoluteY: 0, dragging: false, selectable: true, deletable: true, draggable: true
});

describe('Database UI (F026)', () => {
  it('renders database-node with kind badge', () => {
    const html = renderToString(React.createElement(ReactFlowProvider, null, React.createElement(DatabaseNode, createTestNodeProps('db_1', { label: 'Users DB', databaseKind: 'postgresql' })))) ;
    expect(html).toContain('data-testid="database-node"');
    expect(html).toContain('[Database: PostgreSQL]');
  });

  it('renders redis variant', () => {
    const html = renderToString(React.createElement(ReactFlowProvider, null, React.createElement(DatabaseNode, createTestNodeProps('db_1', { label: 'Cache', databaseKind: 'redis' })))) ;
    expect(html).toContain('border-red-600/70');
  });

  it('renders selected ring', () => {
    const html = renderToString(React.createElement(ReactFlowProvider, null, React.createElement(DatabaseNode, createTestNodeProps('db_1', { label: 'DB' }, true)))) ;
    expect(html).toContain('ring-2 ring-purple-400');
  });

  it('canvas projection matches node props', () => {
    const db = createDatabase(createId('arch'), createId('ver'), 'AuthDB', { databaseKind: 'mysql' });
    const node = projectDatabaseToCanvas(db);
    expect(node.type).toBe('database');
    expect(node.data.databaseKind).toBe('mysql');
  });

  it('ArchitectureModelClient integration placeholder', () => {
    expect(true).toBe(true);
  });
});
