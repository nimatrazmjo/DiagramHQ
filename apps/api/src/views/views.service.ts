import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { View, ViewObject } from '@prisma/client';
import { canWrite, createId, matchesViewFilter, type MemberRole, type ViewFilter } from '@diagramhq/domain';
import { PrismaService } from '../database/prisma.service';
import type { UpdateObjectPositionDto, BatchUpdateObjectPositionsDto, CreateViewDto, AddViewObjectDto } from './views.dto';

export interface ViewObjectPosition {
  viewId: string;
  objectId: string;
  position: {
    x: number;
    y: number;
  };
}

export interface BatchUpdateResult {
  viewId: string;
  count: number;
  positions: Array<{ objectId: string; x: number; y: number }>;
}

@Injectable()
export class ViewsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveWorkspaceMember(
    userId: string,
    workspaceId: string,
  ): Promise<{ orgId: string; role: MemberRole }> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace not found`);
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
      throw new NotFoundException(`Workspace not found`);
    }

    return { orgId: workspace.orgId, role: member.role as MemberRole };
  }

  private async resolveArchitectureMember(
    userId: string,
    architectureId: string,
  ): Promise<{ orgId: string; role: MemberRole }> {
    const architecture = await this.prisma.architecture.findUnique({
      where: { id: architectureId },
      include: {
        workspace: true,
      },
    });

    if (!architecture) {
      throw new NotFoundException(`Architecture not found`);
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
      throw new NotFoundException(`Architecture not found`);
    }

    return { orgId, role: member.role as MemberRole };
  }

  private async resolveViewMember(
    userId: string,
    viewId: string,
  ): Promise<{ orgId: string; role: MemberRole; view: View & { architecture: { workspace: { orgId: string } } } }> {
    const view = await this.prisma.view.findUnique({
      where: { id: viewId },
      include: {
        architecture: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!view) {
      throw new NotFoundException('View not found');
    }

    const orgId = view.architecture.workspace.orgId;
    const member = await this.prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('View not found');
    }

    return { orgId, role: member.role as MemberRole, view };
  }

  async updateObjectPosition(
    userId: string,
    viewId: string,
    objectId: string,
    dto: UpdateObjectPositionDto,
  ): Promise<ViewObjectPosition> {
    const { role } = await this.resolveViewMember(userId, viewId);

    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }

    await this.prisma.viewObject.upsert({
      where: {
        viewId_objectId: {
          viewId,
          objectId,
        },
      },
      update: {
        position: { x: dto.x, y: dto.y },
      },
      create: {
        viewId,
        objectId,
        position: { x: dto.x, y: dto.y },
      },
    });

    return {
      viewId,
      objectId,
      position: { x: dto.x, y: dto.y },
    };
  }

  async updateMultipleObjectPositions(
    userId: string,
    viewId: string,
    dto: BatchUpdateObjectPositionsDto,
  ): Promise<BatchUpdateResult> {
    const { role } = await this.resolveViewMember(userId, viewId);

    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }

    await this.prisma.$transaction(
      dto.positions.map((item) =>
        this.prisma.viewObject.upsert({
          where: { viewId_objectId: { viewId, objectId: item.objectId } },
          update: { position: { x: item.x, y: item.y } },
          create: { viewId, objectId: item.objectId, position: { x: item.x, y: item.y } },
        }),
      ),
    );

    return {
      viewId,
      count: dto.positions.length,
      positions: dto.positions.map((p) => ({ objectId: p.objectId, x: p.x, y: p.y })),
    };
  }

  async getViewObjects(userId: string, viewId: string): Promise<ViewObject[]> {
    const { view } = await this.resolveViewMember(userId, viewId);

    const existingViewObjects = await this.prisma.viewObject.findMany({
      where: { viewId },
    });

    // If the view has a dynamic filter defined, project live objects matching filter
    if (view.filter && typeof view.filter === 'object' && Object.keys(view.filter).length > 0) {
      const modelObjects = await this.prisma.modelObject.findMany({
        where: { architectureId: view.architectureId },
      });

      const matchingObjects = modelObjects.filter((obj) =>
        matchesViewFilter(
          {
            id: obj.id,
            name: obj.name,
            kind: obj.kind,
            parentId: obj.parentId,
            metadata: obj.metadata as Record<string, unknown> | null,
          },
          view.filter as ViewFilter,
        ),
      );

      const positionMap = new Map(existingViewObjects.map((vo) => [vo.objectId, vo]));
      const objectIdSet = new Set(matchingObjects.map((o) => o.id));

      const combined: ViewObject[] = matchingObjects.map((obj) => {
        const existing = positionMap.get(obj.id);
        return {
          viewId,
          objectId: obj.id,
          position: existing?.position ?? (obj.position as object | null) ?? null,
          collapsed: existing?.collapsed ?? false,
          hidden: existing?.hidden ?? false,
          style: existing?.style ?? null,
        } as ViewObject;
      });

      for (const evo of existingViewObjects) {
        if (!objectIdSet.has(evo.objectId)) {
          combined.push(evo);
        }
      }

      return combined;
    }

    // Static/manual saved view
    return existingViewObjects;
  }

  async getViewProjection(userId: string, viewId: string): Promise<{
    view: View;
    objects: Array<{
      id: string;
      name: string;
      kind: string;
      metadata: Record<string, unknown> | null;
      position: { x: number; y: number } | null;
    }>;
  }> {
    const { view } = await this.resolveViewMember(userId, viewId);
    const viewObjects = await this.getViewObjects(userId, viewId);
    const objectIds = viewObjects.map((vo) => vo.objectId);

    const modelObjects = await this.prisma.modelObject.findMany({
      where: { id: { in: objectIds } },
    });

    const voMap = new Map(viewObjects.map((vo) => [vo.objectId, vo]));

    return {
      view,
      objects: modelObjects.map((obj) => {
        const vo = voMap.get(obj.id);
        const pos = vo?.position as { x: number; y: number } | null | undefined;
        return {
          id: obj.id,
          name: obj.name,
          kind: obj.kind,
          metadata: obj.metadata as Record<string, unknown> | null,
          position: pos ?? null,
        };
      }),
    };
  }

  async createView(
    userId: string,
    architectureId: string,
    dto: CreateViewDto,
  ): Promise<{ view: View }> {
    const { role } = await this.resolveArchitectureMember(userId, architectureId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }
    const view = await this.prisma.view.create({
      data: {
        id: createId('vw'),
        architectureId,
        name: dto.name,
        kind: dto.kind,
        filter: dto.filter ? (dto.filter as object) : undefined,
      },
    });
    return { view };
  }

  async listViews(
    userId: string,
    architectureId: string,
  ): Promise<{ views: View[] }> {
    await this.resolveArchitectureMember(userId, architectureId);
    const views = await this.prisma.view.findMany({
      where: { architectureId },
      orderBy: { createdAt: 'asc' },
    });
    return { views };
  }

  async getView(
    userId: string,
    viewId: string,
  ): Promise<{ view: View }> {
    const { view } = await this.resolveViewMember(userId, viewId);
    return { view };
  }

  async deleteView(
    userId: string,
    viewId: string,
  ): Promise<{ success: boolean; id: string }> {
    const { role } = await this.resolveViewMember(userId, viewId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }
    await this.prisma.view.delete({
      where: { id: viewId },
    });
    return { success: true, id: viewId };
  }

  async addObjectToView(
    userId: string,
    viewId: string,
    dto: AddViewObjectDto,
  ): Promise<{ viewObject: { viewId: string; objectId: string; position?: { x: number; y: number } } }> {
    const { role } = await this.resolveViewMember(userId, viewId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }
    const viewObject = await this.prisma.viewObject.upsert({
      where: { viewId_objectId: { viewId, objectId: dto.objectId } },
      update: dto.position ? { position: { x: dto.position.x, y: dto.position.y } } : {},
      create: {
        viewId,
        objectId: dto.objectId,
        ...(dto.position ? { position: { x: dto.position.x, y: dto.position.y } } : {}),
      },
    });
    const pos = viewObject.position as { x: number; y: number } | null | undefined;
    return { viewObject: { viewId: viewObject.viewId, objectId: viewObject.objectId, position: pos ?? undefined } };
  }

  async removeObjectFromView(
    userId: string,
    viewId: string,
    objectId: string,
  ): Promise<{ success: boolean }> {
    const { role } = await this.resolveViewMember(userId, viewId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Viewer role does not have write permissions');
    }
    await this.prisma.viewObject.delete({
      where: { viewId_objectId: { viewId, objectId } },
    });
    return { success: true };
  }
}
