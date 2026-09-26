import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Architecture, Prisma, Workspace } from '@prisma/client';
import { createId } from '@diagramhq/domain';
import { PrismaService } from '../database/prisma.service';
import type { CreateWorkspaceDto, UpdateWorkspaceDto } from './workspaces.dto';

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'workspace'
  );
}

export interface WorkspaceArchitectureSummary {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceWithRole extends Workspace {
  architectures: WorkspaceArchitectureSummary[];
  role: string;
}

export interface WorkspaceWithCount extends Workspace {
  _count: {
    architectures: number;
  };
}

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, orgId: string, dto: CreateWorkspaceDto): Promise<Workspace> {
    const member = await this.prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Organization not found');
    }

    if (member.role === 'viewer') {
      throw new ForbiddenException('Viewers cannot create workspaces');
    }

    const rawSlug = dto.slug ? dto.slug.toLowerCase().trim() : slugify(dto.name);
    let finalSlug = rawSlug;

    const existing = await this.prisma.workspace.findUnique({
      where: {
        orgId_slug: {
          orgId,
          slug: rawSlug,
        },
      },
    });

    if (existing) {
      if (dto.slug) {
        throw new ConflictException(
          `A workspace with slug '${rawSlug}' already exists in this organization`,
        );
      }
      finalSlug = `${rawSlug}-${Date.now().toString(36).slice(-4)}`;
    }

    const workspace = await this.prisma.workspace.create({
      data: {
        id: createId('ws'),
        orgId,
        name: dto.name.trim(),
        slug: finalSlug,
        settings: (dto.settings as Prisma.InputJsonValue) ?? undefined,
      },
    });

    return workspace;
  }

  async findAllForOrg(userId: string, orgId: string): Promise<WorkspaceWithCount[]> {
    const member = await this.prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.workspace.findMany({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            architectures: true,
          },
        },
      },
    });
  }

  async findById(userId: string, workspaceId: string): Promise<WorkspaceWithRole> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        architectures: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
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

    return {
      ...workspace,
      role: member.role,
    };
  }

  async update(
    userId: string,
    workspaceId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
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

    if (member.role === 'viewer') {
      throw new ForbiddenException('Viewers cannot update workspaces');
    }

    if (dto.slug) {
      const slugToCheck = dto.slug.toLowerCase().trim();
      const existing = await this.prisma.workspace.findUnique({
        where: {
          orgId_slug: {
            orgId: workspace.orgId,
            slug: slugToCheck,
          },
        },
      });

      if (existing && existing.id !== workspaceId) {
        throw new ConflictException(
          `A workspace with slug '${slugToCheck}' already exists in this organization`,
        );
      }
    }

    const updated = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug.toLowerCase().trim() } : {}),
        ...(dto.settings !== undefined ? { settings: dto.settings as Prisma.InputJsonValue } : {}),
      },
    });

    return updated;
  }

  async delete(
    userId: string,
    workspaceId: string,
  ): Promise<{ success: boolean; id: string }> {
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

    if (member.role !== 'owner' && member.role !== 'admin') {
      throw new ForbiddenException('Only organization owners and admins can delete workspaces');
    }

    await this.prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return { success: true, id: workspaceId };
  }

  async listArchitectures(userId: string, workspaceId: string): Promise<Architecture[]> {
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

    return this.prisma.architecture.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
