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

describe('C4 Container API Integration (F020)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let token: string;
  const user = {
    sub: 'usr_c4c_' + Date.now().toString(36),
    email: 'c4.container@diagramhq.com',
    name: 'C4 Container Architect',
  };

  let orgId: string;
  let wsId: string;
  let archId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(buildValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    authService = moduleRef.get(AuthService);
    prisma = moduleRef.get(PrismaService);

    token = authService.signToken(user);

    // Setup Org
    orgId = createId('org');
    await prisma.organization.create({
      data: {
        id: orgId,
        name: 'C4 Container Banking Corp',
        slug: `c4-container-corp-${Date.now().toString(36)}`,
        members: {
          create: [{ id: createId('mem'), userId: user.sub, role: 'owner' }],
        },
      },
    });

    // Setup Workspace
    wsId = createId('ws');
    await prisma.workspace.create({
      data: {
        id: wsId,
        orgId,
        name: 'Banking Architecture WS',
        slug: `banking-architecture-ws-${Date.now().toString(36)}`,
      },
    });

    // Create Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${wsId}/architectures`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Retail Banking System Model' });
    expect(archRes.status).toBe(201);
    archId = archRes.body.architecture.id;
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.organization.deleteMany({ where: { id: orgId } });
    }
    await app.close();
  });

  describe('1. C4 Containers Creation inside a System (Acceptance Criteria)', () => {
    let systemId: string;
    let spaId: string;
    let apiId: string;
    let dbId: string;
    let queueId: string;

    it('creates a parent Software System (Level 1)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Internet Banking System',
          kind: 'system',
          description: 'Allows customers to view account info and make payments',
          metadata: { c4Level: 1 },
        });

      expect(res.status).toBe(201);
      const data = res.body as ObjectResponse;
      expect(data.object.name).toBe('Internet Banking System');
      expect(data.object.kind).toBe('system');
      systemId = data.object.id;
    });

    it('creates a Web Application container inside the system', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: systemId,
          name: 'Single-Page Application',
          kind: 'application',
          description: 'Delivers static assets and banking SPA interface',
          metadata: {
            c4Level: 2,
            containerKind: 'web_app',
            technology: 'TypeScript / React',
          },
        });

      expect(res.status).toBe(201);
      const data = res.body as ObjectResponse;
      expect(data.object.name).toBe('Single-Page Application');
      expect(data.object.parentId).toBe(systemId);
      expect(data.object.metadata?.technology).toBe('TypeScript / React');
      spaId = data.object.id;
    });

    it('creates an API Service container inside the system', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: systemId,
          name: 'API Gateway / Backend',
          kind: 'application',
          description: 'Provides banking REST and GraphQL endpoints',
          metadata: {
            c4Level: 2,
            containerKind: 'api',
            technology: 'NestJS / TypeScript',
          },
        });

      expect(res.status).toBe(201);
      const data = res.body as ObjectResponse;
      expect(data.object.name).toBe('API Gateway / Backend');
      expect(data.object.parentId).toBe(systemId);
      expect(data.object.metadata?.technology).toBe('NestJS / TypeScript');
      apiId = data.object.id;
    });

    it('creates a Database container inside the system', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: systemId,
          name: 'Main Database',
          kind: 'store',
          description: 'Stores user accounts, balances, and audit logs',
          metadata: {
            c4Level: 2,
            containerKind: 'database',
            technology: 'PostgreSQL 16',
          },
        });

      expect(res.status).toBe(201);
      const data = res.body as ObjectResponse;
      expect(data.object.name).toBe('Main Database');
      expect(data.object.parentId).toBe(systemId);
      expect(data.object.metadata?.technology).toBe('PostgreSQL 16');
      dbId = data.object.id;
    });

    it('creates a Message Queue container inside the system', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: systemId,
          name: 'Events Queue',
          kind: 'store',
          description: 'Asynchronous event stream for financial notifications',
          metadata: {
            c4Level: 2,
            containerKind: 'queue',
            technology: 'Apache Kafka',
          },
        });

      expect(res.status).toBe(201);
      const data = res.body as ObjectResponse;
      expect(data.object.name).toBe('Events Queue');
      expect(data.object.parentId).toBe(systemId);
      expect(data.object.metadata?.technology).toBe('Apache Kafka');
      queueId = data.object.id;
    });

    it('connects containers: SPA -> API, API -> Database, API -> Queue', async () => {
      // 1. SPA -> API
      const conn1Res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/connections`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceObjectId: spaId,
          targetObjectId: apiId,
          kind: 'sync',
          label: 'Makes API calls to [JSON/HTTPS]',
        });
      expect(conn1Res.status).toBe(201);

      // 2. API -> Database
      const conn2Res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/connections`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceObjectId: apiId,
          targetObjectId: dbId,
          kind: 'sync',
          label: 'Reads/writes customer records via SQL',
        });
      expect(conn2Res.status).toBe(201);

      // 3. API -> Queue
      const conn3Res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/connections`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceObjectId: apiId,
          targetObjectId: queueId,
          kind: 'async',
          label: 'Publishes financial audit events to',
        });
      expect(conn3Res.status).toBe(201);
      const conn3 = (conn3Res.body as ConnectionResponse).connection;
      expect(conn3.kind).toBe('async');
    });

    it('persists and reloads an identical C4 model with containers and connections', async () => {
      const res = await request(app.getHttpServer())
        .get(`/architectures/${archId}/model`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const model = res.body as ArchitectureModelResponse;

      // 1 system + 4 containers = 5 objects
      expect(model.objects).toHaveLength(5);
      expect(model.connections).toHaveLength(3);

      const containersUnderSystem = model.objects.filter((o) => o.parentId === systemId);
      expect(containersUnderSystem).toHaveLength(4);

      const db = containersUnderSystem.find((c) => c.name === 'Main Database');
      expect(db).toBeDefined();
      expect(db?.metadata?.technology).toBe('PostgreSQL 16');

      const queue = containersUnderSystem.find((c) => c.name === 'Events Queue');
      expect(queue).toBeDefined();
      expect(queue?.metadata?.technology).toBe('Apache Kafka');
    });

    it('cascade deletes system and its child containers cleanly', async () => {
      // Create temporary system and container
      const tempSys = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Temporary System',
          kind: 'system',
        });
      const tempSysId = (tempSys.body as ObjectResponse).object.id;

      const tempContainer = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: tempSysId,
          name: 'Temporary Worker',
          kind: 'application',
        });
      const tempContId = (tempContainer.body as ObjectResponse).object.id;

      // Delete system
      const delRes = await request(app.getHttpServer())
        .delete(`/objects/${tempSysId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(delRes.status).toBe(200);

      // Child container's parentId was unlinked (onDelete: SetNull)
      const checkCont = await request(app.getHttpServer())
        .get(`/objects/${tempContId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(checkCont.status).toBe(200);
      expect((checkCont.body as ObjectResponse).object.parentId).toBeNull();

      // Deleting child container directly returns 200 and 404 on subsequent get
      const delContRes = await request(app.getHttpServer())
        .delete(`/objects/${tempContId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(delContRes.status).toBe(200);

      const checkContDeleted = await request(app.getHttpServer())
        .get(`/objects/${tempContId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(checkContDeleted.status).toBe(404);
    });
  });
});
