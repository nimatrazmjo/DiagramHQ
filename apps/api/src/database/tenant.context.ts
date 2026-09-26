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
import {
  assertTenantAccess,
  hasParentCycle,
  validateConnection,
  validateViewObject,
} from '@diagramhq/domain';

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

    create: async (data: Prisma.ArchitectureUncheckedCreateInput) => {
      await this.assertWorkspaceAccess(data.workspaceId);
      return this.prisma.architecture.create({ data });
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
      const version = await this.prisma.version.findUnique({
        where: { id: data.versionId },
      });
      if (!version || version.architectureId !== data.architectureId) {
        throw new Error('Version does not belong to the given architecture');
      }
      if (data.parentId != null) {
        const parent = await this.prisma.modelObject.findUnique({
          where: { id: data.parentId },
        });
        if (
          !parent ||
          parent.architectureId !== data.architectureId ||
          parent.versionId !== data.versionId
        ) {
          throw new Error('Parent object does not belong to the given architecture/version');
        }

        // Walk the existing ancestor chain so hasParentCycle can check the new
        // object against it. A create-only path can't yet form a cycle on its
        // own (the new id can't already be an ancestor), but this keeps the
        // guard correct once objects can be reparented.
        const ancestors = new Map<string, string | null>([[parent.id, parent.parentId]]);
        let cursor = parent.parentId;
        while (cursor && !ancestors.has(cursor)) {
          const node = await this.prisma.modelObject.findUnique({
            where: { id: cursor },
            select: { id: true, parentId: true },
          });
          if (!node) break;
          ancestors.set(node.id, node.parentId);
          cursor = node.parentId;
        }
        if (
          hasParentCycle(data.id as ObjectId, data.parentId as ObjectId, (id) =>
            ancestors.get(id) as ObjectId | null | undefined,
          )
        ) {
          throw new Error('Parent assignment would create a cycle');
        }
      }
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
      const [source, target] = await Promise.all([
        this.prisma.modelObject.findUnique({ where: { id: data.sourceObjectId } }),
        this.prisma.modelObject.findUnique({ where: { id: data.targetObjectId } }),
      ]);

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

  readonly viewObject = {
    create: async (data: Prisma.ViewObjectUncheckedCreateInput) => {
      const view = await this.prisma.view.findUnique({
        where: { id: data.viewId },
        include: { architecture: { include: { workspace: true } } },
      });
      if (!view) {
        throw new Error(`View ${data.viewId} not found`);
      }
      assertTenantAccess(view.architecture.workspace.orgId, this.orgId);

      const object = await this.prisma.modelObject.findUnique({
        where: { id: data.objectId },
      });
      if (!object) {
        throw new Error(`Model object ${data.objectId} not found`);
      }

      if (
        !validateViewObject(
          { architectureId: view.architectureId as ArchitectureId },
          { architectureId: object.architectureId as ArchitectureId },
        )
      ) {
        throw new Error('View object must belong to the same architecture as the view');
      }

      return this.prisma.viewObject.create({ data });
    },
  };
}
