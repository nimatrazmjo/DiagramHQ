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

describe('Saved Views API (F037)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let tokenUserA: string;
  let architectureId: string;
  let versionId: string;
  let orgId: string;
  let workspaceId: string;

  const userA = { sub: 'test-user-saved-views', email: 'a@example.com' };

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

    tokenUserA = authService.signToken(userA);

    orgId = createId('org');
    await prisma.organization.create({
      data: { id: orgId, name: 'Saved Views Org', slug: `saved-views-${Date.now()}` },
    });

    await prisma.member.create({
      data: { id: createId('mem'), orgId, userId: userA.sub, role: 'owner' },
    });

    workspaceId = createId('ws');
    await prisma.workspace.create({
      data: { id: workspaceId, orgId, name: 'Saved Views WS', slug: `sv-ws-${Date.now()}` },
    });

    architectureId = createId('arc');
    await prisma.architecture.create({
      data: { id: architectureId, workspaceId, name: 'Saved Views Arch' },
    });

    versionId = createId('ver');
    await prisma.version.create({
      data: { id: versionId, architectureId, name: 'main', status: 'approved' },
    });

    await prisma.modelObject.createMany({
      data: [
        { id: createId('obj'), architectureId, versionId, kind: 'application', name: 'Payment Service', metadata: { team: 'payments' } },
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('F037: should save and star a named view', async () => {
    const payload = {
      name: 'Payments View',
      kind: 'custom',
      filter: { team: 'payments' },
      isStarred: true
    };

    const res = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/views`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send(payload);
    
    expect(res.status).toBe(201);
    expect(res.body.view).toBeDefined();
    expect(res.body.view.name).toBe('Payments View');
    expect(res.body.view.isStarred).toBe(true);
    expect(res.body.view.filter).toEqual({ team: 'payments' });

    const viewId = res.body.view.id;

    const reopenRes = await request(app.getHttpServer())
      .get(`/views/${viewId}/projection`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.view.isStarred).toBe(true);
    expect(reopenRes.body.objects).toBeDefined();
    expect(reopenRes.body.objects).toHaveLength(1);
    expect(reopenRes.body.objects[0].name).toBe('Payment Service');
  });

  it('F115: should save a persona view', async () => {
    const res = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/views`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ name: 'Security Persona', kind: 'persona' });

    expect(res.status).toBe(201);
    expect(res.body.view.kind).toBe('persona');
  });

  it('F037: should update an existing view to star it', async () => {
    const createRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/views`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        name: 'Executive View',
        kind: 'custom'
      });
      
    expect(createRes.status).toBe(201);
    const viewId = createRes.body.view.id;
    expect(createRes.body.view.isStarred).toBe(false);

    const updateRes = await request(app.getHttpServer())
      .patch(`/views/${viewId}`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        isStarred: true
      });
      
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.view.isStarred).toBe(true);
  });
});
