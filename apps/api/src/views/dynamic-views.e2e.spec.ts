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

interface ViewResponse {
  view: {
    id: string;
    architectureId: string;
    name: string;
    kind: string;
    filter: Record<string, unknown> | null;
  };
}

interface ViewObjectsResponse {
  viewObjects: Array<{
    viewId: string;
    objectId: string;
    position?: { x: number; y: number } | null;
  }>;
}

interface ViewProjectionResponse {
  view: { id: string; name: string };
  objects: Array<{
    id: string;
    name: string;
    kind: string;
    metadata: Record<string, unknown> | null;
    position: { x: number; y: number } | null;
  }>;
}

describe('F035 — Dynamic Views (Phase 04)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  let tokenOwner: string;
  let tokenViewer: string;
  const userOwner = {
    sub: 'usr_dyn_owner_' + Date.now().toString(36),
    email: 'dyn.owner@diagramhq.com',
    name: 'Dynamic Owner',
  };
  const userViewer = {
    sub: 'usr_dyn_viewer_' + Date.now().toString(36),
    email: 'dyn.viewer@diagramhq.com',
    name: 'Dynamic Viewer',
  };

  let orgId: string;
  let workspaceId: string;
  let architectureId: string;
  let obj1Id: string;
  let obj2Id: string;
  let obj3Id: string;
  const createdOrgIds: string[] = [];

  let teamViewId: string;
  let multiCriteriaViewId: string;

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
    tokenOwner = authService.signToken(userOwner);
    tokenViewer = authService.signToken(userViewer);

    // Setup Org
    orgId = createId('org');
    await prisma.organization.create({
      data: {
        id: orgId,
        name: 'Dynamic Views Org',
        slug: `dyn-org-${Date.now().toString(36)}`,
        members: {
          create: [
            { id: createId('mem'), userId: userOwner.sub, role: 'owner' },
            { id: createId('mem'), userId: userViewer.sub, role: 'viewer' },
          ],
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
        name: 'Dynamic Views Space',
        slug: `dyn-space-${Date.now().toString(36)}`,
      },
    });

    // Setup Architecture
    const archRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/architectures`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ name: 'Global Cloud Platform' });
    architectureId = archRes.body.architecture.id;

    // Create Object 1: Payment Gateway (Platform Core, AWS, Production, Critical)
    const o1Res = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'Payment Gateway',
        kind: 'application',
        metadata: {
          team: 'Platform Core',
          technology: 'NestJS',
          environment: 'production',
          domain: 'Payments',
          owner: 'Sarah Connor',
          status: 'active',
          tags: ['tier-1', 'pci-dss'],
          criticality: 'critical',
          'data-classification': 'restricted',
          cloud: 'AWS',
          region: 'us-east-1',
          repository: 'https://github.com/platform/payment-gateway',
        },
      });
    obj1Id = o1Res.body.object.id;

    // Create Object 2: Analytics Ingestion (Data Team, GCP, Staging, Low)
    const o2Res = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'Analytics Ingestion',
        kind: 'application',
        metadata: {
          team: 'Data Team',
          technology: 'Python',
          environment: 'staging',
          domain: 'BI',
          owner: 'Bob Smith',
          status: 'deprecated',
          tags: ['internal', 'batch'],
          criticality: 'low',
          'data-classification': 'internal',
          cloud: 'GCP',
          region: 'us-central1',
          repository: 'https://github.com/platform/analytics-ingestion',
        },
      });
    obj2Id = o2Res.body.object.id;

    // Create Object 3: Notifications Service (Initially Billing Team)
    const o3Res = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/objects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'Notifications Service',
        kind: 'application',
        metadata: {
          team: 'Billing Team',
          technology: 'Go',
          environment: 'production',
          domain: 'Messaging',
          owner: 'Charlie',
          status: 'active',
          tags: ['notifications'],
          criticality: 'medium',
          'data-classification': 'internal',
          cloud: 'AWS',
          region: 'eu-west-1',
          repository: 'https://github.com/platform/notifications-service',
        },
      });
    obj3Id = o3Res.body.object.id;
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.deleteMany({ where: { id } });
    }
    await app.close();
  });

  it('1. creates dynamic views filtering by team, cloud, technology, etc.', async () => {
    const res = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/views`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'Platform Core Live View',
        kind: 'custom',
        filter: { team: 'Platform Core' },
      })
      .expect(201);

    const body = res.body as ViewResponse;
    expect(body.view.kind).toBe('custom');
    expect(body.view.name).toBe('Platform Core Live View');
    expect(body.view.filter).toEqual({ team: 'Platform Core' });
    teamViewId = body.view.id;

    const res2 = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/views`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'AWS Production Critical Live View',
        kind: 'custom',
        filter: {
          cloud: 'AWS',
          environment: 'production',
          criticality: 'critical',
        },
      })
      .expect(201);

    multiCriteriaViewId = (res2.body as ViewResponse).view.id;
  });

  it('2. live projects objects satisfying filter criteria without storing static object records', async () => {
    const res = await request(app.getHttpServer())
      .get(`/views/${teamViewId}/objects`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .expect(200);

    const body = res.body as ViewObjectsResponse;
    // Only obj1 belongs to Platform Core initially
    expect(body.viewObjects).toHaveLength(1);
    expect(body.viewObjects[0].objectId).toBe(obj1Id);

    // Multi-criteria view
    const res2 = await request(app.getHttpServer())
      .get(`/views/${multiCriteriaViewId}/projection`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .expect(200);

    const body2 = res2.body as ViewProjectionResponse;
    expect(body2.objects).toHaveLength(1);
    expect(body2.objects[0].id).toBe(obj1Id);
    expect(body2.objects[0].name).toBe('Payment Gateway');

    // GCP Dynamic View verifying obj2Id
    const gcpRes = await request(app.getHttpServer())
      .post(`/architectures/${architectureId}/views`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'GCP Analytics Dynamic View',
        kind: 'custom',
        filter: { cloud: 'GCP' },
      })
      .expect(201);
    const gcpViewId = (gcpRes.body as ViewResponse).view.id;
    const gcpObjectsRes = await request(app.getHttpServer())
      .get(`/views/${gcpViewId}/objects`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .expect(200);
    expect((gcpObjectsRes.body as ViewObjectsResponse).viewObjects[0].objectId).toBe(obj2Id);
  });

  it('3. acceptance test: changing an object metadata causes it to enter and leave the dynamic view immediately', async () => {
    // Step A: Notifications Service (obj3Id) is currently team: 'Billing Team', so it is NOT in teamViewId
    let viewRes = await request(app.getHttpServer())
      .get(`/views/${teamViewId}/objects`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .expect(200);
    expect((viewRes.body as ViewObjectsResponse).viewObjects.some((o) => o.objectId === obj3Id)).toBe(false);

    // Step B: Reassign obj3Id team metadata to 'Platform Core'
    await request(app.getHttpServer())
      .patch(`/objects/${obj3Id}`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        metadata: {
          team: 'Platform Core',
          technology: 'Go',
          environment: 'production',
        },
      })
      .expect(200);

    // Step C: Verify obj3Id immediately ENTERS the dynamic view
    viewRes = await request(app.getHttpServer())
      .get(`/views/${teamViewId}/objects`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .expect(200);
    const viewObjectsEnter = (viewRes.body as ViewObjectsResponse).viewObjects;
    expect(viewObjectsEnter).toHaveLength(2);
    expect(viewObjectsEnter.some((o) => o.objectId === obj3Id)).toBe(true);

    // Step D: Reassign obj3Id team metadata to 'Analytics Team'
    await request(app.getHttpServer())
      .patch(`/objects/${obj3Id}`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        metadata: {
          team: 'Analytics Team',
          technology: 'Go',
          environment: 'production',
        },
      })
      .expect(200);

    // Step E: Verify obj3Id immediately LEAVES the dynamic view
    viewRes = await request(app.getHttpServer())
      .get(`/views/${teamViewId}/objects`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .expect(200);
    const viewObjectsLeave = (viewRes.body as ViewObjectsResponse).viewObjects;
    expect(viewObjectsLeave).toHaveLength(1);
    expect(viewObjectsLeave.some((o) => o.objectId === obj3Id)).toBe(false);
  });

  it('4. supports layout position persistence for dynamically projected view objects', async () => {
    await request(app.getHttpServer())
      .patch(`/views/${teamViewId}/objects/${obj1Id}/position`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ x: 300, y: 150 })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/views/${teamViewId}/objects`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .expect(200);

    const body = res.body as ViewObjectsResponse;
    const item = body.viewObjects.find((o) => o.objectId === obj1Id);
    expect(item?.position).toEqual({ x: 300, y: 150 });
  });
});
