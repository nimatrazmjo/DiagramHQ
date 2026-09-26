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

interface ViewObjectUpdateResponse {
  viewObject: {
    viewId: string;
    objectId: string;
    position: {
      x: number;
      y: number;
    };
  };
}

interface ViewObjectsResponse {
  viewObjects: Array<{
    viewId: string;
    objectId: string;
    position: {
      x: number;
      y: number;
    } | null;
    collapsed: boolean;
    hidden: boolean;
    style: unknown;
  }>;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

describe('Views Persistence & Authorization Endpoints (F012)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let tokenUserA: string;
  let tokenUserB: string;
  let tokenUserC: string;

  const userA = {
    sub: 'usr_vw_alice_' + Date.now().toString(36),
    email: 'alice.views@diagramhq.com',
    name: 'Alice Owner',
  };

  const userB = {
    sub: 'usr_vw_bob_' + Date.now().toString(36),
    email: 'bob.views@diagramhq.com',
    name: 'Bob Viewer',
  };

  const userC = {
    sub: 'usr_vw_charlie_' + Date.now().toString(36),
    email: 'charlie.views@diagramhq.com',
    name: 'Charlie NonMember',
  };

  let orgId: string;
  let workspaceId: string;
  let archId: string;
  let versionId: string;
  let objectId: string;
  let viewId: string;

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

    tokenUserA = authService.signToken(userA);
    tokenUserB = authService.signToken(userB);
    tokenUserC = authService.signToken(userC);

    // Setup Organization
    orgId = createId('org');
    await prisma.organization.create({
      data: {
        id: orgId,
        name: 'Views E2E Org',
        slug: `views-e2e-org-${Date.now().toString(36)}`,
      },
    });

    // User A as Owner
    await prisma.member.create({
      data: {
        id: createId('mem'),
        orgId,
        userId: userA.sub,
        role: 'owner',
      },
    });

    // User B as Viewer
    await prisma.member.create({
      data: {
        id: createId('mem'),
        orgId,
        userId: userB.sub,
        role: 'viewer',
      },
    });

    // Setup Workspace
    workspaceId = createId('ws');
    await prisma.workspace.create({
      data: {
        id: workspaceId,
        orgId,
        name: 'Views E2E Workspace',
        slug: `views-e2e-ws-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    archId = createId('arch');
    await prisma.architecture.create({
      data: {
        id: archId,
        workspaceId,
        name: 'Views E2E Architecture',
      },
    });

    // Setup Version
    versionId = createId('ver');
    await prisma.version.create({
      data: {
        id: versionId,
        architectureId: archId,
        name: 'main',
      },
    });

    // Setup ModelObject
    objectId = createId('sys');
    await prisma.modelObject.create({
      data: {
        id: objectId,
        architectureId: archId,
        versionId,
        kind: 'system',
        name: 'Payment Gateway',
      },
    });

    // Setup View
    viewId = createId('vw');
    await prisma.view.create({
      data: {
        id: viewId,
        architectureId: archId,
        name: 'System Context',
      },
    });
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.organization.deleteMany({ where: { id: orgId } });
    }
    await app.close();
  });

  it('Test 1: User A (Owner) updates object position -> 200 OK with persisted position', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/views/${viewId}/objects/${objectId}/position`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ x: 250, y: 400 });

    expect(res.status).toBe(200);
    const body = res.body as ViewObjectUpdateResponse;
    expect(body.viewObject).toBeDefined();
    expect(body.viewObject.viewId).toBe(viewId);
    expect(body.viewObject.objectId).toBe(objectId);
    expect(body.viewObject.position).toEqual({ x: 250, y: 400 });

    // Verify it is actually saved in Postgres
    const dbRecord = await prisma.viewObject.findUnique({
      where: {
        viewId_objectId: {
          viewId,
          objectId,
        },
      },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.position).toEqual({ x: 250, y: 400 });
  });

  it('Test 2: User B (Viewer) attempts position update -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/views/${viewId}/objects/${objectId}/position`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ x: 300, y: 500 });

    expect(res.status).toBe(403);
    const body = res.body as ErrorResponse;
    expect(body.error).toBeDefined();
    expect(body.error.message).toBe('Viewer role does not have write permissions');

    // Verify position in DB did not change
    const dbRecord = await prisma.viewObject.findUnique({
      where: {
        viewId_objectId: {
          viewId,
          objectId,
        },
      },
    });
    expect(dbRecord?.position).toEqual({ x: 250, y: 400 });
  });

  it('Test 3: User A gets view objects -> 200 OK containing persisted position { x, y }', async () => {
    const res = await request(app.getHttpServer())
      .get(`/views/${viewId}/objects`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    const body = res.body as ViewObjectsResponse;
    expect(body.viewObjects).toBeInstanceOf(Array);
    expect(body.viewObjects.length).toBeGreaterThanOrEqual(1);

    const matchingObject = body.viewObjects.find((item) => item.objectId === objectId);
    expect(matchingObject).toBeDefined();
    expect(matchingObject?.viewId).toBe(viewId);
    expect(matchingObject?.position).toEqual({ x: 250, y: 400 });
  });

  it('Test 4: Cross-tenant / non-member user attempts update or fetch -> 404 Not Found', async () => {
    // Non-member attempts PATCH position
    const patchRes = await request(app.getHttpServer())
      .patch(`/views/${viewId}/objects/${objectId}/position`)
      .set('Authorization', `Bearer ${tokenUserC}`)
      .send({ x: 999, y: 999 });

    expect(patchRes.status).toBe(404);
    const patchBody = patchRes.body as ErrorResponse;
    expect(patchBody.error).toBeDefined();
    expect(patchBody.error.message).toBe('View not found');

    // Non-member attempts GET view objects
    const getRes = await request(app.getHttpServer())
      .get(`/views/${viewId}/objects`)
      .set('Authorization', `Bearer ${tokenUserC}`);

    expect(getRes.status).toBe(404);
    const getBody = getRes.body as ErrorResponse;
    expect(getBody.error).toBeDefined();
    expect(getBody.error.message).toBe('View not found');

    // Fetching non-existent view
    const nonExistentRes = await request(app.getHttpServer())
      .get('/views/vw_nonexistent/objects')
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(nonExistentRes.status).toBe(404);
  });
});
