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

describe('Person API Integration (F022)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let token: string;
  const user = {
    sub: 'usr_person_' + Date.now().toString(36),
    email: 'person.architect@diagramhq.com',
    name: 'Person Architect',
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
        name: 'Person Corp',
        slug: `person-corp-${Date.now().toString(36)}`,
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
        name: 'People and Systems',
        slug: `people-systems-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Enterprise People Architecture' });
    architectureId = archRes.body.architecture.id;
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  describe('1. Person Element Lifecycle & Metadata Persistence', () => {
    let internalPersonId: string;
    let externalPersonId: string;
    let systemId: string;

    it('creates an internal Person with role, department, and email', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Jane Smith',
          kind: 'actor',
          description: 'Lead Site Reliability Engineer',
          metadata: {
            role: 'Lead SRE',
            department: 'Cloud Operations',
            external: false,
            email: 'jane.smith@company.com',
          },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^act_/);
      expect(body.object.kind).toBe('actor');
      expect(body.object.name).toBe('Jane Smith');
      expect(body.object.metadata?.role).toBe('Lead SRE');
      expect(body.object.metadata?.department).toBe('Cloud Operations');
      expect(body.object.metadata?.external).toBe(false);
      expect(body.object.metadata?.email).toBe('jane.smith@company.com');
      internalPersonId = body.object.id;
    });

    it('creates an external Person (customer/external user)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Corporate Client',
          kind: 'actor',
          description: 'External treasury department treasurer',
          metadata: {
            role: 'Corporate Treasurer',
            external: true,
          },
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^act_/);
      expect(body.object.kind).toBe('actor');
      expect(body.object.metadata?.external).toBe(true);
      expect(body.object.metadata?.role).toBe('Corporate Treasurer');
      externalPersonId = body.object.id;
    });

    it('creates a target software system to connect with', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/objects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Payment Processing Gateway',
          kind: 'system',
          description: 'Processes corporate payments and wire transfers',
        })
        .expect(201);

      const body = res.body as ObjectResponse;
      expect(body.object.id).toMatch(/^sys_/);
      systemId = body.object.id;
    });

    it('connects Person to System with user interaction relationship', async () => {
      const res = await request(app.getHttpServer())
        .post(`/architectures/${architectureId}/connections`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceObjectId: internalPersonId,
          targetObjectId: systemId,
          kind: 'sync',
          label: 'Monitors & Configures',
          description: 'Monitors health status and applies deployment patches',
        })
        .expect(201);

      const body = res.body as ConnectionResponse;
      expect(body.connection.sourceObjectId).toBe(internalPersonId);
      expect(body.connection.targetObjectId).toBe(systemId);
      expect(body.connection.label).toBe('Monitors & Configures');
    });

    it('updates Person metadata (PATCH /objects/:id)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/objects/${internalPersonId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Jane Smith, Staff SRE',
          metadata: {
            role: 'Staff SRE',
            department: 'Core Infrastructure',
            external: false,
            email: 'jane.smith@company.com',
          },
        })
        .expect(200);

      const body = res.body as ObjectResponse;
      expect(body.object.name).toBe('Jane Smith, Staff SRE');
      expect(body.object.metadata?.role).toBe('Staff SRE');
      expect(body.object.metadata?.department).toBe('Core Infrastructure');
    });

    it('reloads complete architecture model with Persons and connections', async () => {
      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      expect(model.objects).toHaveLength(3);
      expect(model.connections).toHaveLength(1);

      const internalPerson = model.objects.find((o) => o.id === internalPersonId);
      const externalPerson = model.objects.find((o) => o.id === externalPersonId);
      const system = model.objects.find((o) => o.id === systemId);

      expect(internalPerson?.kind).toBe('actor');
      expect(internalPerson?.metadata?.external).toBe(false);
      expect(externalPerson?.kind).toBe('actor');
      expect(externalPerson?.metadata?.external).toBe(true);
      expect(system?.kind).toBe('system');
    });

    it('deletes Person and cascades connection removal cleanly', async () => {
      await request(app.getHttpServer())
        .delete(`/objects/${internalPersonId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/architectures/${architectureId}/model`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const model = res.body as ArchitectureModelResponse;
      expect(model.objects).toHaveLength(2);
      expect(model.connections).toHaveLength(0); // connection cascaded away
    });
  });
});
