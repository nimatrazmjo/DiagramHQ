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

interface ConnectionResponse {
  connection: {
    id: string;
    sourceObjectId: string;
    targetObjectId: string;
    kind: string;
    label: string | null;
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

describe('Database API Integration (F026)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let token: string;
  const user = {
    sub: 'usr_sto_' + Date.now().toString(36),
    email: 'db.architect@diagramhq.com',
    name: 'Database Architect',
  };

  let orgId: string;
  let workspaceId: string;
  let architectureId: string;
  let applicationId: string;
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
        name: 'DB Engineering Corp',
        slug: `db-corp-${Date.now().toString(36)}`,
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
        name: 'DB Space',
        slug: `db-space-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Payments Data Architecture' });
    architectureId = archRes.body.architecture.id;

    // Create Parent Application
    const appRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Payments Service',
        kind: 'application',
        description: 'Backend payments service',
      });
    applicationId = appRes.body.object.id;
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  describe('1. Database Lifecycle & Model Persistence', () => {
    let primaryDbId: string;
    let cacheId: string;

    it('creates a PostgreSQL Database under a parent application', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: applicationId,
          name: 'Users DB',
          kind: 'store',
          description: 'Main users PostgreSQL database',
          metadata: {
            databaseKind: 'postgresql',
            technology: 'PostgreSQL 14',
            schema: 'public',
            version: '1.0',
          },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^sto_/);
      expect(body.object.kind).toBe('store');
      expect(body.object.parentId).toBe(applicationId);
      expect(body.object.name).toBe('Users DB');
      expect(body.object.metadata?.databaseKind).toBe('postgresql');
      expect(body.object.metadata?.technology).toBe('PostgreSQL 14');
      primaryDbId = body.object.id;
    });

    it('creates a standalone Redis cache (no parent)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Session Cache',
          kind: 'store',
          metadata: {
            databaseKind: 'redis',
            technology: 'Redis 6',
          },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^sto_/);
      expect(body.object.kind).toBe('store');
      expect(body.object.parentId).toBeNull();
      expect(body.object.name).toBe('Session Cache');
      expect(body.object.metadata?.databaseKind).toBe('redis');
      cacheId = body.object.id;
    });

    it('connects Application -> Database', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/connections`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceObjectId: applicationId,
          targetObjectId: primaryDbId,
          kind: 'data',
          label: 'Reads/writes user records',
        })
        .expect(201);

      const body = res.body as ConnectionResponse;
      expect(body.connection.sourceObjectId).toBe(applicationId);
      expect(body.connection.targetObjectId).toBe(primaryDbId);
      expect(body.connection.label).toBe('Reads/writes user records');
    });

    it('updates Database metadata (PATCH /objects/:id)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/objects/${primaryDbId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Users DB v2',
          metadata: {
            databaseKind: 'postgresql',
            technology: 'PostgreSQL 15',
            schema: 'public',
          },
        })
        .expect(200);

      const body = res.body as ObjectResponse;
      expect(body.object.name).toBe('Users DB v2');
      expect(body.object.metadata?.technology).toBe('PostgreSQL 15');
    });

    it('reloads complete architecture model with Databases', async () => {
      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      // application + primaryDb + cache
      expect(model.objects).toHaveLength(3);
      expect(model.connections).toHaveLength(1);

      const db = model.objects.find((o) => o.id === primaryDbId);
      const cache = model.objects.find((o) => o.id === cacheId);

      expect(db?.kind).toBe('store');
      expect(db?.parentId).toBe(applicationId);
      expect(cache?.kind).toBe('store');
      expect(cache?.parentId).toBeNull();
    });

    it('deletes Database and cascades connection removal cleanly', async () => {
      await request(app.getHttpServer())
        .delete(`/objects/${primaryDbId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      expect(model.objects).toHaveLength(2); // application + cache remaining
      expect(model.connections).toHaveLength(0); // connection cascaded away
    });
  });
});
