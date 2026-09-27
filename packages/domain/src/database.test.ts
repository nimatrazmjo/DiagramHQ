import { describe, expect, it } from 'vitest';
import {
  createDatabase,
  isDatabase,
  projectDatabaseToCanvas,
} from './database';
import type { ModelObject } from './types';

describe('Database Domain (F026)', () => {
  it('creates database with kind, technology, and schema', () => {
    const db = createDatabase('arch_1', 'ver_1', 'UsersDB', {
      databaseKind: 'postgresql',
      technology: 'PostgreSQL 14',
      schema: 'public',
      version: '1.0',
    });
    expect(db.kind).toBe('store');
    expect(db.id.startsWith('sto_')).toBe(true);
    expect(db.metadata?.databaseKind).toBe('postgresql');
    expect(db.metadata?.technology).toBe('PostgreSQL 14');
    expect(db.metadata?.schema).toBe('public');
    expect(db.metadata?.version).toBe('1.0');
    expect(db.metadata?.c4Kind).toBe('database');
  });

  it('creates standalone database without parent', () => {
    const db = createDatabase('arch_1', 'ver_1', 'CacheDB', {
      databaseKind: 'redis',
    });
    expect(db.parentId).toBeNull();
    expect(db.metadata?.databaseKind).toBe('redis');
  });

  it('discriminates non-database', () => {
    const db = createDatabase('arch_1', 'ver_1', 'DB');
    expect(isDatabase(db)).toBe(true);
    
    expect(isDatabase({ kind: 'component' } as unknown as ModelObject)).toBe(false);
    expect(isDatabase({ kind: 'store', metadata: { storeKind: 'queue' } } as unknown as ModelObject)).toBe(false);
  });

  it('projects to canvas node', () => {
    const db = createDatabase('arch_1', 'ver_1', 'UsersDB', {
      databaseKind: 'postgresql',
      technology: 'PostgreSQL 14',
      schema: 'public',
      description: 'Users table',
      position: { x: 50, y: 60 },
    });
    const node = projectDatabaseToCanvas(db);
    expect(node.id).toBe(db.id);
    expect(node.type).toBe('database');
    expect(node.width).toBe(220);
    expect(node.height).toBe(130);
    expect(node.position).toEqual({ x: 50, y: 60 });
    expect(node.data.label).toBe('UsersDB');
    expect(node.data.databaseKind).toBe('postgresql');
    expect(node.data.technology).toBe('PostgreSQL 14');
    expect(node.data.schema).toBe('public');
    expect(node.data.description).toBe('Users table');
    expect(node.data.databaseId).toBe(db.id);
  });
});
