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

describe('C4 Context API Integration (F019)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let token: string;
  const user = {
    sub: 'usr_c4_' + Date.now().toString(36),
    email: 'c4.context@diagramhq.com',
    name: 'C4 Architect',
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
        name: 'C4 Banking Corp',
        slug: `c4-corp-${Date.now().toString(36)}`,
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
        name: 'Retail Banking',
        slug: `retail-banking-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Internet Banking System Architecture' });
    architectureId = archRes.body.architecture.id;
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  describe('1. C4 Context Elements Creation & Persistence (Acceptance Criteria)', () => {
    let personId: string;
    let systemId: string;
    let externalSystemId: string;

    it('creates a C4 Person (Actor)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Personal Banking Customer',
          kind: 'actor',
          description: 'A customer of the bank with personal bank accounts',
          metadata: { c4Level: 1, c4Kind: 'person' },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^act_/);
      expect(body.object.kind).toBe('actor');
      expect(body.object.name).toBe('Personal Banking Customer');
      personId = body.object.id;
    });

    it('creates an internal C4 Software System', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Internet Banking System',
          kind: 'system',
          description: 'Allows customers to view information and make payments',
          metadata: { c4Level: 1, c4Kind: 'system', external: false },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^sys_/);
      expect(body.object.kind).toBe('system');
      expect(body.object.metadata?.external).toBe(false);
      systemId = body.object.id;
    });

    it('creates an external C4 Software System', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Mainframe Banking System',
          kind: 'system',
          description: 'Stores core accounts, balances, and transactions',
          metadata: { c4Level: 1, c4Kind: 'external_system', external: true },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^sys_/);
      expect(body.object.metadata?.external).toBe(true);
      externalSystemId = body.object.id;
    });

    it('connects Person -> System (Acceptance Criteria)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/connections`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceObjectId: personId,
          targetObjectId: systemId,
          kind: 'sync',
          label: 'Uses',
          description: 'Views account balances and makes payments using',
        })
        .expect(201);

      const body = res.body as ConnectionResponse;
      expect(body.connection.sourceObjectId).toBe(personId);
      expect(body.connection.targetObjectId).toBe(systemId);
      expect(body.connection.label).toBe('Uses');
    });

    it('connects System -> External System', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/connections`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceObjectId: systemId,
          targetObjectId: externalSystemId,
          kind: 'sync',
          label: 'Gets accounts info and executes payments using',
        })
        .expect(201);

      const body = res.body as ConnectionResponse;
      expect(body.connection.sourceObjectId).toBe(systemId);
      expect(body.connection.targetObjectId).toBe(externalSystemId);
    });

    it('persists and reloads identical C4 Context model (Acceptance Criteria)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      expect(model.objects).toHaveLength(3);
      expect(model.connections).toHaveLength(2);

      const person = model.objects.find((o) => o.id === personId);
      const system = model.objects.find((o) => o.id === systemId);
      const external = model.objects.find((o) => o.id === externalSystemId);

      expect(person?.kind).toBe('actor');
      expect(system?.metadata?.external).toBe(false);
      expect(external?.metadata?.external).toBe(true);
    });

    it('edits and deletes a C4 Context element', async () => {
      // Edit person
      const updateRes = await request(app.getHttpServer())
        .patch(`/objects/${personId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'VIP Banking Customer' })
        .expect(200);

      expect(updateRes.body.object.name).toBe('VIP Banking Customer');

      // Delete external system
      await request(app.getHttpServer())
        .delete(`/objects/${externalSystemId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Reload model and verify external system and its connection are removed
      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      expect(model.objects).toHaveLength(2);
      expect(model.connections).toHaveLength(1); // the other connection cascaded
    });
  });
});
