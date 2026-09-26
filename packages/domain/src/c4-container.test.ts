import { describe, it, expect } from 'vitest';
import {
  canDrillToComponents,
  createC4Database,
  createC4MobileApp,
  createC4Queue,
  createC4Service,
  createC4WebApp,
  createId,
  getC4ContainerKind,
  getSystemContainers,
  isContainer,
  isContainerOfSystem,
  projectC4ContainerToCanvas,
  type ModelConnection,
  type ModelObject,
} from './';

describe('C4 Container Domain Module (F020)', () => {
  const archId = createId('arch');
  const verId = createId('ver');
  const systemId = createId('sys');

  const system: ModelObject = {
    id: systemId,
    architectureId: archId,
    versionId: verId,
    kind: 'system',
    name: 'Internet Banking System',
    description: 'Allows customers to view account info and make payments',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('correctly creates various C4 containers under a parent system', () => {
    const webApp = createC4WebApp(archId, verId, systemId, 'Single-Page App', 'React / Next.js', 'Web UI for banking');
    expect(webApp.parentId).toBe(systemId);
    expect(webApp.kind).toBe('application');
    expect(webApp.metadata?.containerKind).toBe('web_app');
    expect(webApp.metadata?.technology).toBe('React / Next.js');
    expect(isContainer(webApp)).toBe(true);
    expect(isContainerOfSystem(webApp, systemId)).toBe(true);

    const mobileApp = createC4MobileApp(archId, verId, systemId, 'Mobile App', 'Flutter');
    expect(mobileApp.parentId).toBe(systemId);
    expect(mobileApp.kind).toBe('application');
    expect(mobileApp.metadata?.containerKind).toBe('mobile_app');
    expect(mobileApp.metadata?.technology).toBe('Flutter');

    const apiService = createC4Service(archId, verId, systemId, 'API Gateway', 'NestJS / TypeScript');
    expect(apiService.parentId).toBe(systemId);
    expect(apiService.kind).toBe('application');
    expect(apiService.metadata?.containerKind).toBe('api');
    expect(apiService.metadata?.technology).toBe('NestJS / TypeScript');

    const db = createC4Database(archId, verId, systemId, 'Main Database', 'PostgreSQL 16');
    expect(db.parentId).toBe(systemId);
    expect(db.kind).toBe('store');
    expect(db.metadata?.containerKind).toBe('database');
    expect(db.metadata?.technology).toBe('PostgreSQL 16');

    const queue = createC4Queue(archId, verId, systemId, 'Transaction Queue', 'Kafka');
    expect(queue.parentId).toBe(systemId);
    expect(queue.kind).toBe('store');
    expect(queue.metadata?.containerKind).toBe('queue');
    expect(queue.metadata?.technology).toBe('Kafka');
  });

  it('filters containers of a system correctly', () => {
    const otherSystemId = createId('sys');
    const c1 = createC4WebApp(archId, verId, systemId, 'Web 1');
    const c2 = createC4Service(archId, verId, systemId, 'Service 1');
    const otherContainer = createC4Database(archId, verId, otherSystemId, 'Other DB');

    const list = getSystemContainers(systemId, [system, c1, c2, otherContainer]);
    expect(list).toHaveLength(2);
    expect(list.map((c) => c.name)).toEqual(['Web 1', 'Service 1']);
  });

  it('determines container kind and drill-to-components capability', () => {
    const webApp = createC4WebApp(archId, verId, systemId, 'SPA');
    const api = createC4Service(archId, verId, systemId, 'API');
    const db = createC4Database(archId, verId, systemId, 'DB');
    const queue = createC4Queue(archId, verId, systemId, 'Queue');

    expect(getC4ContainerKind(webApp)).toBe('web_app');
    expect(getC4ContainerKind(api)).toBe('api');
    expect(getC4ContainerKind(db)).toBe('database');
    expect(getC4ContainerKind(queue)).toBe('queue');

    // Apps & services can drill to components (Level 3)
    expect(canDrillToComponents(webApp)).toBe(true);
    expect(canDrillToComponents(api)).toBe(true);
    // Databases and queues do not drill to components
    expect(canDrillToComponents(db)).toBe(false);
    expect(canDrillToComponents(queue)).toBe(false);
    expect(canDrillToComponents(system)).toBe(false);
  });

  it('projects containers and enclosing system boundary to canvas nodes and edges', () => {
    const webApp = createC4WebApp(archId, verId, systemId, 'Single-Page App', 'React');
    const api = createC4Service(archId, verId, systemId, 'API Gateway', 'Node.js');
    const db = createC4Database(archId, verId, systemId, 'Relational Database', 'PostgreSQL');

    const conn1: ModelConnection = {
      id: createId('con'),
      architectureId: archId,
      versionId: verId,
      sourceObjectId: webApp.id,
      targetObjectId: api.id,
      kind: 'sync',
      label: 'Makes API calls to [JSON/HTTPS]',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const conn2: ModelConnection = {
      id: createId('con'),
      architectureId: archId,
      versionId: verId,
      sourceObjectId: api.id,
      targetObjectId: db.id,
      kind: 'sync',
      label: 'Reads/writes SQL queries',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { nodes, edges } = projectC4ContainerToCanvas(system, [webApp, api, db], [conn1, conn2]);

    // 3 containers + 1 system boundary
    expect(nodes).toHaveLength(4);
    const boundary = nodes.find((n) => n.type === 'c4SystemBoundary');
    expect(boundary).toBeDefined();
    expect(boundary?.data.label).toBe('Internet Banking System');
    expect(boundary?.zIndex).toBe(-1);

    const containerNodes = nodes.filter((n) => n.type === 'c4Container');
    expect(containerNodes).toHaveLength(3);
    expect(containerNodes[0].data.label).toBe('Single-Page App');
    expect(containerNodes[0].data.technology).toBe('React');

    expect(edges).toHaveLength(2);
    expect(edges[0].label).toBe('Makes API calls to [JSON/HTTPS]');
    expect(edges[1].label).toBe('Reads/writes SQL queries');
  });
});
