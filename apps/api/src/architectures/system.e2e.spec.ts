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

describe('System API Integration (F023)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let token: string;
  const user = {
    sub: 'usr_sys_' + Date.now().toString(36),
    email: 'systems.architect@diagramhq.com',
    name: 'Systems Architect',
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
        name: 'Systems Engineering Corp',
        slug: `sys-corp-${Date.now().toString(36)}`,
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
        name: 'Enterprise Systems Space',
        slug: `ent-systems-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Banking Core & Third-Party Ecosystem' });
    architectureId = archRes.body.architecture.id;
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  describe('1. System Element Lifecycle & Model Persistence', () => {
    let internalSysId: string;
    let externalSysId: string;

    it('creates an internal System with domain, systemType, and criticality', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Core Banking Ledger',
          kind: 'system',
          description: 'High-throughput transactional ledger',
          metadata: {
            external: false,
            domain: 'Core Banking',
            systemType: 'Financial Ledger',
            critical: true,
            c4Level: 1,
            c4Kind: 'system',
          },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^sys_/);
      expect(body.object.kind).toBe('system');
      expect(body.object.name).toBe('Core Banking Ledger');
      expect(body.object.metadata?.external).toBe(false);
      expect(body.object.metadata?.domain).toBe('Core Banking');
      expect(body.object.metadata?.critical).toBe(true);
      internalSysId = body.object.id;
    });

    it('creates an external System (third-party / SaaS integration)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Stripe Payment Processor',
          kind: 'system',
          description: 'Payment settlement and fraud verification SaaS',
          metadata: {
            external: true,
            domain: 'Payments & Settlement',
            systemType: 'External SaaS',
            critical: false,
            c4Level: 1,
            c4Kind: 'external_system',
          },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^sys_/);
      expect(body.object.kind).toBe('system');
      expect(body.object.metadata?.external).toBe(true);
      expect(body.object.metadata?.c4Kind).toBe('external_system');
      externalSysId = body.object.id;
    });

    it('connects internal System to external System', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/connections`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceObjectId: internalSysId,
          targetObjectId: externalSysId,
          kind: 'sync',
          label: 'Dispatches Settlements',
          description: 'Settles end-of-day credit card transaction batches',
        })
        .expect(201);

      const body = res.body as ConnectionResponse;
      expect(body.connection.sourceObjectId).toBe(internalSysId);
      expect(body.connection.targetObjectId).toBe(externalSysId);
      expect(body.connection.label).toBe('Dispatches Settlements');
    });

    it('updates System properties (PATCH /objects/:id)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/objects/${internalSysId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Core Banking Ledger (Tier 0)',
          metadata: {
            external: false,
            domain: 'Core Banking Tier 0',
            systemType: 'Distributed Financial Ledger',
            critical: true,
          },
        })
        .expect(200);

      const body = res.body as ObjectResponse;
      expect(body.object.name).toBe('Core Banking Ledger (Tier 0)');
      expect(body.object.metadata?.domain).toBe('Core Banking Tier 0');
    });

    it('reloads complete architecture model with internal & external systems', async () => {
      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      expect(model.objects).toHaveLength(2);
      expect(model.connections).toHaveLength(1);

      const internalSys = model.objects.find((o) => o.id === internalSysId);
      const externalSys = model.objects.find((o) => o.id === externalSysId);

      expect(internalSys?.metadata?.external).toBe(false);
      expect(internalSys?.metadata?.critical).toBe(true);
      expect(externalSys?.metadata?.external).toBe(true);
    });

    it('deletes System and cascades attached connection removal cleanly', async () => {
      await request(app.getHttpServer())
        .delete(`/objects/${internalSysId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      expect(model.objects).toHaveLength(1);
      expect(model.connections).toHaveLength(0); // connection was cleanly cascaded away
    });
  });
});
