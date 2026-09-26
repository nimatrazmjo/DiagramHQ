import { describe, it, expect } from 'vitest';
import {
  createApplication,
  createId,
  isApplication,
  projectApplicationToCanvas,
  type ModelObject,
} from './';

describe('Application Domain Module (F024)', () => {
  const archId = createId('arch');
  const verId = createId('ver');
  const sysId = createId('sys');

  it('creates an Application service with technology, runtime, status, and port', () => {
    const app = createApplication(archId, verId, 'Payments API Service', {
      parentId: sysId,
      applicationType: 'api',
      technology: 'NestJS / TypeScript',
      runtime: 'Node.js 20',
      status: 'active',
      port: 3000,
      description: 'Processes credit card transactions and webhooks',
    });

    expect(app.id.startsWith('app_')).toBe(true);
    expect(app.kind).toBe('application');
    expect(app.parentId).toBe(sysId);
    expect(app.name).toBe('Payments API Service');
    expect(app.metadata?.applicationType).toBe('api');
    expect(app.metadata?.technology).toBe('NestJS / TypeScript');
    expect(app.metadata?.runtime).toBe('Node.js 20');
    expect(app.metadata?.status).toBe('active');
    expect(app.metadata?.port).toBe(3000);
    expect(app.metadata?.c4Level).toBe(2);
    expect(isApplication(app)).toBe(true);
  });

  it('creates a standalone Application service without parent', () => {
    const worker = createApplication(archId, verId, 'Email Queue Worker', {
      applicationType: 'worker',
      technology: 'Go',
      status: 'active',
    });

    expect(worker.parentId).toBeNull();
    expect(worker.metadata?.applicationType).toBe('worker');
    expect(isApplication(worker)).toBe(true);
  });

  it('correctly discriminates non-application objects', () => {
    const system: ModelObject = {
      id: createId('sys'),
      architectureId: archId,
      versionId: verId,
      kind: 'system',
      name: 'Core Banking',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(isApplication(system)).toBe(false);
  });

  it('projects Application to a canvas node', () => {
    const app = createApplication(archId, verId, 'Customer Portal Web App', {
      parentId: sysId,
      applicationType: 'web',
      technology: 'Next.js 14',
      runtime: 'Vercel Edge',
      status: 'active',
      port: 443,
      position: { x: 250, y: 180 },
    });

    const node = projectApplicationToCanvas(app);
    expect(node.id).toBe(app.id);
    expect(node.type).toBe('application');
    expect(node.position).toEqual({ x: 250, y: 180 });
    expect(node.data.label).toBe('Customer Portal Web App');
    expect(node.data.applicationType).toBe('web');
    expect(node.data.technology).toBe('Next.js 14');
    expect(node.data.runtime).toBe('Vercel Edge');
    expect(node.data.status).toBe('active');
    expect(node.data.port).toBe(443);
    expect(node.data.parentId).toBe(sysId);
    expect(node.data.canDrillDown).toBe(true);
    expect(node.width).toBe(240);
    expect(node.height).toBe(150);
  });
});
