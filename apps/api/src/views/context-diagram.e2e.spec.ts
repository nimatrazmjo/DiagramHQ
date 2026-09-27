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

interface ViewListResponse {
  views: Array<{
    id: string;
    name: string;
    kind: string;
  }>;
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

describe('F032 — Context Diagrams (Phase 04)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let tokenOwner: string;
  let tokenViewer: string;
  const userOwner = {
    sub: 'usr_ctx_owner_' + Date.now().toString(36),
    email: 'context.owner@diagramhq.com',
    name: 'Context Owner',
  };
  const userViewer = {
    sub: 'usr_ctx_viewer_' + Date.now().toString(36),
    email: 'context.viewer@diagramhq.com',
    name: 'Context Viewer',
  };

  let orgId: string;
  let workspaceId: string;
  let architectureId: string;
  let systemId: string;
  let personId: string;
  const createdOrgIds: string[] = [];

  let contextDiagram1Id: string;
  let contextDiagram2Id: string;

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

    // Setup Org with owner and viewer
    orgId = createId('org');
    await prisma.organization.create({
      data: {
        id: orgId,
        name: 'Context Diagrams Org',
        slug: `ctx-org-${Date.now().toString(36)}`,
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
        name: 'Context Diagrams Space',
        slug: `ctx-space-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ name: 'Enterprise Payment Architecture' });
    architectureId = archRes.body.architecture.id;

    // Create System Object in Model
    const sysRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'Payment Processing Platform',
        kind: 'system',
      });
    systemId = sysRes.body.object.id;

    // Create Person Object in Model
    const personRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'Customer',
        kind: 'actor',
      });
    personId = personRes.body.object.id;
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  it('1. creates a Context diagram (kind: context) as a saved view', async () => {
    const res = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/views`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ name: 'Executive System Context', kind: 'context' })
      .expect(201);

    const body = res.body as ViewResponse;
    expect(body.view.kind).toBe('context');
    expect(body.view.name).toBe('Executive System Context');
    expect(body.view.id).toMatch(/^vw_/);
    contextDiagram1Id = body.view.id;
  });

  it('2. rejects view creation from viewer role (RBAC guard)', async () => {
    await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/views`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .send({ name: 'Unauthorized View', kind: 'context' })
      .expect(403);
  });

  it('3. creates a second context diagram over the same architecture', async () => {
    const res = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/views`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ name: 'Operational Context View', kind: 'context' })
      .expect(201);

    const body = res.body as ViewResponse;
    expect(body.view.kind).toBe('context');
    contextDiagram2Id = body.view.id;
  });

  it('4. adds the same model object (Payment Platform) to both diagrams', async () => {
    // Add to diagram 1
    const res1 = await request(app.getHttpServer())
      .post(`/views/${contextDiagram1Id}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ objectId: systemId, position: { x: 100, y: 150 } })
      .expect(201);
    expect(res1.body.viewObject.objectId).toBe(systemId);

    // Also add Person to diagram 1
    await request(app.getHttpServer())
      .post(`/views/${contextDiagram1Id}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ objectId: personId, position: { x: 300, y: 150 } })
      .expect(201);

    // Add same system object to diagram 2
    const res2 = await request(app.getHttpServer())
      .post(`/views/${contextDiagram2Id}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ objectId: systemId, position: { x: 50, y: 50 } })
      .expect(201);
    expect(res2.body.viewObject.objectId).toBe(systemId);

    // Verify diagram 1 has 2 objects
    const list1 = await request(app.getHttpServer())
      .get(`/views/${contextDiagram1Id}/objects`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .expect(200);
    const body1 = list1.body as ViewObjectsResponse;
    expect(body1.viewObjects).toHaveLength(2);

    // Verify diagram 2 has 1 object
    const list2 = await request(app.getHttpServer())
      .get(`/views/${contextDiagram2Id}/objects`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .expect(200);
    const body2 = list2.body as ViewObjectsResponse;
    expect(body2.viewObjects).toHaveLength(1);
    expect(body2.viewObjects[0].objectId).toBe(systemId);
  });

  it('5. deleting object from diagram 1 keeps it in diagram 2 and keeps it in the architecture model', async () => {
    // Delete systemId from diagram 1
    await request(app.getHttpServer())
      .delete(`/views/${contextDiagram1Id}/objects/${systemId}`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .expect(200);

    // Verify removed from diagram 1
    const view1Res = await request(app.getHttpServer())
      .get(`/views/${contextDiagram1Id}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .expect(200);
    const view1Body = view1Res.body as ViewObjectsResponse;
    expect(view1Body.viewObjects.some((o) => o.objectId === systemId)).toBe(false);

    // Acceptance criterion: still exists in diagram 2
    const view2Res = await request(app.getHttpServer())
      .get(`/views/${contextDiagram2Id}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .expect(200);
    const view2Body = view2Res.body as ViewObjectsResponse;
    expect(view2Body.viewObjects.some((o) => o.objectId === systemId)).toBe(true);

    // Acceptance criterion: still exists in underlying architecture model
    const modelRes = await request(app.getHttpServer())
      .get(`/architectures/${architectureId}/model`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .expect(200);
    const modelBody = modelRes.body as ArchitectureModelResponse;
    expect(modelBody.objects.some((o) => o.id === systemId)).toBe(true);
  });

  it('6. lists views in the architecture', async () => {
    const res = await request(app.getHttpServer())
      .get(`/architectures/${architectureId}/views`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .expect(200);

    const body = res.body as ViewListResponse;
    expect(body.views.length).toBeGreaterThanOrEqual(2);
    expect(body.views.some((v) => v.id === contextDiagram1Id && v.kind === 'context')).toBe(true);
    expect(body.views.some((v) => v.id === contextDiagram2Id && v.kind === 'context')).toBe(true);
  });
});
