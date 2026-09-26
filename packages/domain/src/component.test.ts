import { describe, it, expect } from 'vitest';
import {
  createComponent,
  createId,
  isComponent,
  projectComponentToCanvas,
  type ModelObject,
} from './';

describe('Component Domain Module (F025)', () => {
  const archId = createId('arch');
  const verId = createId('ver');
  const appId = createId('app');

  it('creates a Component with technology, interfaces, and codeRef', () => {
    const comp = createComponent(archId, verId, 'Auth Service', {
      parentId: appId,
      componentKind: 'service',
      technology: 'NestJS / TypeScript',
      interfaces: ['POST /auth/login', 'POST /auth/refresh'],
      codeRef: 'src/auth/auth.service.ts',
      description: 'Handles token generation, validation, and session refresh',
    });

    expect(comp.id.startsWith('cmp_')).toBe(true);
    expect(comp.kind).toBe('component');
    expect(comp.parentId).toBe(appId);
    expect(comp.name).toBe('Auth Service');
    expect(comp.metadata?.componentKind).toBe('service');
    expect(comp.metadata?.technology).toBe('NestJS / TypeScript');
    expect(comp.metadata?.interfaces).toEqual(['POST /auth/login', 'POST /auth/refresh']);
    expect(comp.metadata?.codeRef).toBe('src/auth/auth.service.ts');
    expect(comp.metadata?.c4Level).toBe(3);
    expect(isComponent(comp)).toBe(true);
  });

  it('creates a standalone Component without a parent container', () => {
    const libComp = createComponent(archId, verId, 'Crypto Utility', {
      componentKind: 'utility',
      technology: 'Web Crypto API',
    });

    expect(libComp.parentId).toBeNull();
    expect(libComp.metadata?.componentKind).toBe('utility');
    expect(isComponent(libComp)).toBe(true);
  });

  it('correctly discriminates non-component objects', () => {
    const app: ModelObject = {
      id: createId('app'),
      architectureId: archId,
      versionId: verId,
      kind: 'application',
      name: 'Auth API',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(isComponent(app)).toBe(false);
  });

  it('projects Component to a canvas node', () => {
    const comp = createComponent(archId, verId, 'User Repository', {
      parentId: appId,
      componentKind: 'repository',
      technology: 'Prisma Client',
      codeRef: 'src/users/user.repository.ts',
      position: { x: 300, y: 220 },
    });

    const node = projectComponentToCanvas(comp);
    expect(node.id).toBe(comp.id);
    expect(node.type).toBe('component');
    expect(node.position).toEqual({ x: 300, y: 220 });
    expect(node.data.label).toBe('User Repository');
    expect(node.data.componentKind).toBe('repository');
    expect(node.data.technology).toBe('Prisma Client');
    expect(node.data.codeRef).toBe('src/users/user.repository.ts');
    expect(node.data.parentId).toBe(appId);
    expect(node.width).toBe(220);
    expect(node.height).toBe(140);
  });
});
