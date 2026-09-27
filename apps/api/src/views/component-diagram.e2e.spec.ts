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

describe('F034 — Component Diagrams (Phase 04)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let tokenOwner: string;
  let tokenViewer: string;
  const userOwner = {
    sub: 'usr_cmp_owner_' + Date.now().toString(36),
    email: 'component.owner@diagramhq.com',
    name: 'Component Owner',
  };
  const userViewer = {
    sub: 'usr_cmp_viewer_' + Date.now().toString(36),
    email: 'component.viewer@diagramhq.com',
    name: 'Component Viewer',
  };

  let orgId: string;
  let workspaceId: string;
  let architectureId: string;
  let systemId: string;
  let appContainerId: string;
  let controllerId: string;
  let serviceId: string;
  let repositoryId: string;
  const createdOrgIds: string[] = [];

  let componentDiagramId: string;

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
        name: 'Component Diagrams Org',
        slug: `cmp-org-${Date.now().toString(36)}`,
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
        name: 'Component Diagrams Space',
        slug: `cmp-space-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ name: 'Payment Platform' });
    architectureId = archRes.body.architecture.id;

    // Create System (L1)
    const sysRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ name: 'Payment System', kind: 'system' });
    systemId = sysRes.body.object.id;

    // Create Application / Container (L2)
    const appRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ parentId: systemId, name: 'Payment API Service', kind: 'application' });
    appContainerId = appRes.body.object.id;

    // Create Components (L3) under Application
    const c1Res = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        parentId: appContainerId,
        name: 'PaymentController',
        kind: 'component',
        metadata: { technology: 'NestJS Controller' },
      });
    controllerId = c1Res.body.object.id;

    const c2Res = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        parentId: appContainerId,
        name: 'PaymentProcessorService',
        kind: 'component',
        metadata: { technology: 'TypeScript Service' },
      });
    serviceId = c2Res.body.object.id;

    const c3Res = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        parentId: appContainerId,
        name: 'PaymentRepository',
        kind: 'component',
        metadata: { technology: 'Prisma Client' },
      });
    repositoryId = c3Res.body.object.id;
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  it('1. creates a Component diagram (kind: component) as a saved view', async () => {
    const res = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/views`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'Payment API Components (L3)',
        kind: 'component',
        filter: { containerId: appContainerId },
      })
      .expect(201);

    const body = res.body as ViewResponse;
    expect(body.view.kind).toBe('component');
    expect(body.view.name).toBe('Payment API Components (L3)');
    expect(body.view.filter).toEqual({ containerId: appContainerId });
    componentDiagramId = body.view.id;
  });

  it('2. renders components from the model with layout coordinates', async () => {
    // Add PaymentController
    await request(app.getHttpServer())
      .post(`/views/${componentDiagramId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ objectId: controllerId, position: { x: 50, y: 100 } })
      .expect(201);

    // Add PaymentProcessorService
    await request(app.getHttpServer())
      .post(`/views/${componentDiagramId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ objectId: serviceId, position: { x: 250, y: 100 } })
      .expect(201);

    // Add PaymentRepository
    await request(app.getHttpServer())
      .post(`/views/${componentDiagramId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ objectId: repositoryId, position: { x: 450, y: 100 } })
      .expect(201);

    // Acceptance criterion: component diagram renders from the model
    const res = await request(app.getHttpServer())
      .get(`/views/${componentDiagramId}/objects`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .expect(200);

    const body = res.body as ViewObjectsResponse;
    expect(body.viewObjects).toHaveLength(3);

    const c1 = body.viewObjects.find((o) => o.objectId === controllerId);
    expect(c1).toBeDefined();
    expect(c1?.position).toEqual({ x: 50, y: 100 });

    const c2 = body.viewObjects.find((o) => o.objectId === serviceId);
    expect(c2).toBeDefined();
    expect(c2?.position).toEqual({ x: 250, y: 100 });

    const c3 = body.viewObjects.find((o) => o.objectId === repositoryId);
    expect(c3).toBeDefined();
    expect(c3?.position).toEqual({ x: 450, y: 100 });
  });

  it('3. updates component positions in the component diagram view', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/views/${componentDiagramId}/objects/${controllerId}/position`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ x: 80, y: 140 })
      .expect(200);

    expect(res.body.viewObject.position.x).toBe(80);
    expect(res.body.viewObject.position.y).toBe(140);
  });

  it('4. deleting component diagram view leaves all model entities intact', async () => {
    await request(app.getHttpServer())
      .delete(`/views/${componentDiagramId}`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .expect(200);

    const modelRes = await request(app.getHttpServer())
      .get(`/architectures/${architectureId}/model`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .expect(200);

    const modelBody = modelRes.body as ArchitectureModelResponse;
    expect(modelBody.objects.some((o) => o.id === controllerId)).toBe(true);
    expect(modelBody.objects.some((o) => o.id === serviceId)).toBe(true);
    expect(modelBody.objects.some((o) => o.id === repositoryId)).toBe(true);
    expect(modelBody.objects.some((o) => o.id === appContainerId)).toBe(true);
  });
});
