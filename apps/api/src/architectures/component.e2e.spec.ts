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

describe('Component API Integration (F025)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let token: string;
  const user = {
    sub: 'usr_cmp_' + Date.now().toString(36),
    email: 'cmp.architect@diagramhq.com',
    name: 'Component Architect',
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
        name: 'Component Engineering Corp',
        slug: `cmp-corp-${Date.now().toString(36)}`,
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
        name: 'Internal Components Space',
        slug: `cmp-space-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Banking Core Microservice Architecture' });
    architectureId = archRes.body.architecture.id;

    // Create Parent Application
    const appRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Account Service',
        kind: 'application',
        description: 'Backend account management service',
      });
    applicationId = appRes.body.object.id;
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  describe('1. Component Lifecycle & Model Persistence', () => {
    let serviceId: string;
    let repoId: string;

    it('creates a Component under a parent application', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: applicationId,
          name: 'Account Verification Service',
          kind: 'component',
          description: 'Validates customer KYC requirements and account tiering',
          metadata: {
            componentKind: 'service',
            technology: 'NestJS Service / TypeScript',
            interfaces: ['verifyCustomerTier()', 'checkKycStatus()'],
            codeRef: 'src/accounts/verification.service.ts',
          },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^cmp_/);
      expect(body.object.kind).toBe('component');
      expect(body.object.parentId).toBe(applicationId);
      expect(body.object.name).toBe('Account Verification Service');
      expect(body.object.metadata?.componentKind).toBe('service');
      expect(body.object.metadata?.codeRef).toBe('src/accounts/verification.service.ts');
      serviceId = body.object.id;
    });

    it('creates a Repository Component under the parent application', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: applicationId,
          name: 'Account Repository',
          kind: 'component',
          description: 'Data access layer for PostgreSQL accounts table',
          metadata: {
            componentKind: 'repository',
            technology: 'Prisma Client',
            codeRef: 'src/accounts/account.repository.ts',
          },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^cmp_/);
      expect(body.object.kind).toBe('component');
      expect(body.object.parentId).toBe(applicationId);
      repoId = body.object.id;
    });

    it('connects Service component -> Repository component', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/connections`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceObjectId: serviceId,
          targetObjectId: repoId,
          kind: 'sync',
          label: 'Reads KYC status from',
          description: 'Queries account ledger records',
        })
        .expect(201);

      const body = res.body as ConnectionResponse;
      expect(body.connection.sourceObjectId).toBe(serviceId);
      expect(body.connection.targetObjectId).toBe(repoId);
      expect(body.connection.label).toBe('Reads KYC status from');
    });

    it('updates Component metadata (PATCH /objects/:id)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/objects/${serviceId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'KYC & Verification Service',
          metadata: {
            componentKind: 'service',
            technology: 'NestJS / TypeScript',
            interfaces: ['verifyCustomerTier()', 'checkKycStatus()', 'refreshKycToken()'],
            codeRef: 'src/accounts/verification.service.ts',
          },
        })
        .expect(200);

      const body = res.body as ObjectResponse;
      expect(body.object.name).toBe('KYC & Verification Service');
      expect(body.object.metadata?.interfaces).toHaveLength(3);
    });

    it('reloads complete architecture model with Components and connections', async () => {
      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      expect(model.objects).toHaveLength(3); // application + 2 components
      expect(model.connections).toHaveLength(1);

      const service = model.objects.find((o) => o.id === serviceId);
      const repo = model.objects.find((o) => o.id === repoId);

      expect(service?.kind).toBe('component');
      expect(service?.parentId).toBe(applicationId);
      expect(repo?.kind).toBe('component');
      expect(repo?.parentId).toBe(applicationId);
    });

    it('deletes Component and cascades connection removal cleanly', async () => {
      await request(app.getHttpServer())
        .delete(`/objects/${serviceId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      expect(model.objects).toHaveLength(2); // application + repo remaining
      expect(model.connections).toHaveLength(0); // connection cascaded away
    });
  });
});
