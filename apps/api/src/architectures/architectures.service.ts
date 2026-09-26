import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Architecture,
  ModelConnection,
  ModelObject,
  Version,
} from '@prisma/client';
import {
  canConnect,
  canWrite,
  createId,
  hasParentCycle,
  type MemberRole,
  type ObjectId,
} from '@diagramhq/domain';
import { PrismaService } from '../database/prisma.service';
import type {
  CreateArchitectureDto,
  CreateModelConnectionDto,
  CreateModelObjectDto,
  UpdateArchitectureDto,
  UpdateModelConnectionDto,
  UpdateModelObjectDto,
} from './architectures.dto';

export interface ArchitectureModelSnapshot {
  architecture: Architecture;
  version: Version;
  objects: ModelObject[];
  connections: ModelConnection[];
}

@Injectable()
export class ArchitecturesService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveWorkspaceMember(
    userId: string,
    workspaceId: string,
  ): Promise<{ orgId: string; role: MemberRole }> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace '${workspaceId}' not found`);
    }

    const member = await this.prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId: workspace.orgId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Workspace '${workspaceId}' not found`);
    }

    return { orgId: workspace.orgId, role: member.role as MemberRole };
  }

  private async resolveArchitectureMember(
    userId: string,
    architectureId: string,
  ): Promise<{
    orgId: string;
    workspaceId: string;
    role: MemberRole;
    architecture: Architecture;
  }> {
    const architecture = await this.prisma.architecture.findUnique({
      where: { id: architectureId },
      include: {
        workspace: true,
      },
    });

    if (!architecture) {
      throw new NotFoundException(`Architecture '${architectureId}' not found`);
    }

    const orgId = architecture.workspace.orgId;
    const member = await this.prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Architecture '${architectureId}' not found`);
    }

    return {
      orgId,
      workspaceId: architecture.workspaceId,
      role: member.role as MemberRole,
      architecture,
    };
  }

  private async resolveObjectMember(
    userId: string,
    objectId: string,
  ): Promise<{
    role: MemberRole;
    object: ModelObject;
  }> {
    const object = await this.prisma.modelObject.findUnique({
      where: { id: objectId },
      include: {
        architecture: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!object) {
      throw new NotFoundException(`Object '${objectId}' not found`);
    }

    const orgId = object.architecture.workspace.orgId;
    const member = await this.prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Object '${objectId}' not found`);
    }

    return {
      role: member.role as MemberRole,
      object,
    };
  }

  private async resolveConnectionMember(
    userId: string,
    connectionId: string,
  ): Promise<{
    role: MemberRole;
    connection: ModelConnection;
  }> {
    const connection = await this.prisma.modelConnection.findUnique({
      where: { id: connectionId },
      include: {
        architecture: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundException(`Connection '${connectionId}' not found`);
    }

    const orgId = connection.architecture.workspace.orgId;
    const member = await this.prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Connection '${connectionId}' not found`);
    }

    return {
      role: member.role as MemberRole,
      connection,
    };
  }

  // --- Architecture CRUD ---

  async createArchitecture(
    userId: string,
    workspaceId: string,
    dto: CreateArchitectureDto,
  ): Promise<{ architecture: Architecture; version: Version }> {
    const { role } = await this.resolveWorkspaceMember(userId, workspaceId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }

    const archId = createId('arch');
    const verId = createId('ver');

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.architecture.create({
        data: {
          id: archId,
          workspaceId,
          name: dto.name,
          description: dto.description,
        },
      });

      const version = await tx.version.create({
        data: {
          id: verId,
          architectureId: archId,
          name: 'main',
          kind: 'main',
          status: 'draft',
          createdBy: userId,
        },
      });

      const updatedArch = await tx.architecture.update({
        where: { id: archId },
        data: {
          defaultVersionId: verId,
        },
      });

      return { architecture: updatedArch, version };
    });

    return result;
  }

  async getArchitecture(
    userId: string,
    architectureId: string,
  ): Promise<{ architecture: Architecture }> {
    const { architecture } = await this.resolveArchitectureMember(
      userId,
      architectureId,
    );
    return { architecture };
  }

  async updateArchitecture(
    userId: string,
    architectureId: string,
    dto: UpdateArchitectureDto,
  ): Promise<{ architecture: Architecture }> {
    const { role } = await this.resolveArchitectureMember(userId, architectureId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }

    const updated = await this.prisma.architecture.update({
      where: { id: architectureId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });

    return { architecture: updated };
  }

  async deleteArchitecture(
    userId: string,
    architectureId: string,
  ): Promise<{ success: boolean; id: string }> {
    const { role } = await this.resolveArchitectureMember(userId, architectureId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }

    await this.prisma.architecture.delete({
      where: { id: architectureId },
    });

    return { success: true, id: architectureId };
  }

  // --- Full Architecture Model Snapshot (F018) ---

  async getArchitectureModel(
    userId: string,
    architectureId: string,
    versionId?: string,
  ): Promise<ArchitectureModelSnapshot> {
    const { architecture } = await this.resolveArchitectureMember(
      userId,
      architectureId,
    );

    const targetVersionId = versionId ?? architecture.defaultVersionId;
    let version: Version | null = null;

    if (targetVersionId) {
      version = await this.prisma.version.findUnique({
        where: { id: targetVersionId },
      });
    }

    if (!version) {
      version = await this.prisma.version.findFirst({
        where: { architectureId },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!version) {
      throw new NotFoundException(
        `No version found for architecture '${architectureId}'`,
      );
    }

    const [objects, connections] = await Promise.all([
      this.prisma.modelObject.findMany({
        where: {
          architectureId,
          versionId: version.id,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.modelConnection.findMany({
        where: {
          architectureId,
          versionId: version.id,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      architecture,
      version,
      objects,
      connections,
    };
  }

  // --- Model Objects CRUD ---

  async listModelObjects(
    userId: string,
    architectureId: string,
    query: { versionId?: string; kind?: string } = {},
  ): Promise<{ objects: ModelObject[] }> {
    const { architecture } = await this.resolveArchitectureMember(
      userId,
      architectureId,
    );

    const versionId = query.versionId ?? architecture.defaultVersionId;

    const objects = await this.prisma.modelObject.findMany({
      where: {
        architectureId,
        ...(versionId ? { versionId } : {}),
        ...(query.kind ? { kind: query.kind as ModelObject['kind'] } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    return { objects };
  }

  async getModelObject(
    userId: string,
    objectId: string,
  ): Promise<{ object: ModelObject }> {
    const { object } = await this.resolveObjectMember(userId, objectId);
    return { object };
  }

  async createModelObject(
    userId: string,
    architectureId: string,
    dto: CreateModelObjectDto,
  ): Promise<{ object: ModelObject }> {
    const { role, architecture } = await this.resolveArchitectureMember(
      userId,
      architectureId,
    );
    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }

    const targetVersionId = dto.versionId ?? architecture.defaultVersionId;
    if (!targetVersionId) {
      throw new BadRequestException('Architecture has no default version');
    }

    // Check parent if provided
    if (dto.parentId) {
      const parent = await this.prisma.modelObject.findUnique({
        where: { id: dto.parentId },
      });
      if (
        !parent ||
        parent.architectureId !== architectureId ||
        parent.versionId !== targetVersionId
      ) {
        throw new BadRequestException(
          `Parent object '${dto.parentId}' does not exist in the target architecture and version`,
        );
      }
    }

    const objectId = createId(
      dto.kind === 'system'
        ? 'sys'
        : dto.kind === 'application'
          ? 'app'
          : dto.kind === 'store'
            ? 'sto'
            : dto.kind === 'component'
              ? 'cmp'
              : dto.kind === 'actor'
                ? 'act'
                : 'grp',
    );

    const object = await this.prisma.modelObject.create({
      data: {
        id: objectId,
        architectureId,
        versionId: targetVersionId,
        kind: dto.kind,
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
        ...(dto.metadata ? { metadata: dto.metadata as object } : {}),
      },
    });

    return { object };
  }

  async updateModelObject(
    userId: string,
    objectId: string,
    dto: UpdateModelObjectDto,
  ): Promise<{ object: ModelObject }> {
    const { role, object: existing } = await this.resolveObjectMember(
      userId,
      objectId,
    );
    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === objectId) {
        throw new BadRequestException('An object cannot be its own parent');
      }

      const allObjectsInVersion = await this.prisma.modelObject.findMany({
        where: {
          architectureId: existing.architectureId,
          versionId: existing.versionId,
        },
      });

      const getParent = (id: ObjectId) => {
        if (id === objectId) return dto.parentId as ObjectId;
        return allObjectsInVersion.find((o) => o.id === id)?.parentId as
          | ObjectId
          | undefined;
      };

      if (hasParentCycle(objectId as ObjectId, dto.parentId as ObjectId, getParent)) {
        throw new BadRequestException(
          `Assigning parent '${dto.parentId}' creates a cyclic parent reference`,
        );
      }
    }

    const updated = await this.prisma.modelObject.update({
      where: { id: objectId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.kind ? { kind: dto.kind } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.metadata ? { metadata: dto.metadata as object } : {}),
      },
    });

    return { object: updated };
  }

  async deleteModelObject(
    userId: string,
    objectId: string,
  ): Promise<{ success: boolean; id: string }> {
    const { role } = await this.resolveObjectMember(userId, objectId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }

    await this.prisma.modelObject.delete({
      where: { id: objectId },
    });

    return { success: true, id: objectId };
  }

  // --- Model Connections CRUD ---

  async listModelConnections(
    userId: string,
    architectureId: string,
    query: { versionId?: string } = {},
  ): Promise<{ connections: ModelConnection[] }> {
    const { architecture } = await this.resolveArchitectureMember(
      userId,
      architectureId,
    );

    const versionId = query.versionId ?? architecture.defaultVersionId;

    const connections = await this.prisma.modelConnection.findMany({
      where: {
        architectureId,
        ...(versionId ? { versionId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    return { connections };
  }

  async getModelConnection(
    userId: string,
    connectionId: string,
  ): Promise<{ connection: ModelConnection }> {
    const { connection } = await this.resolveConnectionMember(
      userId,
      connectionId,
    );
    return { connection };
  }

  async createModelConnection(
    userId: string,
    architectureId: string,
    dto: CreateModelConnectionDto,
  ): Promise<{ connection: ModelConnection }> {
    const { role, architecture } = await this.resolveArchitectureMember(
      userId,
      architectureId,
    );
    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }

    if (!canConnect(dto.sourceObjectId as ObjectId, dto.targetObjectId as ObjectId)) {
      throw new BadRequestException('Self-connection is not allowed');
    }

    const targetVersionId = dto.versionId ?? architecture.defaultVersionId;
    if (!targetVersionId) {
      throw new BadRequestException('Architecture has no default version');
    }

    // Verify source and target exist in this architecture and version
    const [source, target] = await Promise.all([
      this.prisma.modelObject.findUnique({ where: { id: dto.sourceObjectId } }),
      this.prisma.modelObject.findUnique({ where: { id: dto.targetObjectId } }),
    ]);

    if (!source || source.architectureId !== architectureId || source.versionId !== targetVersionId) {
      throw new BadRequestException(
        `Source object '${dto.sourceObjectId}' does not exist in target architecture and version`,
      );
    }

    if (!target || target.architectureId !== architectureId || target.versionId !== targetVersionId) {
      throw new BadRequestException(
        `Target object '${dto.targetObjectId}' does not exist in target architecture and version`,
      );
    }

    const connId = createId('con');

    const connection = await this.prisma.modelConnection.create({
      data: {
        id: connId,
        architectureId,
        versionId: targetVersionId,
        sourceObjectId: dto.sourceObjectId,
        targetObjectId: dto.targetObjectId,
        kind: dto.kind ?? 'sync',
        label: dto.label,
        description: dto.description,
        ...(dto.metadata ? { metadata: dto.metadata as object } : {}),
      },
    });

    return { connection };
  }

  async updateModelConnection(
    userId: string,
    connectionId: string,
    dto: UpdateModelConnectionDto,
  ): Promise<{ connection: ModelConnection }> {
    const { role } = await this.resolveConnectionMember(userId, connectionId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }

    const updated = await this.prisma.modelConnection.update({
      where: { id: connectionId },
      data: {
        ...(dto.kind ? { kind: dto.kind } : {}),
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.metadata ? { metadata: dto.metadata as object } : {}),
      },
    });

    return { connection: updated };
  }

  async deleteModelConnection(
    userId: string,
    connectionId: string,
  ): Promise<{ success: boolean; id: string }> {
    const { role } = await this.resolveConnectionMember(userId, connectionId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }

    await this.prisma.modelConnection.delete({
      where: { id: connectionId },
    });

    return { success: true, id: connectionId };
  }
}
