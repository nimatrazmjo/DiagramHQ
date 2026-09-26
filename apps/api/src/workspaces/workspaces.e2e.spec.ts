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

describe('Workspaces Endpoints & Tenant Isolation (F004)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let tokenUserA: string;
  let tokenUserB: string;

  const userA = {
    sub: 'usr_ws_alice_' + Date.now().toString(36),
    email: 'alice.ws@diagramhq.com',
    name: 'Alice WS',
  };

  const userB = {
    sub: 'usr_ws_bob_' + Date.now().toString(36),
    email: 'bob.ws@diagramhq.com',
    name: 'Bob WS',
  };

  let org1Id: string;
  let org2Id: string;
  let workspaceAId: string;
  let archId: string;
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

    tokenUserA = authService.signToken(userA);
    tokenUserB = authService.signToken(userB);

    // Setup Org 1 for User A
    org1Id = createId('org');
    await prisma.organization.create({
      data: {
        id: org1Id,
        name: 'Org 1',
        slug: `org-1-${Date.now().toString(36)}`,
      },
    });
    await prisma.member.create({
      data: {
        id: createId('mem'),
        orgId: org1Id,
        userId: userA.sub,
        role: 'owner',
      },
    });
    createdOrgIds.push(org1Id);

    // Setup Org 2 for User B
    org2Id = createId('org');
    await prisma.organization.create({
      data: {
        id: org2Id,
        name: 'Org 2',
        slug: `org-2-${Date.now().toString(36)}`,
      },
    });
    await prisma.member.create({
      data: {
        id: createId('mem'),
        orgId: org2Id,
        userId: userB.sub,
        role: 'owner',
      },
    });
    createdOrgIds.push(org2Id);
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  it('rejects unauthenticated requests to workspace routes with 401', async () => {
    const res = await request(app.getHttpServer()).get(
      `/organizations/${org1Id}/workspaces`,
    );

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects malformed workspace creation payloads with 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/organizations/${org1Id}/workspaces`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ name: 'A', slug: 'INVALID_SLUG_UPPERCASE' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('Test 1: User A creates workspace in Org 1 -> 201 Created', async () => {
    const res = await request(app.getHttpServer())
      .post(`/organizations/${org1Id}/workspaces`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        name: 'Core Platform',
        slug: 'core-platform',
        settings: { defaultTheme: 'dark' },
      });

    expect(res.status).toBe(201);
    expect(res.body.workspace).toBeDefined();
    expect(res.body.workspace.name).toBe('Core Platform');
    expect(res.body.workspace.slug).toBe('core-platform');
    expect(res.body.workspace.orgId).toBe(org1Id);
    expect(res.body.workspace.id.startsWith('ws_')).toBe(true);

    workspaceAId = res.body.workspace.id;
  });

  it('Test 2: User B attempts to create workspace in Org 1 -> 404 Not Found (cross-tenant protection)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/organizations/${org1Id}/workspaces`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        name: 'Intruder Workspace',
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('Test 3: User A lists workspaces in Org 1 -> returns created workspace', async () => {
    const res = await request(app.getHttpServer())
      .get(`/organizations/${org1Id}/workspaces`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.workspaces)).toBe(true);
    const found = res.body.workspaces.find(
      (w: { id: string }) => w.id === workspaceAId,
    );
    expect(found).toBeDefined();
    expect(found._count).toBeDefined();
    expect(typeof found._count.architectures).toBe('number');
  });

  it('Test 4: User B lists workspaces in Org 1 -> 404 Not Found', async () => {
    const res = await request(app.getHttpServer())
      .get(`/organizations/${org1Id}/workspaces`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('Test 5: User A gets workspace by ID -> 200 OK', async () => {
    const res = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceAId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.workspace).toBeDefined();
    expect(res.body.workspace.id).toBe(workspaceAId);
    expect(res.body.workspace.role).toBe('owner');
    expect(Array.isArray(res.body.workspace.architectures)).toBe(true);
  });

  it("Test 6: User B gets User A's workspace by ID -> 404 Not Found", async () => {
    const res = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceAId}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('Test 7: Verify workspace contains architectures', async () => {
    archId = createId('arch');
    await prisma.architecture.create({
      data: {
        id: archId,
        workspaceId: workspaceAId,
        name: 'Microservices Topology',
        description: 'Core topology diagram',
      },
    });

    // User A calls GET /workspaces/:id
    const resWs = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceAId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(resWs.status).toBe(200);
    expect(
      resWs.body.workspace.architectures.some((a: { id: string }) => a.id === archId),
    ).toBe(true);

    // User A calls GET /workspaces/:id/architectures
    const resArchA = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceAId}/architectures`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(resArchA.status).toBe(200);
    expect(Array.isArray(resArchA.body.architectures)).toBe(true);
    expect(
      resArchA.body.architectures.some((a: { id: string }) => a.id === archId),
    ).toBe(true);

    // User B calls GET /workspaces/:id/architectures
    const resArchB = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceAId}/architectures`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(resArchB.status).toBe(404);
    expect(resArchB.body.error.code).toBe('NOT_FOUND');
  });

  it('Test 8: User A updates workspace -> 200 OK', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceAId}`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        name: 'Updated Platform Name',
        settings: { defaultTheme: 'light' },
      });

    expect(res.status).toBe(200);
    expect(res.body.workspace.name).toBe('Updated Platform Name');
    expect(res.body.workspace.settings).toEqual({ defaultTheme: 'light' });
  });

  it("Test 9: User B updates User A's workspace -> 404 Not Found", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceAId}`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        name: 'Malicious Update',
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('Test 10: Slug collision within same org -> 409 Conflict', async () => {
    const res = await request(app.getHttpServer())
      .post(`/organizations/${org1Id}/workspaces`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        name: 'Another Platform',
        slug: 'core-platform',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('Test 11: Same slug in DIFFERENT org -> succeeds (unique per org!)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/organizations/${org2Id}/workspaces`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        name: 'Org 2 Platform',
        slug: 'core-platform',
      });

    expect(res.status).toBe(201);
    expect(res.body.workspace.slug).toBe('core-platform');
    expect(res.body.workspace.orgId).toBe(org2Id);
  });

  it('Test 12: User A deletes workspace -> 200 OK, cascades architecture deletion', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceAId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.id).toBe(workspaceAId);

    // Verify workspace is deleted
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceAId },
    });
    expect(ws).toBeNull();

    // Verify cascaded architecture deletion
    const arch = await prisma.architecture.findUnique({
      where: { id: archId },
    });
    expect(arch).toBeNull();
  });
});
