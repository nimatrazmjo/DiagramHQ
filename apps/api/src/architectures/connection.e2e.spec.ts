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

interface ConnectionResponse {
  connection: {
    id: string;
    sourceObjectId: string;
    targetObjectId: string;
    kind: string;
    label: string | null;
    metadata: Record<string, unknown> | null;
  };
}

interface ArchitectureModelResponse {
  architecture: { id: string; name: string };
  objects: Array<{ id: string; name: string; kind: string }>;
  connections: Array<{
    id: string;
    sourceObjectId: string;
    targetObjectId: string;
    metadata: Record<string, unknown> | null;
  }>;
}

describe('Connections API Integration — Rich Metadata (F029)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let token: string;
  const user = {
    sub: 'usr_con_' + Date.now().toString(36),
    email: 'conn.architect@diagramhq.com',
    name: 'Connection Architect',
  };

  let orgId: string;
  let workspaceId: string;
  let architectureId: string;
  let sourceId: string;
  let targetId: string;
  let connectionId: string;
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
        name: 'Connection Engineering Corp',
        slug: `con-corp-${Date.now().toString(36)}`,
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
        name: 'Connection Space',
        slug: `con-space-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Connection Test Architecture' });
    architectureId = archRes.body.architecture.id;

    // Create source and target objects
    const srcRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'API Gateway', kind: 'application' });
    sourceId = srcRes.body.object.id;

    const tgtRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Auth Service', kind: 'application' });
    targetId = tgtRes.body.object.id;
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  it('creates a connection with rich metadata (protocol, auth, encryption, port)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/connections`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceObjectId: sourceId,
        targetObjectId: targetId,
        kind: 'sync',
        label: 'Authenticates via',
        metadata: {
          protocol: 'HTTPS',
          technology: 'REST',
          direction: 'unidirectional',
          auth: 'oauth2',
          encryption: 'tls',
          status: 'active',
          port: 443,
        },
      })
      .expect(201);

    const body = res.body as ConnectionResponse;
    expect(body.connection.sourceObjectId).toBe(sourceId);
    expect(body.connection.targetObjectId).toBe(targetId);
    expect(body.connection.metadata?.protocol).toBe('HTTPS');
    expect(body.connection.metadata?.auth).toBe('oauth2');
    expect(body.connection.metadata?.port).toBe(443);
    connectionId = body.connection.id;
  });

  it('validates source and target must exist in the same architecture and version', async () => {
    // Create a second architecture to get a foreign objectId
    const arch2Res = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Foreign Architecture' });
    const arch2Id = arch2Res.body.architecture.id;

    const foreignObjRes = await request(app.getHttpServer())
      .post(`/architectures/${arch2Id}/objects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Foreign Object', kind: 'system' });
    if (!foreignObjRes.body.object) { console.log('ERROR:', foreignObjRes.status, foreignObjRes.body); }
    const foreignId = foreignObjRes.body.object.id;

    // Attempt to connect sourceId in arch1 to foreignId in arch2
    await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/connections`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceObjectId: sourceId,
        targetObjectId: foreignId,
      })
      .expect(400);
  });

  it('self-connection is rejected (sourceObjectId === targetObjectId)', async () => {
    await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/connections`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceObjectId: sourceId,
        targetObjectId: sourceId,
        kind: 'sync',
      })
      .expect(400);
  });

  it('PATCH /connections/:id updates metadata (adds latency and errorBehavior)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/connections/${connectionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        metadata: {
          protocol: 'HTTPS',
          latency: '50ms',
          errorBehavior: 'retry',
        },
      })
      .expect(200);

    const body = res.body as ConnectionResponse;
    expect(body.connection.metadata?.latency).toBe('50ms');
    expect(body.connection.metadata?.errorBehavior).toBe('retry');
  });

  it('GET /architectures/:id/model shows connections with metadata', async () => {
    const res = await request(app.getHttpServer())
      .get(`/architectures/${architectureId}/model`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const model = res.body as ArchitectureModelResponse;
    expect(model.connections.length).toBeGreaterThanOrEqual(1);
    const conn = model.connections.find((c) => c.id === connectionId);
    expect(conn).toBeDefined();
    expect(conn?.metadata).toBeDefined();
  });
});
