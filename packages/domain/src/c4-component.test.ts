import { describe, it, expect } from 'vitest';
import {
  createC4Component,
  createC4Controller,
  createC4DomainService,
  createC4Repository,
  createC4WebApp,
  createId,
  getC4ComponentKind,
  getContainerComponents,
  isComponent,
  isComponentOfContainer,
  projectC4ComponentToCanvas,
  type ModelConnection,
} from './';

describe('C4 Component Domain Module (F021)', () => {
  const archId = createId('arch');
  const verId = createId('ver');
  const sysId = createId('sys');
  const container = createC4WebApp(archId, verId, sysId, 'API Gateway', 'NestJS');

  it('correctly creates components with kind, technology, and L4 code mapping stub', () => {
    const controller = createC4Controller(
      archId,
      verId,
      container.id,
      'Accounts Controller',
      'NestJS Controller',
      'Provides REST endpoints for bank accounts',
    );

    expect(controller.parentId).toBe(container.id);
    expect(controller.kind).toBe('component');
    expect(controller.metadata?.componentKind).toBe('controller');
    expect(controller.metadata?.technology).toBe('NestJS Controller');
    expect(isComponent(controller)).toBe(true);
    expect(isComponentOfContainer(controller, container.id)).toBe(true);
    expect(controller.metadata?.codeMappingStub).toEqual({
      filePath: 'src/accounts-controller.ts',
      symbol: 'AccountsController',
    });

    const service = createC4DomainService(
      archId,
      verId,
      container.id,
      'Transfer Service',
      'NestJS Service',
      'Executes fund transfers',
    );
    expect(service.parentId).toBe(container.id);
    expect(service.metadata?.componentKind).toBe('service');

    const repo = createC4Repository(
      archId,
      verId,
      container.id,
      'Account Repository',
      'Prisma ORM',
    );
    expect(repo.parentId).toBe(container.id);
    expect(repo.metadata?.componentKind).toBe('repository');

    const customCmp = createC4Component(archId, verId, container.id, 'Auth Middleware', {
      componentKind: 'middleware',
      technology: 'JWT Verifier',
      codeMappingStub: {
        repositoryUrl: 'https://github.com/diagramhq/diagramhq',
        filePath: 'src/auth/jwt.middleware.ts',
        symbol: 'JwtMiddleware',
      },
    });
    expect(customCmp.metadata?.componentKind).toBe('middleware');
    expect(customCmp.metadata?.codeMappingStub).toEqual({
      repositoryUrl: 'https://github.com/diagramhq/diagramhq',
      filePath: 'src/auth/jwt.middleware.ts',
      symbol: 'JwtMiddleware',
    });
  });

  it('filters components of a container correctly', () => {
    const otherContainerId = createId('app');
    const cmp1 = createC4Controller(archId, verId, container.id, 'Cmp 1');
    const cmp2 = createC4DomainService(archId, verId, container.id, 'Cmp 2');
    const otherCmp = createC4Repository(archId, verId, otherContainerId, 'Other Cmp');

    const list = getContainerComponents(container.id, [container, cmp1, cmp2, otherCmp]);
    expect(list).toHaveLength(2);
    expect(list.map((c) => c.name)).toEqual(['Cmp 1', 'Cmp 2']);
  });

  it('determines component kind correctly', () => {
    const ctrl = createC4Controller(archId, verId, container.id, 'Ctrl');
    const svc = createC4DomainService(archId, verId, container.id, 'Svc');
    const repo = createC4Repository(archId, verId, container.id, 'Repo');
    const generic = createC4Component(archId, verId, container.id, 'Generic');

    expect(getC4ComponentKind(ctrl)).toBe('controller');
    expect(getC4ComponentKind(svc)).toBe('service');
    expect(getC4ComponentKind(repo)).toBe('repository');
    expect(getC4ComponentKind(generic)).toBe('component');
  });

  it('projects components and enclosing container boundary to canvas nodes and edges', () => {
    const ctrl = createC4Controller(archId, verId, container.id, 'Accounts Controller');
    const svc = createC4DomainService(archId, verId, container.id, 'Transfer Service');
    const repo = createC4Repository(archId, verId, container.id, 'Account Repository');

    const conn1: ModelConnection = {
      id: createId('con'),
      architectureId: archId,
      versionId: verId,
      sourceObjectId: ctrl.id,
      targetObjectId: svc.id,
      kind: 'sync',
      label: 'Invokes business logic',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const conn2: ModelConnection = {
      id: createId('con'),
      architectureId: archId,
      versionId: verId,
      sourceObjectId: svc.id,
      targetObjectId: repo.id,
      kind: 'sync',
      label: 'Reads and writes entity models',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { nodes, edges } = projectC4ComponentToCanvas(container, [ctrl, svc, repo], [conn1, conn2]);

    // 1 container boundary + 3 components = 4 nodes
    expect(nodes).toHaveLength(4);
    const boundary = nodes.find((n) => n.type === 'c4ContainerBoundary');
    expect(boundary).toBeDefined();
    expect(boundary?.data.label).toBe('API Gateway');

    const componentNodes = nodes.filter((n) => n.type === 'c4Component');
    expect(componentNodes).toHaveLength(3);
    expect(componentNodes[0].data.label).toBe('Accounts Controller');

    expect(edges).toHaveLength(2);
    expect(edges[0].label).toBe('Invokes business logic');
    expect(edges[1].label).toBe('Reads and writes entity models');
  });
});
