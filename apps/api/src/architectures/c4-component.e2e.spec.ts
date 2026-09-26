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

describe('C4 Component API Integration (F021)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let token: string;
  const user = {
    sub: 'usr_c4cmp_' + Date.now().toString(36),
    email: 'c4.component@diagramhq.com',
    name: 'C4 Component Architect',
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
        name: 'C4 Component Banking Corp',
        slug: `c4-component-corp-${Date.now().toString(36)}`,
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
        name: 'Component Banking WS',
        slug: `component-banking-ws-${Date.now().toString(36)}`,
      },
    });

    // Create Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${wsId}/architectures`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Banking Core Architecture Model' });
    expect(archRes.status).toBe(201);
    archId = archRes.body.architecture.id;
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.organization.deleteMany({ where: { id: orgId } });
    }
    await app.close();
  });

  describe('1. C4 Components Creation inside a Container (Acceptance Criteria)', () => {
    let systemId: string;
    let containerId: string;
    let controllerId: string;
    let serviceId: string;
    let repoId: string;

    it('creates parent System and Container hierarchy', async () => {
      // 1. Create System (Level 1)
      const sysRes = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Internet Banking System',
          kind: 'system',
          metadata: { c4Level: 1 },
        });
      expect(sysRes.status).toBe(201);
      systemId = (sysRes.body as ObjectResponse).object.id;

      // 2. Create Container (Level 2)
      const contRes = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: systemId,
          name: 'API Application',
          kind: 'application',
          description: 'REST API service for online banking',
          metadata: {
            c4Level: 2,
            containerKind: 'api',
            technology: 'NestJS / TypeScript',
          },
        });
      expect(contRes.status).toBe(201);
      containerId = (contRes.body as ObjectResponse).object.id;
    });

    it('creates a Controller component inside the container with L4 code mapping stub', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: containerId,
          name: 'Accounts Controller',
          kind: 'component',
          description: 'Exposes HTTP REST routes for checking and savings accounts',
          metadata: {
            c4Level: 3,
            componentKind: 'controller',
            technology: 'NestJS Controller',
            codeMappingStub: {
              repositoryUrl: 'https://github.com/diagramhq/banking-api',
              filePath: 'src/accounts/accounts.controller.ts',
              symbol: 'AccountsController',
            },
          },
        });

      expect(res.status).toBe(201);
      const data = res.body as ObjectResponse;
      expect(data.object.name).toBe('Accounts Controller');
      expect(data.object.parentId).toBe(containerId);
      expect(data.object.kind).toBe('component');
      expect(data.object.metadata?.technology).toBe('NestJS Controller');
      expect(data.object.metadata?.codeMappingStub).toEqual({
        repositoryUrl: 'https://github.com/diagramhq/banking-api',
        filePath: 'src/accounts/accounts.controller.ts',
        symbol: 'AccountsController',
      });
      controllerId = data.object.id;
    });

    it('creates a Service component inside the container with L4 code mapping stub', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: containerId,
          name: 'Transfer Service',
          kind: 'component',
          description: 'Orchestrates account balance validation and money transfers',
          metadata: {
            c4Level: 3,
            componentKind: 'service',
            technology: 'NestJS Service',
            codeMappingStub: {
              repositoryUrl: 'https://github.com/diagramhq/banking-api',
              filePath: 'src/transfers/transfer.service.ts',
              symbol: 'TransferService',
            },
          },
        });

      expect(res.status).toBe(201);
      const data = res.body as ObjectResponse;
      expect(data.object.name).toBe('Transfer Service');
      expect(data.object.parentId).toBe(containerId);
      serviceId = data.object.id;
    });

    it('creates a Repository component inside the container with L4 code mapping stub', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: containerId,
          name: 'Account Repository',
          kind: 'component',
          description: 'Performs SQL queries via Prisma',
          metadata: {
            c4Level: 3,
            componentKind: 'repository',
            technology: 'Prisma Client',
            codeMappingStub: {
              repositoryUrl: 'https://github.com/diagramhq/banking-api',
              filePath: 'src/accounts/account.repository.ts',
              symbol: 'AccountRepository',
            },
          },
        });

      expect(res.status).toBe(201);
      const data = res.body as ObjectResponse;
      expect(data.object.name).toBe('Account Repository');
      expect(data.object.parentId).toBe(containerId);
      repoId = data.object.id;
    });

    it('connects Controller -> Service and Service -> Repository', async () => {
      const conn1Res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/connections`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceObjectId: controllerId,
          targetObjectId: serviceId,
          kind: 'sync',
          label: 'Delegates transfer requests to',
        });
      expect(conn1Res.status).toBe(201);

      const conn2Res = await request(app.getHttpServer())
        .post(`/architectures/${archId}/connections`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceObjectId: serviceId,
          targetObjectId: repoId,
          kind: 'sync',
          label: 'Loads and writes account entities via',
        });
      expect(conn2Res.status).toBe(201);
      const conn2 = (conn2Res.body as ConnectionResponse).connection;
      expect(conn2.label).toBe('Loads and writes account entities via');
    });

    it('persists and reloads an identical C4 model with components, stubs, and connections', async () => {
      const res = await request(app.getHttpServer())
        .get(`/architectures/${archId}/model`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const model = res.body as ArchitectureModelResponse;

      // 1 system + 1 container + 3 components = 5 objects
      expect(model.objects).toHaveLength(5);
      expect(model.connections).toHaveLength(2);

      const componentsUnderContainer = model.objects.filter((o) => o.parentId === containerId);
      expect(componentsUnderContainer).toHaveLength(3);

      const ctrl = componentsUnderContainer.find((c) => c.name === 'Accounts Controller');
      expect(ctrl).toBeDefined();
      expect(ctrl?.metadata?.codeMappingStub).toEqual({
        repositoryUrl: 'https://github.com/diagramhq/banking-api',
        filePath: 'src/accounts/accounts.controller.ts',
        symbol: 'AccountsController',
      });
    });

    it('edits and deletes a component cleanly', async () => {
      const editRes = await request(app.getHttpServer())
        .patch(`/objects/${repoId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Account Data Access Layer',
        });
      expect(editRes.status).toBe(200);

      const delRes = await request(app.getHttpServer())
        .delete(`/objects/${controllerId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(delRes.status).toBe(200);

      // Verify connection attached to controller was cascaded
      const modelRes = await request(app.getHttpServer())
        .get(`/architectures/${archId}/model`)
        .set('Authorization', `Bearer ${token}`);
      expect(modelRes.status).toBe(200);
      const model = modelRes.body as ArchitectureModelResponse;
      expect(model.objects).toHaveLength(4);
      expect(model.connections).toHaveLength(1);
    });
  });
});
