import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ViewObject } from '@prisma/client';
import { canWrite, type MemberRole } from '@diagramhq/domain';
import { PrismaService } from '../database/prisma.service';
import type { UpdateObjectPositionDto, BatchUpdateObjectPositionsDto } from './views.dto';

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

  private async resolveViewMember(
    userId: string,
    viewId: string,
  ): Promise<{ orgId: string; role: MemberRole }> {
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

    return { orgId, role: member.role as MemberRole };
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
    await this.resolveViewMember(userId, viewId);
    return this.prisma.viewObject.findMany({
      where: { viewId },
    });
  }
}
