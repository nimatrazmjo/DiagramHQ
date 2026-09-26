import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { AllExceptionsFilter } from '../common/http-exception.filter';
import { buildValidationPipe } from '../common/validation';
import { PrismaService } from '../database/prisma.service';

describe('Organizations Endpoints & Tenant Isolation (F003)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let tokenUserA: string;
  let tokenUserB: string;

  const userA = {
    sub: 'usr_org_alice_' + Date.now().toString(36),
    email: 'alice@diagramhq.com',
    name: 'Alice',
  };

  const userB = {
    sub: 'usr_org_bob_' + Date.now().toString(36),
    email: 'bob@diagramhq.com',
    name: 'Bob',
  };

  let createdOrgId: string;
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
  });

  afterAll(async () => {
    // Clean up created orgs and cascade members
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  it('rejects unauthenticated requests to /organizations with 401', async () => {
    const res = await request(app.getHttpServer()).get('/organizations');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects malformed creation payloads with 400 validation error envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ name: 'A', slug: 'INVALID_SLUG_WITH_UPPERCASE' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toBe('Validation failed');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('POST /organizations creates an organization and assigns caller as owner', async () => {
    const res = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ name: 'Alpha Corp' });

    expect(res.status).toBe(201);
    expect(res.body.organization).toBeDefined();
    expect(res.body.organization.name).toBe('Alpha Corp');
    expect(res.body.organization.slug.startsWith('alpha-corp')).toBe(true);
    expect(res.body.organization.role).toBe('owner');
    expect(res.body.organization.id.startsWith('org_')).toBe(true);

    createdOrgId = res.body.organization.id;
    createdOrgIds.push(createdOrgId);

    // Verify database record
    const member = await prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId: createdOrgId,
          userId: userA.sub,
        },
      },
    });
    expect(member).not.toBeNull();
    expect(member?.role).toBe('owner');
  });

  it('GET /organizations lists organizations where caller is a member', async () => {
    const res = await request(app.getHttpServer())
      .get('/organizations')
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.organizations)).toBe(true);
    const found = res.body.organizations.find((o: { id: string }) => o.id === createdOrgId);
    expect(found).toBeDefined();
    expect(found.name).toBe('Alpha Corp');
    expect(found.role).toBe('owner');
  });

  it('GET /organizations/:id returns the organization details for a member', async () => {
    const res = await request(app.getHttpServer())
      .get(`/organizations/${createdOrgId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.organization.id).toBe(createdOrgId);
    expect(res.body.organization.name).toBe('Alpha Corp');
  });

  it('enforces tenant isolation: another user cannot see, get, update, or delete the organization', async () => {
    // User B lists their orgs - must NOT see User A's org
    const listRes = await request(app.getHttpServer())
      .get('/organizations')
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(listRes.status).toBe(200);
    const leaked = listRes.body.organizations.some((o: { id: string }) => o.id === createdOrgId);
    expect(leaked).toBe(false);

    // User B attempts to GET User A's org
    const getRes = await request(app.getHttpServer())
      .get(`/organizations/${createdOrgId}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(getRes.status).toBe(404);
    expect(getRes.body.error.code).toBe('NOT_FOUND');

    // User B attempts to PATCH User A's org
    const patchRes = await request(app.getHttpServer())
      .patch(`/organizations/${createdOrgId}`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ name: 'Hacked Org' });

    expect(patchRes.status).toBe(404);
    expect(patchRes.body.error.code).toBe('NOT_FOUND');

    // User B attempts to DELETE User A's org
    const deleteRes = await request(app.getHttpServer())
      .delete(`/organizations/${createdOrgId}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(deleteRes.status).toBe(404);
    expect(deleteRes.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /organizations/:id updates the organization when called by owner', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/organizations/${createdOrgId}`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ name: 'Alpha Corp International' });

    expect(res.status).toBe(200);
    expect(res.body.organization.name).toBe('Alpha Corp International');
  });

  it('GET /organizations/:id/members lists members of the organization', async () => {
    const res = await request(app.getHttpServer())
      .get(`/organizations/${createdOrgId}/members`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.members)).toBe(true);
    expect(res.body.members.length).toBeGreaterThanOrEqual(1);
    expect(res.body.members[0].userId).toBe(userA.sub);
    expect(res.body.members[0].role).toBe('owner');
  });

  it('DELETE /organizations/:id allows owner to delete the organization', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/organizations/${createdOrgId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it is gone
    const verifyRes = await request(app.getHttpServer())
      .get(`/organizations/${createdOrgId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(verifyRes.status).toBe(404);
  });
});
