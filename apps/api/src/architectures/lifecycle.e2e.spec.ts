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
    metadata: Record<string, unknown> | null;
  };
}

interface ArchitectureModelResponse {
  architecture: { id: string; name: string };
  objects: Array<{
    id: string;
    name: string;
    kind: string;
    metadata: Record<string, unknown> | null;
  }>;
  connections: Array<{ id: string }>;
}

describe('Object Lifecycle API Integration (F031)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let token: string;
  const user = {
    sub: 'usr_lcl_' + Date.now().toString(36),
    email: 'lifecycle.architect@diagramhq.com',
    name: 'Lifecycle Architect',
  };

  let orgId: string;
  let workspaceId: string;
  let architectureId: string;
  let objectId: string;
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
        name: 'Lifecycle Engineering Corp',
        slug: `lcl-corp-${Date.now().toString(36)}`,
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
        name: 'Lifecycle Space',
        slug: `lcl-space-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Lifecycle Test Architecture' });
    architectureId = archRes.body.architecture.id;

    // Create test object
    const objRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Order Service', kind: 'application' });
    objectId = objRes.body.object.id;
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  it('sets lifecycle state "future" on an object via metadata PATCH', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/objects/${objectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        metadata: {
          lifecycle: 'future',
        },
      })
      .expect(200);

    const body = res.body as ObjectResponse;
    expect(body.object.metadata?.lifecycle).toBe('future');
  });

  it('records a lifecycle transition future -> live in metadata.lifecycleTransitions', async () => {
    const transitionAt = new Date().toISOString();

    const res = await request(app.getHttpServer())
      .patch(`/objects/${objectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        metadata: {
          lifecycle: 'live',
          lifecycleTransitions: [{ from: 'future', to: 'live', at: transitionAt }],
        },
      })
      .expect(200);

    const body = res.body as ObjectResponse;
    expect(body.object.metadata?.lifecycle).toBe('live');
    const transitions = body.object.metadata?.lifecycleTransitions as Array<Record<string, string>>;
    expect(Array.isArray(transitions)).toBe(true);
    expect(transitions).toHaveLength(1);
    expect(transitions[0].to).toBe('live');
  });

  it('reloads object via GET /objects/:id and confirms lifecycle state persists', async () => {
    const res = await request(app.getHttpServer())
      .get(`/objects/${objectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = res.body as ObjectResponse;
    expect(body.object.metadata?.lifecycle).toBe('live');
    const transitions = body.object.metadata?.lifecycleTransitions as Array<Record<string, string>>;
    expect(transitions).toHaveLength(1);
  });

  it('architecture model snapshot shows object with lifecycle metadata', async () => {
    const res = await request(app.getHttpServer())
      .get(`/architectures/${architectureId}/model`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const model = res.body as ArchitectureModelResponse;
    const obj = model.objects.find((o) => o.id === objectId);
    expect(obj).toBeDefined();
    expect(obj?.metadata?.lifecycle).toBe('live');
  });
});
