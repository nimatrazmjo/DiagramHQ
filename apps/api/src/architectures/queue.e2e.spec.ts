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

describe('Queue API Integration (F027)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let token: string;
  const user = {
    sub: 'usr_que_' + Date.now().toString(36),
    email: 'q.architect@diagramhq.com',
    name: 'Queue Architect',
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
        name: 'Queue Engineering Corp',
        slug: `que-corp-${Date.now().toString(36)}`,
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
        name: 'Queue Space',
        slug: `que-space-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Event-Driven Platform Architecture' });
    architectureId = archRes.body.architecture.id;

    // Create Parent Application
    const appRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Order Service',
        kind: 'application',
        description: 'Backend order management service',
      });
    applicationId = appRes.body.object.id;
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  describe('1. Queue Lifecycle & Model Persistence', () => {
    let kafkaId: string;
    let sqsId: string;

    it('creates a Kafka queue under a parent application', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: applicationId,
          name: 'Events Queue',
          kind: 'store',
          description: 'Kafka events queue for order events',
          metadata: {
            storeKind: 'queue',
            queueKind: 'kafka',
            technology: 'Confluent Kafka',
            topics: ['user_events'],
          },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^sto_/);
      expect(body.object.kind).toBe('store');
      expect(body.object.parentId).toBe(applicationId);
      expect(body.object.name).toBe('Events Queue');
      expect(body.object.metadata?.queueKind).toBe('kafka');
      expect(body.object.metadata?.storeKind).toBe('queue');
      kafkaId = body.object.id;
    });

    it('creates a standalone SQS queue (no parent)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Tasks Queue',
          kind: 'store',
          metadata: {
            storeKind: 'queue',
            queueKind: 'sqs',
            technology: 'AWS SQS',
          },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^sto_/);
      expect(body.object.kind).toBe('store');
      expect(body.object.parentId).toBeNull();
      expect(body.object.name).toBe('Tasks Queue');
      expect(body.object.metadata?.queueKind).toBe('sqs');
      sqsId = body.object.id;
    });

    it('connects Application -> Kafka queue', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/connections`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceObjectId: applicationId,
          targetObjectId: kafkaId,
          kind: 'async',
          label: 'Publishes order events to',
        })
        .expect(201);

      const body = res.body as ConnectionResponse;
      expect(body.connection.sourceObjectId).toBe(applicationId);
      expect(body.connection.targetObjectId).toBe(kafkaId);
      expect(body.connection.label).toBe('Publishes order events to');
    });

    it('updates Queue metadata (PATCH /objects/:id)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/objects/${kafkaId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Main Events Queue',
          metadata: {
            storeKind: 'queue',
            queueKind: 'kafka',
            topics: ['user_events', 'system_events'],
          },
        })
        .expect(200);

      const body = res.body as ObjectResponse;
      expect(body.object.name).toBe('Main Events Queue');
      expect((body.object.metadata?.topics as string[]).length).toBe(2);
    });

    it('reloads complete architecture model with Queues', async () => {
      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      // application + kafka queue + sqs queue
      expect(model.objects).toHaveLength(3);
      expect(model.connections).toHaveLength(1);

      const kafka = model.objects.find((o) => o.id === kafkaId);
      const sqs = model.objects.find((o) => o.id === sqsId);

      expect(kafka?.kind).toBe('store');
      expect(kafka?.parentId).toBe(applicationId);
      expect(sqs?.kind).toBe('store');
      expect(sqs?.parentId).toBeNull();
    });

    it('deletes Queue and cascades connection removal cleanly', async () => {
      await request(app.getHttpServer())
        .delete(`/objects/${kafkaId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      expect(model.objects).toHaveLength(2); // application + sqs remaining
      expect(model.connections).toHaveLength(0); // connection cascaded away
    });
  });
});
