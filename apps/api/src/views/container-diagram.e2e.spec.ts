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

interface ViewResponse {
  view: {
    id: string;
    architectureId: string;
    name: string;
    kind: string;
    filter: Record<string, unknown> | null;
  };
}

interface ViewObjectsResponse {
  viewObjects: Array<{
    viewId: string;
    objectId: string;
    position?: { x: number; y: number } | null;
  }>;
}

interface ArchitectureModelResponse {
  architecture: { id: string; name: string };
  objects: Array<{
    id: string;
    name: string;
    kind: string;
  }>;
}

describe('F033 — Container Diagrams (Phase 04)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let tokenOwner: string;
  let tokenViewer: string;
  const userOwner = {
    sub: 'usr_cnt_owner_' + Date.now().toString(36),
    email: 'container.owner@diagramhq.com',
    name: 'Container Owner',
  };
  const userViewer = {
    sub: 'usr_cnt_viewer_' + Date.now().toString(36),
    email: 'container.viewer@diagramhq.com',
    name: 'Container Viewer',
  };

  let orgId: string;
  let workspaceId: string;
  let architectureId: string;
  let systemId: string;
  let appServiceId: string;
  let databaseId: string;
  let queueId: string;
  const createdOrgIds: string[] = [];

  let containerDiagramId: string;

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

    // Setup Org
    orgId = createId('org');
    await prisma.organization.create({
      data: {
        id: orgId,
        name: 'Container Diagrams Org',
        slug: `cnt-org-${Date.now().toString(36)}`,
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
        name: 'Container Diagrams Space',
        slug: `cnt-space-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ name: 'Order Processing Platform' });
    architectureId = archRes.body.architecture.id;

    // Create System
    const sysRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ name: 'Order Management System', kind: 'system' });
    systemId = sysRes.body.object.id;

    // Create Application / Container nested under system
    const appRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ parentId: systemId, name: 'Order API Service', kind: 'application' });
    appServiceId = appRes.body.object.id;

    // Create Store / Database
    const dbRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ parentId: systemId, name: 'Orders PostgreSQL', kind: 'store' });
    databaseId = dbRes.body.object.id;

    // Create Queue
    const qRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        parentId: systemId,
        name: 'Order Events Kafka',
        kind: 'store',
        metadata: { storeKind: 'queue', technology: 'Kafka' },
      });
    queueId = qRes.body.object.id;
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  it('1. creates a Container diagram (kind: container) as a saved view', async () => {
    const res = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/views`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ name: 'Order System Containers (L2)', kind: 'container' })
      .expect(201);

    const body = res.body as ViewResponse;
    expect(body.view.kind).toBe('container');
    expect(body.view.name).toBe('Order System Containers (L2)');
    containerDiagramId = body.view.id;
  });

  it('2. renders containers, stores, and queues from the model with layout coordinates', async () => {
    // Add application container
    await request(app.getHttpServer())
      .post(`/views/${containerDiagramId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ objectId: appServiceId, position: { x: 100, y: 100 } })
      .expect(201);

    // Add database store
    await request(app.getHttpServer())
      .post(`/views/${containerDiagramId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ objectId: databaseId, position: { x: 350, y: 100 } })
      .expect(201);

    // Add message queue
    await request(app.getHttpServer())
      .post(`/views/${containerDiagramId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ objectId: queueId, position: { x: 200, y: 250 } })
      .expect(201);

    // Acceptance criterion: container diagram renders from the model
    const res = await request(app.getHttpServer())
      .get(`/views/${containerDiagramId}/objects`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .expect(200);

    const body = res.body as ViewObjectsResponse;
    expect(body.viewObjects).toHaveLength(3);
    const appItem = body.viewObjects.find((o) => o.objectId === appServiceId);
    expect(appItem).toBeDefined();
    expect(appItem?.position).toEqual({ x: 100, y: 100 });

    const dbItem = body.viewObjects.find((o) => o.objectId === databaseId);
    expect(dbItem).toBeDefined();
    expect(dbItem?.position).toEqual({ x: 350, y: 100 });

    const qItem = body.viewObjects.find((o) => o.objectId === queueId);
    expect(qItem).toBeDefined();
    expect(qItem?.position).toEqual({ x: 200, y: 250 });
  });

  it('3. updates an object position in the container diagram view', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/views/${containerDiagramId}/objects/${appServiceId}/position`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ x: 150, y: 120 })
      .expect(200);

    expect(res.body.viewObject.position.x).toBe(150);
    expect(res.body.viewObject.position.y).toBe(120);
  });

  it('4. deleting container diagram view leaves all model entities intact', async () => {
    await request(app.getHttpServer())
      .delete(`/views/${containerDiagramId}`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .expect(200);

    const modelRes = await request(app.getHttpServer())
      .get(`/architectures/${architectureId}/model`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .expect(200);

    const modelBody = modelRes.body as ArchitectureModelResponse;
    expect(modelBody.objects.some((o) => o.id === appServiceId)).toBe(true);
    expect(modelBody.objects.some((o) => o.id === databaseId)).toBe(true);
    expect(modelBody.objects.some((o) => o.id === queueId)).toBe(true);
  });
});
