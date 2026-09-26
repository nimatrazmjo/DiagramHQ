import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ViewObject } from '@prisma/client';
import { canWrite } from '@diagramhq/domain';
import { PrismaService } from '../database/prisma.service';
import type { UpdateObjectPositionDto } from './views.dto';

export interface ViewObjectPosition {
  viewId: string;
  objectId: string;
  position: {
    x: number;
    y: number;
  };
}

@Injectable()
export class ViewsService {
  constructor(private readonly prisma: PrismaService) {}

  async updateObjectPosition(
    userId: string,
    viewId: string,
    objectId: string,
    dto: UpdateObjectPositionDto,
  ): Promise<ViewObjectPosition> {
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

    if (!canWrite(member.role)) {
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

  async getViewObjects(userId: string, viewId: string): Promise<ViewObject[]> {
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

    return this.prisma.viewObject.findMany({
      where: { viewId },
    });
  }
}
