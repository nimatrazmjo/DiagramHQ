import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createId, type MemberRole } from '@diagramhq/domain';
import { PrismaService } from '../database/prisma.service';
import type { CreateOrganizationDto, UpdateOrganizationDto } from './organizations.dto';

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'org'
  );
}

export interface OrganizationWithRole {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  role: string;
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto): Promise<OrganizationWithRole> {
    const rawSlug = dto.slug ? dto.slug.toLowerCase().trim() : slugify(dto.name);

    let finalSlug = rawSlug;
    const existing = await this.prisma.organization.findUnique({
      where: { slug: rawSlug },
    });

    if (existing) {
      if (dto.slug) {
        throw new ConflictException(`An organization with slug '${rawSlug}' already exists`);
      }
      finalSlug = `${rawSlug}-${Date.now().toString(36).slice(-4)}`;
    }

    const orgId = createId('org');
    const memberId = createId('mem');

    const [org, member] = await this.prisma.$transaction([
      this.prisma.organization.create({
        data: {
          id: orgId,
          name: dto.name.trim(),
          slug: finalSlug,
        },
      }),
      this.prisma.member.create({
        data: {
          id: memberId,
          orgId: orgId,
          userId: userId,
          role: 'owner',
        },
      }),
    ]);

    return {
      ...org,
      role: member.role,
    };
  }

  async findAllForUser(userId: string): Promise<OrganizationWithRole[]> {
    const members = await this.prisma.member.findMany({
      where: { userId },
      include: {
        organization: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return members.map((m) => ({
      ...m.organization,
      role: m.role,
    }));
  }

  async findById(userId: string, orgId: string): Promise<OrganizationWithRole> {
    const member = await this.prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!member) {
      throw new NotFoundException(`Organization '${orgId}' not found`);
    }

    return {
      ...member.organization,
      role: member.role,
    };
  }

  async update(
    userId: string,
    orgId: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationWithRole> {
    const member = await this.prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Organization '${orgId}' not found`);
    }

    if (member.role !== 'owner' && member.role !== 'admin') {
      throw new ForbiddenException(
        'Only organization owners and admins can update organization details',
      );
    }

    if (dto.slug) {
      const slugToCheck = dto.slug.toLowerCase().trim();
      const existing = await this.prisma.organization.findUnique({
        where: { slug: slugToCheck },
      });
      if (existing && existing.id !== orgId) {
        throw new ConflictException(`An organization with slug '${slugToCheck}' already exists`);
      }
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.slug ? { slug: dto.slug.toLowerCase().trim() } : {}),
      },
    });

    return {
      ...updated,
      role: member.role,
    };
  }

  async delete(userId: string, orgId: string): Promise<{ success: boolean; id: string }> {
    const member = await this.prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Organization '${orgId}' not found`);
    }

    if (member.role !== 'owner') {
      throw new ForbiddenException('Only the organization owner can delete the organization');
    }

    await this.prisma.organization.delete({
      where: { id: orgId },
    });

    return { success: true, id: orgId };
  }

  async listMembers(
    userId: string,
    orgId: string,
  ): Promise<Array<{ id: string; userId: string; role: string; createdAt: Date }>> {
    const callerMember = await this.prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!callerMember) {
      throw new NotFoundException(`Organization '${orgId}' not found`);
    }

    const members = await this.prisma.member.findMany({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      createdAt: m.createdAt,
    }));
  }

  async updateMemberRole(
    userId: string,
    orgId: string,
    memberId: string,
    newRole: MemberRole,
  ): Promise<{
    id: string;
    orgId: string;
    userId: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const callerMember = await this.prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!callerMember) {
      throw new NotFoundException(`Organization '${orgId}' not found`);
    }

    if (callerMember.role !== 'owner' && callerMember.role !== 'admin') {
      throw new ForbiddenException('Only owners and admins can update member roles');
    }

    const targetMember = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.orgId !== orgId) {
      throw new NotFoundException('Member not found');
    }

    if (targetMember.role === 'owner' && newRole !== 'owner') {
      throw new ForbiddenException('Cannot change the role of an organization owner');
    }

    if (callerMember.role === 'admin' && (targetMember.role === 'admin' || targetMember.role === 'owner')) {
      if (targetMember.role === 'admin') {
        throw new ForbiddenException('Only owners can change an admin role');
      }
      throw new ForbiddenException('Cannot change the role of an organization owner');
    }

    const updated = await this.prisma.member.update({
      where: { id: memberId },
      data: { role: newRole },
    });

    return {
      id: updated.id,
      orgId: updated.orgId,
      userId: updated.userId,
      role: updated.role,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
