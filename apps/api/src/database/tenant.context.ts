import type {
  Architecture,
  ModelConnection,
  ModelObject,
  Prisma,
  PrismaClient,
  View,
  Workspace,
} from '@prisma/client';
import type { ArchitectureId, ObjectId, VersionId } from '@diagramhq/domain';
import { assertTenantAccess, validateConnection } from '@diagramhq/domain';

export class TenantContext {
  constructor(
    private readonly prisma: PrismaClient,
    public readonly orgId: string,
  ) {}

  /**
   * Asserts that a workspace belongs to this tenant organization.
   * Throws TenantAccessDeniedError if it belongs to a different tenant.
   */
  async assertWorkspaceAccess(workspaceId: string): Promise<Workspace> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!ws) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }
    assertTenantAccess(ws.orgId, this.orgId);
    return ws;
  }

  /**
   * Asserts that an architecture belongs to this tenant organization.
   * Throws TenantAccessDeniedError if it belongs to a different tenant.
   */
  async assertArchitectureAccess(architectureId: string): Promise<Architecture> {
    const arch = await this.prisma.architecture.findUnique({
      where: { id: architectureId },
      include: { workspace: true },
    });
    if (!arch) {
      throw new Error(`Architecture ${architectureId} not found`);
    }
    assertTenantAccess(arch.workspace.orgId, this.orgId);
    return arch;
  }

  readonly organization = {
    get: async () => {
      return this.prisma.organization.findUnique({
        where: { id: this.orgId },
      });
    },
  };

  readonly workspace = {
    findMany: async (args?: Omit<Prisma.WorkspaceFindManyArgs, 'where'> & { where?: Omit<Prisma.WorkspaceWhereInput, 'orgId'> }) => {
      return this.prisma.workspace.findMany({
        ...args,
        where: {
          ...args?.where,
          orgId: this.orgId,
        },
      });
    },

    findUnique: async (id: string): Promise<Workspace | null> => {
      const ws = await this.prisma.workspace.findUnique({ where: { id } });
      if (!ws) return null;
      assertTenantAccess(ws.orgId, this.orgId);
      return ws;
    },

    create: async (data: Omit<Prisma.WorkspaceCreateInput, 'organization'>) => {
      return this.prisma.workspace.create({
        data: {
          ...data,
          organization: { connect: { id: this.orgId } },
        },
      });
    },
  };

  readonly architecture = {
    findMany: async (workspaceId?: string) => {
      if (workspaceId) {
        await this.assertWorkspaceAccess(workspaceId);
        return this.prisma.architecture.findMany({
          where: { workspaceId },
        });
      }
      return this.prisma.architecture.findMany({
        where: {
          workspace: { orgId: this.orgId },
        },
      });
    },

    findUnique: async (id: string): Promise<Architecture | null> => {
      const arch = await this.prisma.architecture.findUnique({
        where: { id },
        include: { workspace: true },
      });
      if (!arch) return null;
      assertTenantAccess(arch.workspace.orgId, this.orgId);
      return arch;
    },

    create: async (data: {
      id: string;
      workspaceId: string;
      name: string;
      description?: string | null;
      defaultVersionId?: string | null;
    }) => {
      await this.assertWorkspaceAccess(data.workspaceId);
      return this.prisma.architecture.create({
        data: {
          id: data.id,
          name: data.name,
          description: data.description,
          defaultVersionId: data.defaultVersionId,
          workspace: { connect: { id: data.workspaceId } },
        },
      });
    },
  };

  readonly modelObject = {
    findMany: async (architectureId: string, versionId?: string) => {
      await this.assertArchitectureAccess(architectureId);
      return this.prisma.modelObject.findMany({
        where: {
          architectureId,
          ...(versionId ? { versionId } : {}),
        },
      });
    },

    findUnique: async (id: string): Promise<ModelObject | null> => {
      const obj = await this.prisma.modelObject.findUnique({
        where: { id },
        include: { architecture: { include: { workspace: true } } },
      });
      if (!obj) return null;
      assertTenantAccess(obj.architecture.workspace.orgId, this.orgId);
      return obj;
    },

    create: async (data: Prisma.ModelObjectUncheckedCreateInput) => {
      await this.assertArchitectureAccess(data.architectureId);
      return this.prisma.modelObject.create({
        data,
      });
    },
  };

  readonly modelConnection = {
    findMany: async (architectureId: string, versionId?: string) => {
      await this.assertArchitectureAccess(architectureId);
      return this.prisma.modelConnection.findMany({
        where: {
          architectureId,
          ...(versionId ? { versionId } : {}),
        },
      });
    },

    findUnique: async (id: string): Promise<ModelConnection | null> => {
      const conn = await this.prisma.modelConnection.findUnique({
        where: { id },
        include: { architecture: { include: { workspace: true } } },
      });
      if (!conn) return null;
      assertTenantAccess(conn.architecture.workspace.orgId, this.orgId);
      return conn;
    },

    create: async (data: Prisma.ModelConnectionUncheckedCreateInput) => {
      await this.assertArchitectureAccess(data.architectureId);

      // Verify domain invariants
      const source = await this.prisma.modelObject.findUnique({
        where: { id: data.sourceObjectId },
      });
      const target = await this.prisma.modelObject.findUnique({
        where: { id: data.targetObjectId },
      });

      if (!source || !target) {
        throw new Error('Source or target model object does not exist');
      }

      const validation = validateConnection({
        architectureId: data.architectureId as ArchitectureId,
        versionId: data.versionId as VersionId,
        source: {
          id: source.id as ObjectId,
          architectureId: source.architectureId as ArchitectureId,
          versionId: source.versionId as VersionId,
        },
        target: {
          id: target.id as ObjectId,
          architectureId: target.architectureId as ArchitectureId,
          versionId: target.versionId as VersionId,
        },
      });

      if (!validation.valid) {
        throw new Error(validation.reason ?? 'Invalid connection invariant');
      }

      return this.prisma.modelConnection.create({
        data,
      });
    },
  };

  readonly view = {
    findMany: async (architectureId: string) => {
      await this.assertArchitectureAccess(architectureId);
      return this.prisma.view.findMany({
        where: { architectureId },
      });
    },

    findUnique: async (id: string): Promise<View | null> => {
      const view = await this.prisma.view.findUnique({
        where: { id },
        include: { architecture: { include: { workspace: true } } },
      });
      if (!view) return null;
      assertTenantAccess(view.architecture.workspace.orgId, this.orgId);
      return view;
    },

    create: async (data: Prisma.ViewUncheckedCreateInput) => {
      await this.assertArchitectureAccess(data.architectureId);
      return this.prisma.view.create({
        data,
      });
    },
  };
}
