import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, VersionKind, VersionStatus, ObjectKind, ConnectionKind } from '@prisma/client';
import { TenantContext } from './tenant.context';
import { TenantAccessDeniedError } from '@diagramhq/domain';

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://diagramhq:diagramhq@localhost:5433/diagramhq';

describe('Database Foundation & Tenant Isolation (F006)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('round-trips an organization, workspace, architecture, objects, and connections', async () => {
    const orgId = `org_test_${Date.now()}`;
    const wsId = `ws_test_${Date.now()}`;
    const archId = `arch_test_${Date.now()}`;
    const verId = `ver_test_${Date.now()}`;
    const obj1Id = `app_src_${Date.now()}`;
    const obj2Id = `sto_dst_${Date.now()}`;
    const conId = `con_test_${Date.now()}`;

    const tenantA = new TenantContext(prisma, orgId);

    // 1. Create Org
    const org = await prisma.organization.create({
      data: {
        id: orgId,
        name: 'Test Org A',
        slug: `test-org-a-${Date.now()}`,
      },
    });
    expect(org.id).toBe(orgId);

    // 2. Create Workspace via tenant context
    const ws = await tenantA.workspace.create({
      id: wsId,
      name: 'Test Workspace',
      slug: `test-ws-${Date.now()}`,
    });
    expect(ws.id).toBe(wsId);
    expect(ws.orgId).toBe(orgId);

    // 3. Create Architecture via tenant context
    const arch = await tenantA.architecture.create({
      id: archId,
      workspaceId: wsId,
      name: 'Test Architecture',
      description: 'Round-trip test',
    });
    expect(arch.id).toBe(archId);

    // 4. Create Version
    const ver = await prisma.version.create({
      data: {
        id: verId,
        architectureId: archId,
        name: 'v1.0.0',
        kind: VersionKind.main,
        status: VersionStatus.open,
      },
    });
    expect(ver.id).toBe(verId);

    // 5. Create Model Objects via tenant context
    const obj1 = await tenantA.modelObject.create({
      id: obj1Id,
      architectureId: archId,
      versionId: verId,
      kind: ObjectKind.application,
      name: 'Test Service',
      position: { x: 50, y: 50 },
    });
    expect(obj1.id).toBe(obj1Id);

    const obj2 = await tenantA.modelObject.create({
      id: obj2Id,
      architectureId: archId,
      versionId: verId,
      kind: ObjectKind.store,
      name: 'Test Store',
      position: { x: 200, y: 50 },
    });
    expect(obj2.id).toBe(obj2Id);

    // 6. Create Model Connection via tenant context
    const conn = await tenantA.modelConnection.create({
      id: conId,
      architectureId: archId,
      versionId: verId,
      sourceObjectId: obj1Id,
      targetObjectId: obj2Id,
      kind: ConnectionKind.sync,
      label: 'test link',
    });
    expect(conn.id).toBe(conId);

    // 7. Read back via tenant context
    const retrievedArch = await tenantA.architecture.findUnique(archId);
    expect(retrievedArch?.name).toBe('Test Architecture');

    const objects = await tenantA.modelObject.findMany(archId);
    expect(objects).toHaveLength(2);

    const connections = await tenantA.modelConnection.findMany(archId);
    expect(connections).toHaveLength(1);
    expect(connections[0]?.label).toBe('test link');
  });

  it('enforces tenant isolation: cross-tenant reads and access are denied', async () => {
    const orgAId = `org_a_${Date.now()}`;
    const orgBId = `org_b_${Date.now()}`;
    const wsAId = `ws_a_${Date.now()}`;
    const archAId = `arch_a_${Date.now()}`;

    // Create Tenant A Org & Workspace & Architecture
    await prisma.organization.create({
      data: { id: orgAId, name: 'Tenant A', slug: `tenant-a-${Date.now()}` },
    });
    await prisma.organization.create({
      data: { id: orgBId, name: 'Tenant B', slug: `tenant-b-${Date.now()}` },
    });

    const tenantA = new TenantContext(prisma, orgAId);
    const tenantB = new TenantContext(prisma, orgBId);

    await tenantA.workspace.create({
      id: wsAId,
      name: "Tenant A's Private Workspace",
      slug: 'private-ws',
    });

    await tenantA.architecture.create({
      id: archAId,
      workspaceId: wsAId,
      name: "Tenant A's Secret System",
    });

    // 1. Tenant B listing workspaces must NOT see Tenant A's workspace
    const tenantBWorkspaces = await tenantB.workspace.findMany();
    const foundAWorkspace = tenantBWorkspaces.find((w) => w.id === wsAId);
    expect(foundAWorkspace).toBeUndefined();

    // 2. Tenant B directly requesting Tenant A's workspace must throw TenantAccessDeniedError
    await expect(tenantB.workspace.findUnique(wsAId)).rejects.toThrow(
      TenantAccessDeniedError,
    );

    // 3. Tenant B directly requesting Tenant A's architecture must throw TenantAccessDeniedError
    await expect(tenantB.architecture.findUnique(archAId)).rejects.toThrow(
      TenantAccessDeniedError,
    );

    // 4. Tenant B trying to create an architecture inside Tenant A's workspace must be denied
    await expect(
      tenantB.architecture.create({
        id: `arch_b_hack_${Date.now()}`,
        workspaceId: wsAId,
        name: 'Unauthorized Architecture',
      }),
    ).rejects.toThrow(TenantAccessDeniedError);
  });

  it('enforces domain connection invariants at the persistence layer', async () => {
    const orgId = `org_inv_${Date.now()}`;
    const wsId = `ws_inv_${Date.now()}`;
    const archId = `arch_inv_${Date.now()}`;
    const ver1Id = `ver_inv_1_${Date.now()}`;
    const ver2Id = `ver_inv_2_${Date.now()}`;
    const obj1Id = `app_inv_1_${Date.now()}`;
    const obj2Id = `app_inv_2_${Date.now()}`;

    await prisma.organization.create({
      data: { id: orgId, name: 'Invariant Org', slug: `inv-org-${Date.now()}` },
    });

    const tenant = new TenantContext(prisma, orgId);

    await tenant.workspace.create({
      id: wsId,
      name: 'Invariant Workspace',
      slug: 'inv-ws',
    });

    await tenant.architecture.create({
      id: archId,
      workspaceId: wsId,
      name: 'Invariant Architecture',
    });

    await prisma.version.createMany({
      data: [
        { id: ver1Id, architectureId: archId, name: 'v1' },
        { id: ver2Id, architectureId: archId, name: 'v2' },
      ],
    });

    // Obj1 in ver1
    await tenant.modelObject.create({
      id: obj1Id,
      architectureId: archId,
      versionId: ver1Id,
      kind: ObjectKind.application,
      name: 'App in v1',
    });

    // Obj2 in ver2
    await tenant.modelObject.create({
      id: obj2Id,
      architectureId: archId,
      versionId: ver2Id,
      kind: ObjectKind.application,
      name: 'App in v2',
    });

    // Self-connection should be rejected
    await expect(
      tenant.modelConnection.create({
        id: `con_self_${Date.now()}`,
        architectureId: archId,
        versionId: ver1Id,
        sourceObjectId: obj1Id,
        targetObjectId: obj1Id,
        kind: ConnectionKind.sync,
      }),
    ).rejects.toThrow('Self-connection is not allowed');

    // Cross-version connection should be rejected
    await expect(
      tenant.modelConnection.create({
        id: `con_cross_${Date.now()}`,
        architectureId: archId,
        versionId: ver1Id,
        sourceObjectId: obj1Id,
        targetObjectId: obj2Id,
        kind: ConnectionKind.sync,
      }),
    ).rejects.toThrow('same version');
  });
});
