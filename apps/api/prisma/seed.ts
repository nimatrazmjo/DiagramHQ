import { PrismaClient, VersionKind, VersionStatus, ObjectKind, ConnectionKind, ViewKind, MemberRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function seed(): Promise<void> {
  console.log('Seeding DiagramHQ database...');

  // Clean existing seed data if any
  await prisma.viewObject.deleteMany();
  await prisma.view.deleteMany();
  await prisma.modelConnection.deleteMany();
  await prisma.modelObject.deleteMany();
  await prisma.version.deleteMany();
  await prisma.architecture.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.member.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Organization
  const org = await prisma.organization.create({
    data: {
      id: 'org_acme',
      name: 'Acme Corporation',
      slug: 'acme',
    },
  });

  // 2. Member
  await prisma.member.create({
    data: {
      id: 'mem_admin',
      orgId: org.id,
      userId: 'user_admin',
      role: MemberRole.owner,
    },
  });

  // 3. Workspace
  const ws = await prisma.workspace.create({
    data: {
      id: 'ws_core',
      orgId: org.id,
      name: 'Core Engineering',
      slug: 'core',
      settings: { defaultTheme: 'dark' },
    },
  });

  // 4. Architecture
  const arch = await prisma.architecture.create({
    data: {
      id: 'arch_platform',
      workspaceId: ws.id,
      name: 'DiagramHQ Platform',
      description: 'Model-first architecture intelligence platform',
    },
  });

  // 5. Version
  const version = await prisma.version.create({
    data: {
      id: 'ver_main',
      architectureId: arch.id,
      name: 'main',
      kind: VersionKind.main,
      status: VersionStatus.open,
    },
  });

  await prisma.architecture.update({
    where: { id: arch.id },
    data: { defaultVersionId: version.id },
  });

  // 6. Model Objects
  const sys = await prisma.modelObject.create({
    data: {
      id: 'sys_diagramhq',
      architectureId: arch.id,
      versionId: version.id,
      kind: ObjectKind.system,
      name: 'DiagramHQ System',
      description: 'Top-level platform system',
      position: { x: 0, y: 0 },
    },
  });

  const webApp = await prisma.modelObject.create({
    data: {
      id: 'app_web',
      architectureId: arch.id,
      versionId: version.id,
      parentId: sys.id,
      kind: ObjectKind.application,
      name: 'Web UI',
      description: 'Next.js application shell and React Flow canvas',
      position: { x: 100, y: 100 },
    },
  });

  const apiApp = await prisma.modelObject.create({
    data: {
      id: 'app_api',
      architectureId: arch.id,
      versionId: version.id,
      parentId: sys.id,
      kind: ObjectKind.application,
      name: 'API Service',
      description: 'NestJS backend and domain engine',
      position: { x: 400, y: 100 },
    },
  });

  const dbStore = await prisma.modelObject.create({
    data: {
      id: 'sto_postgres',
      architectureId: arch.id,
      versionId: version.id,
      parentId: sys.id,
      kind: ObjectKind.store,
      name: 'PostgreSQL Store',
      description: 'Primary relational and adjacency graph datastore',
      position: { x: 400, y: 300 },
    },
  });

  // 7. Model Connections
  await prisma.modelConnection.create({
    data: {
      id: 'con_web_to_api',
      architectureId: arch.id,
      versionId: version.id,
      sourceObjectId: webApp.id,
      targetObjectId: apiApp.id,
      kind: ConnectionKind.sync,
      label: 'HTTPS / REST',
      description: 'Client requests to API',
    },
  });

  await prisma.modelConnection.create({
    data: {
      id: 'con_api_to_db',
      architectureId: arch.id,
      versionId: version.id,
      sourceObjectId: apiApp.id,
      targetObjectId: dbStore.id,
      kind: ConnectionKind.data,
      label: 'TCP / Prisma',
      description: 'ORM queries with tenant isolation',
    },
  });

  // 8. View
  const view = await prisma.view.create({
    data: {
      id: 'vw_context',
      architectureId: arch.id,
      name: 'Context Overview',
      kind: ViewKind.context,
      level: 1,
    },
  });

  // 9. View Objects
  await prisma.viewObject.createMany({
    data: [
      { viewId: view.id, objectId: sys.id, position: { x: 0, y: 0 } },
      { viewId: view.id, objectId: webApp.id, position: { x: 100, y: 100 } },
      { viewId: view.id, objectId: apiApp.id, position: { x: 400, y: 100 } },
      { viewId: view.id, objectId: dbStore.id, position: { x: 400, y: 300 } },
    ],
  });

  console.log('Database seeded successfully: 1 org, 1 workspace, 1 architecture, 4 objects, 2 connections, 1 view');
}

if (require.main === module) {
  seed()
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
