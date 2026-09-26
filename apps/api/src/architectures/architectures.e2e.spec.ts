import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createId } from '@diagramhq/domain';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { AllExceptionsFilter } from '../common/http-exception.filter';
import { buildValidationPipe } from '../common/validation';
import { PrismaService } from '../database/prisma.service';

interface ArchitectureResponse {
  architecture: {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    defaultVersionId: string | null;
  };
  version: {
    id: string;
    architectureId: string;
    name: string;
    kind: string;
    status: string;
  };
}

interface ArchitectureModelResponse {
  architecture: {
    id: string;
    name: string;
    defaultVersionId: string | null;
  };
  version: {
    id: string;
    name: string;
  };
  objects: Array<{
    id: string;
    name: string;
    kind: string;
    description: string | null;
    parentId: string | null;
  }>;
  connections: Array<{
    id: string;
    sourceObjectId: string;
    targetObjectId: string;
    kind: string;
    label: string | null;
  }>;
}

interface ObjectResponse {
  object: {
    id: string;
    name: string;
    kind: string;
    description: string | null;
    parentId: string | null;
  };
}

interface ConnectionResponse {
  connection: {
    id: string;
    sourceObjectId: string;
    targetObjectId: string;
    kind: string;
    label: string | null;
  };
}

describe('Architecture Model Endpoints & Lifecycle (F018)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let tokenOwner: string;
  let tokenViewer: string;
  let tokenForeign: string;

  const userOwner = {
    sub: 'usr_owner_' + Date.now().toString(36),
    email: 'owner.arch@diagramhq.com',
    name: 'Arch Owner',
  };

  const userViewer = {
    sub: 'usr_viewer_' + Date.now().toString(36),
    email: 'viewer.arch@diagramhq.com',
    name: 'Arch Viewer',
  };

  const userForeign = {
    sub: 'usr_foreign_' + Date.now().toString(36),
    email: 'foreign.arch@diagramhq.com',
    name: 'Arch Foreign',
  };

  let orgId: string;
  let workspaceId: string;
  const createdOrgIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(buildValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    authService = app.get(AuthService);
    prisma = app.get(PrismaService);

    tokenOwner = authService.signToken(userOwner);
    tokenViewer = authService.signToken(userViewer);
    tokenForeign = authService.signToken(userForeign);

    // Setup Org & Members
    orgId = createId('org');
    await prisma.organization.create({
      data: {
        id: orgId,
        name: 'Architecture Test Org',
        slug: `arch-test-org-${Date.now().toString(36)}`,
        members: {
          create: [
            { id: createId('mem'), userId: userOwner.sub, role: 'owner' },
            { id: createId('mem'), userId: userViewer.sub, role: 'viewer' },
          ],
        },
      },
    });
    createdOrgIds.push(orgId);

    // Setup Workspace
    workspaceId = createId('ws');
    await prisma.workspace.create({
      data: {
        id: workspaceId,
        orgId,
        name: 'Arch Workspace',
        slug: `arch-workspace-${Date.now().toString(36)}`,
      },
    });
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  describe('1. Architecture Entity CRUD & Model-First Foundations', () => {
    let createdArchId: string;

    it('creates an architecture with automatic default version (main)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/architectures`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          name: 'Core Payments Architecture',
          description: 'Payment microservices and databases',
        })
        .expect(201);

      const body = res.body as ArchitectureResponse;
      expect(body.architecture.id).toMatch(/^arch_/);
      expect(body.architecture.name).toBe('Core Payments Architecture');
      expect(body.architecture.defaultVersionId).toBeTruthy();
      expect(body.version.name).toBe('main');
      expect(body.version.kind).toBe('main');

      createdArchId = body.architecture.id;
    });

    it('rejects architecture creation from viewer (RBAC write guard)', async () => {
      await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/architectures`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .send({ name: 'Unauthorized Arch' })
        .expect(403);
    });

    it('retrieves architecture by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/architectures/${createdArchId}`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .expect(200);

      expect(res.body.architecture.id).toBe(createdArchId);
      expect(res.body.architecture.name).toBe('Core Payments Architecture');
    });

    it('updates architecture metadata', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/architectures/${createdArchId}`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Renamed Payments Architecture' })
        .expect(200);

      expect(res.body.architecture.name).toBe('Renamed Payments Architecture');
    });
  });

  describe('2. Model Objects & Invariants', () => {
    let archId: string;
    let systemId: string;
    let appId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/architectures`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'E-Commerce Platform' });
      archId = (res.body as ArchitectureResponse).architecture.id;
    });

    it('creates a system-level model object', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          name: 'Payment System',
          kind: 'system',
          description: 'Payment boundary',
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^sys_/);
      expect(body.object.name).toBe('Payment System');
      expect(body.object.kind).toBe('system');
      systemId = body.object.id;
    });

    it('creates an application object nested under system (parentId)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          name: 'Checkout API',
          kind: 'application',
          parentId: systemId,
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^app_/);
      expect(body.object.parentId).toBe(systemId);
      appId = body.object.id;
    });

    it('creates a store object', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          name: 'PostgreSQL DB',
          kind: 'store',
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^sto_/);
    });

    it('rejects cyclic parent assignment', async () => {
      // Trying to make systemId a child of appId (which is already a child of systemId)
      await request(app.getHttpServer())
        .patch(`/objects/${systemId}`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ parentId: appId })
        .expect(400);
    });

    it('retrieves an object by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/objects/${systemId}`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .expect(200);

      expect(res.body.object.id).toBe(systemId);
    });

    it('lists model objects filtered by kind', async () => {
      const res = await request(app.getHttpServer())
        .get(`/architectures/${archId}/objects?kind=application`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .expect(200);

      expect(res.body.objects).toHaveLength(1);
      expect(res.body.objects[0].id).toBe(appId);
    });

    it('updates object metadata', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/objects/${appId}`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          name: 'Checkout Gateway API',
          metadata: { technology: 'NestJS', team: 'checkout' },
        })
        .expect(200);

      expect(res.body.object.name).toBe('Checkout Gateway API');
      expect(res.body.object.metadata).toEqual({ technology: 'NestJS', team: 'checkout' });
    });
  });

  describe('3. Model Connections & Invariants', () => {
    let archId: string;
    let appObjId: string;
    let storeObjId: string;
    let connId: string;

    beforeAll(async () => {
      const archRes = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/architectures`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Banking Architecture' });
      archId = (archRes.body as ArchitectureResponse).architecture.id;

      const appRes = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Ledger Service', kind: 'application' });
      appObjId = (appRes.body as ObjectResponse).object.id;

      const storeRes = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Ledger DB', kind: 'store' });
      storeObjId = (storeRes.body as ObjectResponse).object.id;
    });

    it('creates a model connection between two existing objects', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/connections`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          sourceObjectId: appObjId,
          targetObjectId: storeObjId,
          kind: 'data',
          label: 'Writes transactions',
        })
        .expect(201);

      const body = res.body as ConnectionResponse;
      expect(body.connection.id).toMatch(/^con_/);
      expect(body.connection.sourceObjectId).toBe(appObjId);
      expect(body.connection.targetObjectId).toBe(storeObjId);
      expect(body.connection.kind).toBe('data');
      expect(body.connection.label).toBe('Writes transactions');
      connId = body.connection.id;
    });

    it('rejects self-connection (Invariant 1: canConnect)', async () => {
      await request(app.getHttpServer())
        .post(`/architectures/${archId}/connections`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          sourceObjectId: appObjId,
          targetObjectId: appObjId,
          kind: 'sync',
        })
        .expect(400);
    });

    it('rejects connection with non-existent endpoint', async () => {
      await request(app.getHttpServer())
        .post(`/architectures/${archId}/connections`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          sourceObjectId: appObjId,
          targetObjectId: createId('sto'),
        })
        .expect(400);
    });

    it('retrieves and updates connection', async () => {
      const res = await request(app.getHttpServer())
        .get(`/connections/${connId}`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .expect(200);

      expect(res.body.connection.id).toBe(connId);

      const updateRes = await request(app.getHttpServer())
        .patch(`/connections/${connId}`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ label: 'Updated Label' })
        .expect(200);

      expect(updateRes.body.connection.label).toBe('Updated Label');
    });

    it('deleting an object cascades deletion of its connections (Invariant 4)', async () => {
      // Delete appObjId
      await request(app.getHttpServer())
        .delete(`/objects/${appObjId}`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .expect(200);

      // Connection should no longer exist
      await request(app.getHttpServer())
        .get(`/connections/${connId}`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .expect(404);
    });
  });

  describe('4. Full Architecture Model Snapshot & Reload Consistency (F018 Acceptance Criteria)', () => {
    let testArchId: string;
    let initialSnapshot: ArchitectureModelResponse;

    it('persists a complete model and reloads an identical snapshot', async () => {
      // Create architecture
      const archRes = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/architectures`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Order Fulfillment Platform', description: 'End to end orders' });
      testArchId = (archRes.body as ArchitectureResponse).architecture.id;

      // Create objects
      const sysRes = await request(app.getHttpServer())
        .post(`/architectures/${testArchId}/objects`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Order System', kind: 'system' });
      const sysId = (sysRes.body as ObjectResponse).object.id;

      const appRes = await request(app.getHttpServer())
        .post(`/architectures/${testArchId}/objects`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Order Service', kind: 'application', parentId: sysId });
      const appId = (appRes.body as ObjectResponse).object.id;

      const storeRes = await request(app.getHttpServer())
        .post(`/architectures/${testArchId}/objects`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Order DB', kind: 'store' });
      const storeId = (storeRes.body as ObjectResponse).object.id;

      // Create connection
      await request(app.getHttpServer())
        .post(`/architectures/${testArchId}/connections`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          sourceObjectId: appId,
          targetObjectId: storeId,
          kind: 'data',
          label: 'Order store',
        });

      // Load model
      const loadRes1 = await request(app.getHttpServer())
        .get(`/architectures/${testArchId}/model`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .expect(200);

      initialSnapshot = loadRes1.body as ArchitectureModelResponse;
      expect(initialSnapshot.architecture.id).toBe(testArchId);
      expect(initialSnapshot.objects).toHaveLength(3);
      expect(initialSnapshot.connections).toHaveLength(1);

      // Reload model independently
      const reloadRes = await request(app.getHttpServer())
        .get(`/architectures/${testArchId}/model`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .expect(200);

      const reloadedSnapshot = reloadRes.body as ArchitectureModelResponse;

      // Acceptance criterion: reload yields an identical model
      expect(reloadedSnapshot.architecture.id).toBe(initialSnapshot.architecture.id);
      expect(reloadedSnapshot.architecture.name).toBe(initialSnapshot.architecture.name);
      expect(reloadedSnapshot.version.id).toBe(initialSnapshot.version.id);

      expect(reloadedSnapshot.objects.map((o) => o.id).sort()).toEqual(
        initialSnapshot.objects.map((o) => o.id).sort(),
      );
      expect(reloadedSnapshot.connections.map((c) => c.id)).toEqual(
        initialSnapshot.connections.map((c) => c.id),
      );
    });

    it('rejects foreign users with 404', async () => {
      await request(app.getHttpServer())
        .get(`/architectures/${testArchId}/model`)
        .set('Authorization', `Bearer ${tokenForeign}`)
        .expect(404);
    });
  });
});
