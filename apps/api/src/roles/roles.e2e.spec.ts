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

interface WorkspaceResponse {
  workspace: {
    id: string;
    orgId: string;
    name: string;
    slug: string;
  };
}

interface MemberResponse {
  member: {
    id: string;
    orgId: string;
    userId: string;
    role: string;
    createdAt: string;
    updatedAt: string;
  };
}

describe('User Roles Endpoints & Authorization (F005)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let tokenUserA: string;
  let tokenUserB: string;
  let tokenUserC: string;

  const userA = {
    sub: 'usr_roles_a_' + Date.now().toString(36),
    email: 'alice.roles@diagramhq.com',
    name: 'Alice Owner',
  };

  const userB = {
    sub: 'usr_roles_b_' + Date.now().toString(36),
    email: 'bob.roles@diagramhq.com',
    name: 'Bob Editor',
  };

  const userC = {
    sub: 'usr_roles_c_' + Date.now().toString(36),
    email: 'charlie.roles@diagramhq.com',
    name: 'Charlie Viewer',
  };

  let orgId: string;
  let memberCId: string;
  let workspaceId: string;

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

    // Creates Org with User A (Owner)
    orgId = createId('org');
    await prisma.organization.create({
      data: {
        id: orgId,
        name: 'Role Security Org',
        slug: `role-security-${Date.now().toString(36)}`,
      },
    });

    await prisma.member.create({
      data: {
        id: createId('mem'),
        orgId,
        userId: userA.sub,
        role: 'owner',
      },
    });

    // Inserts Member records for User B (Editor) and User C (Viewer)
    await prisma.member.create({
      data: {
        id: createId('mem'),
        orgId,
        userId: userB.sub,
        role: 'editor',
      },
    });

    memberCId = createId('mem');
    await prisma.member.create({
      data: {
        id: memberCId,
        orgId,
        userId: userC.sub,
        role: 'viewer',
      },
    });
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.organization.deleteMany({ where: { id: orgId } });
    }
    await app.close();
  });

  it('Test 1: User C (Viewer) attempts POST /organizations/:orgId/workspaces -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/workspaces`)
      .set('Authorization', `Bearer ${tokenUserC}`)
      .send({ name: 'Viewer Workspace', slug: 'viewer-ws' });

    expect(res.status).toBe(403);
  });

  it('Test 2: User B (Editor) attempts POST /organizations/:orgId/workspaces -> 201 Created', async () => {
    const res = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/workspaces`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ name: 'Editor Workspace', slug: 'editor-ws' });

    expect(res.status).toBe(201);
    const body = res.body as WorkspaceResponse;
    expect(body.workspace).toBeDefined();
    expect(body.workspace.name).toBe('Editor Workspace');
    workspaceId = body.workspace.id;
  });

  it('Test 3: User C (Viewer) attempts PATCH /workspaces/:id -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${tokenUserC}`)
      .send({ name: 'Unauthorized Patch' });

    expect(res.status).toBe(403);
  });

  it('Test 4: User B (Editor) attempts PATCH /workspaces/:id -> 200 OK', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ name: 'Editor Updated Name' });

    expect(res.status).toBe(200);
    const body = res.body as WorkspaceResponse;
    expect(body.workspace.name).toBe('Editor Updated Name');
  });

  it('Test 5: User B (Editor) attempts DELETE /workspaces/:id -> 403 Forbidden (requires owner/admin)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(res.status).toBe(403);
  });

  it('Test 6: User A (Owner) promotes User C from Viewer to Editor via PATCH /organizations/:orgId/members/:memberId', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/members/${memberCId}`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ role: 'editor' });

    expect(res.status).toBe(200);
    const body = res.body as MemberResponse;
    expect(body.member).toBeDefined();
    expect(body.member.id).toBe(memberCId);
    expect(body.member.role).toBe('editor');
  });

  it('Test 7: Formerly-viewer User C (now Editor) successfully writes (POST /organizations/:orgId/workspaces) -> 201 Created', async () => {
    const res = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/workspaces`)
      .set('Authorization', `Bearer ${tokenUserC}`)
      .send({ name: 'Charlie New Workspace', slug: 'charlie-ws' });

    expect(res.status).toBe(201);
    const body = res.body as WorkspaceResponse;
    expect(body.workspace).toBeDefined();
    expect(body.workspace.name).toBe('Charlie New Workspace');
  });

  it('Test 8: User B (Editor) attempts to update member role -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/members/${memberCId}`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ role: 'viewer' });

    expect(res.status).toBe(403);
  });
});
