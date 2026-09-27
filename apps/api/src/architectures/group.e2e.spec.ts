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

interface ObjectResponse {
  object: {
    id: string;
    parentId?: string | null;
    name: string;
    kind: string;
    description: string | null;
    metadata: Record<string, unknown> | null;
  };
}

interface ArchitectureModelResponse {
  architecture: {
    id: string;
    name: string;
  };
  objects: Array<{
    id: string;
    parentId?: string | null;
    name: string;
    kind: string;
    metadata: Record<string, unknown> | null;
  }>;
  connections: Array<{
    id: string;
    sourceObjectId: string;
    targetObjectId: string;
    label: string | null;
  }>;
}

describe('Group API Integration (F028)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let token: string;
  const user = {
    sub: 'usr_grp_' + Date.now().toString(36),
    email: 'g.architect@diagramhq.com',
    name: 'Group Architect',
  };

  let orgId: string;
  let workspaceId: string;
  let architectureId: string;
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
    token = authService.signToken(user);

    // Setup Org
    orgId = createId('org');
    await prisma.organization.create({
      data: {
        id: orgId,
        name: 'Group Engineering Corp',
        slug: `grp-corp-${Date.now().toString(36)}`,
        members: {
          create: [{ id: createId('mem'), userId: user.sub, role: 'owner' }],
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
        name: 'Group Space',
        slug: `grp-space-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Group Nesting Architecture' });
    architectureId = archRes.body.architecture.id;
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  describe('1. Group Lifecycle & Nesting', () => {
    let boundaryId: string;
    let teamGroupId: string;

    it('creates a Boundary group (top-level)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'AWS Boundary',
          kind: 'group',
          metadata: {
            groupKind: 'boundary',
          },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^grp_/);
      expect(body.object.kind).toBe('group');
      expect(body.object.parentId).toBeNull();
      expect(body.object.name).toBe('AWS Boundary');
      expect(body.object.metadata?.groupKind).toBe('boundary');
      boundaryId = body.object.id;
    });

    it('creates a Team group nested inside the boundary', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: boundaryId,
          name: 'Backend Team',
          kind: 'group',
          metadata: {
            groupKind: 'team',
          },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^grp_/);
      expect(body.object.kind).toBe('group');
      expect(body.object.parentId).toBe(boundaryId);
      expect(body.object.name).toBe('Backend Team');
      teamGroupId = body.object.id;
    });

    it('prevents a nesting cycle (group cannot be its own ancestor)', async () => {
      // teamGroupId is a child of boundaryId
      // Trying to set boundaryId's parent to teamGroupId would create a cycle
      await request(app.getHttpServer())
        .patch(`/objects/${boundaryId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ parentId: teamGroupId })
        .expect(400);
    });

    it('reloads complete architecture model with Groups and nesting', async () => {
      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      // boundary group + team group
      expect(model.objects).toHaveLength(2);
      expect(model.connections).toHaveLength(0);

      const boundary = model.objects.find((o) => o.id === boundaryId);
      const team = model.objects.find((o) => o.id === teamGroupId);

      expect(boundary?.kind).toBe('group');
      expect(boundary?.parentId).toBeNull();
      expect(team?.kind).toBe('group');
      expect(team?.parentId).toBe(boundaryId);
    });

    it('deletes parent group; child group parentId is nulled (SetNull), child survives', async () => {
      await request(app.getHttpServer())
        .delete(`/objects/${boundaryId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      // Only the child group remains; parent was deleted, SetNull applies
      expect(model.objects).toHaveLength(1);
      const team = model.objects.find((o) => o.id === teamGroupId);
      expect(team?.parentId).toBeNull(); // parentId nulled via SetNull cascade
    });
  });
});
