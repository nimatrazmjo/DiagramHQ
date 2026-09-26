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

describe('Application API Integration (F024)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let token: string;
  const user = {
    sub: 'usr_app_' + Date.now().toString(36),
    email: 'app.architect@diagramhq.com',
    name: 'App Architect',
  };

  let orgId: string;
  let workspaceId: string;
  let architectureId: string;
  let systemId: string;
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
        name: 'Microservices Corp',
        slug: `ms-corp-${Date.now().toString(36)}`,
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
        name: 'Applications Workspace',
        slug: `apps-ws-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Distributed Microservices Architecture' });
    architectureId = archRes.body.architecture.id;

    // Create Parent System
    const sysRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'E-Commerce Platform',
        kind: 'system',
        description: 'Core retail commerce platform',
      });
    systemId = sysRes.body.object.id;
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  describe('1. Application Lifecycle & Metadata Persistence', () => {
    let apiAppId: string;
    let workerAppId: string;

    it('creates an Application service under a parent system', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: systemId,
          name: 'Orders API Service',
          kind: 'application',
          description: 'Handles customer checkout and order processing',
          metadata: {
            applicationType: 'api',
            technology: 'NestJS / TypeScript',
            runtime: 'Node.js 20',
            status: 'active',
            port: 3001,
          },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^app_/);
      expect(body.object.kind).toBe('application');
      expect(body.object.name).toBe('Orders API Service');
      expect(body.object.parentId).toBe(systemId);
      expect(body.object.metadata?.applicationType).toBe('api');
      expect(body.object.metadata?.technology).toBe('NestJS / TypeScript');
      expect(body.object.metadata?.port).toBe(3001);
      apiAppId = body.object.id;
    });

    it('creates a standalone Application service without a parent system', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Notifications Worker',
          kind: 'application',
          description: 'Consumes SNS/SQS events and delivers push notifications',
          metadata: {
            applicationType: 'worker',
            technology: 'Go / gRPC',
            runtime: 'Distroless Container',
            status: 'active',
          },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^app_/);
      expect(body.object.kind).toBe('application');
      expect(body.object.parentId).toBeNull();
      expect(body.object.metadata?.applicationType).toBe('worker');
      workerAppId = body.object.id;
    });

    it('connects Orders API to Notifications Worker via sync call', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/connections`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceObjectId: apiAppId,
          targetObjectId: workerAppId,
          kind: 'sync',
          label: 'Dispatches Order Confirmation',
          description: 'Publishes order placement notifications to worker',
        })
        .expect(201);

      const body = res.body as ConnectionResponse;
      expect(body.connection.sourceObjectId).toBe(apiAppId);
      expect(body.connection.targetObjectId).toBe(workerAppId);
      expect(body.connection.label).toBe('Dispatches Order Confirmation');
    });

    it('updates Application metadata (PATCH /objects/:id)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/objects/${apiAppId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Orders API Gateway',
          metadata: {
            applicationType: 'api',
            technology: 'NestJS 10 / Fastify',
            runtime: 'Node.js 22 LTS',
            status: 'active',
            port: 8080,
          },
        })
        .expect(200);

      const body = res.body as ObjectResponse;
      expect(body.object.name).toBe('Orders API Gateway');
      expect(body.object.metadata?.technology).toBe('NestJS 10 / Fastify');
      expect(body.object.metadata?.port).toBe(8080);
    });

    it('reloads complete architecture model with Applications and connections', async () => {
      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      expect(model.objects).toHaveLength(3); // system, api app, worker app
      expect(model.connections).toHaveLength(1);

      const api = model.objects.find((o) => o.id === apiAppId);
      const worker = model.objects.find((o) => o.id === workerAppId);

      expect(api?.kind).toBe('application');
      expect(api?.parentId).toBe(systemId);
      expect(worker?.kind).toBe('application');
      expect(worker?.parentId).toBeNull();
    });

    it('deletes Application and cascades connected edges cleanly', async () => {
      await request(app.getHttpServer())
        .delete(`/objects/${apiAppId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      expect(model.objects).toHaveLength(2); // system and worker remaining
      expect(model.connections).toHaveLength(0); // connection cascaded away
    });
  });
});
