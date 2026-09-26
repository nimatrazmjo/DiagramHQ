import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkspacesService, slugify } from './workspaces.service';
import type { PrismaService } from '../database/prisma.service';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let prismaMock: {
    workspace: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    member: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    architecture: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prismaMock = {
      workspace: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      member: {
        findUnique: vi.fn(),
      },
      architecture: {
        findMany: vi.fn(),
      },
    };

    service = new WorkspacesService(prismaMock as unknown as PrismaService);
  });

  describe('slugify', () => {
    it('converts names to clean slugs', () => {
      expect(slugify('Platform Engineering')).toBe('platform-engineering');
      expect(slugify('  My Super--Workspace!! ')).toBe('my-super-workspace');
      expect(slugify('!!!')).toBe('workspace');
    });
  });

  describe('create', () => {
    it('creates a workspace with auto-generated slug', async () => {
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'owner',
      });
      prismaMock.workspace.findUnique.mockResolvedValue(null);
      prismaMock.workspace.create.mockImplementation(
        ({ data }: { data: { id: string; orgId: string; name: string; slug: string; settings?: unknown } }) =>
          Promise.resolve({
            id: data.id,
            orgId: data.orgId,
            name: data.name,
            slug: data.slug,
            settings: data.settings ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      );

      const result = await service.create('usr_1', 'org_1', { name: 'Core Platform' });

      expect(result.name).toBe('Core Platform');
      expect(result.slug).toBe('core-platform');
      expect(result.id.startsWith('ws_')).toBe(true);
      expect(prismaMock.workspace.create).toHaveBeenCalled();
    });

    it('creates a workspace with custom slug and settings', async () => {
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'admin',
      });
      prismaMock.workspace.findUnique.mockResolvedValue(null);
      prismaMock.workspace.create.mockImplementation(
        ({ data }: { data: { id: string; orgId: string; name: string; slug: string; settings?: unknown } }) =>
          Promise.resolve({
            id: data.id,
            orgId: data.orgId,
            name: data.name,
            slug: data.slug,
            settings: data.settings ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      );

      const result = await service.create('usr_1', 'org_1', {
        name: 'Core Platform',
        slug: 'custom-slug',
        settings: { defaultTheme: 'dark' },
      });

      expect(result.slug).toBe('custom-slug');
      expect(result.settings).toEqual({ defaultTheme: 'dark' });
    });

    it('generates a unique suffixed slug when auto-generated slug collides', async () => {
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'editor',
      });
      prismaMock.workspace.findUnique.mockResolvedValueOnce({
        id: 'ws_first',
        orgId: 'org_1',
        slug: 'core',
      });
      prismaMock.workspace.create.mockImplementation(
        ({ data }: { data: { id: string; orgId: string; name: string; slug: string; settings?: unknown } }) =>
          Promise.resolve({
            id: data.id,
            orgId: data.orgId,
            name: data.name,
            slug: data.slug,
            settings: data.settings ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      );

      const result = await service.create('usr_1', 'org_1', { name: 'Core' });
      expect(result.slug.startsWith('core-')).toBe(true);
      expect(result.slug).not.toBe('core');
    });

    it('throws ConflictException if explicit slug already exists', async () => {
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'owner',
      });
      prismaMock.workspace.findUnique.mockResolvedValue({
        id: 'ws_existing',
        orgId: 'org_1',
        slug: 'custom-slug',
      });

      await expect(
        service.create('usr_1', 'org_1', { name: 'Another Workspace', slug: 'custom-slug' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException when caller is viewer', async () => {
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'viewer',
      });

      await expect(
        service.create('usr_1', 'org_1', { name: 'Workspace for viewer' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when caller is not member of org', async () => {
      prismaMock.member.findUnique.mockResolvedValue(null);

      await expect(
        service.create('usr_not_member', 'org_1', { name: 'Workspace' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllForOrg', () => {
    it('throws NotFoundException when caller is not member of org', async () => {
      prismaMock.member.findUnique.mockResolvedValue(null);

      await expect(service.findAllForOrg('usr_1', 'org_1')).rejects.toThrow(NotFoundException);
    });

    it('returns workspaces with architecture counts ordered by createdAt', async () => {
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'editor',
      });

      const mockWorkspaces = [
        {
          id: 'ws_1',
          orgId: 'org_1',
          name: 'WS 1',
          slug: 'ws-1',
          settings: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { architectures: 2 },
        },
      ];
      prismaMock.workspace.findMany.mockResolvedValue(mockWorkspaces);

      const result = await service.findAllForOrg('usr_1', 'org_1');
      expect(result).toHaveLength(1);
      expect(result[0]._count.architectures).toBe(2);
      expect(prismaMock.workspace.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org_1' },
        orderBy: { createdAt: 'asc' },
        include: {
          _count: {
            select: { architectures: true },
          },
        },
      });
    });
  });

  describe('findById', () => {
    it('throws NotFoundException if workspace does not exist', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue(null);

      await expect(service.findById('usr_1', 'ws_nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if caller is not member of workspace org', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue({
        id: 'ws_1',
        orgId: 'org_other',
        name: 'Secret Workspace',
        slug: 'secret-workspace',
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        architectures: [],
      });
      prismaMock.member.findUnique.mockResolvedValue(null);

      await expect(service.findById('usr_intruder', 'ws_1')).rejects.toThrow(NotFoundException);
    });

    it('returns workspace with architectures and caller role', async () => {
      const mockDate = new Date();
      prismaMock.workspace.findUnique.mockResolvedValue({
        id: 'ws_1',
        orgId: 'org_1',
        name: 'Workspace 1',
        slug: 'workspace-1',
        settings: null,
        createdAt: mockDate,
        updatedAt: mockDate,
        architectures: [
          {
            id: 'arch_1',
            name: 'Platform Arch',
            description: 'Core microservices',
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
      });
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'editor',
      });

      const result = await service.findById('usr_1', 'ws_1');
      expect(result.id).toBe('ws_1');
      expect(result.role).toBe('editor');
      expect(result.architectures).toHaveLength(1);
      expect(result.architectures[0].name).toBe('Platform Arch');
    });
  });

  describe('update', () => {
    it('throws NotFoundException if workspace does not exist', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue(null);

      await expect(
        service.update('usr_1', 'ws_nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if caller is not a member of workspace org', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue({
        id: 'ws_1',
        orgId: 'org_1',
      });
      prismaMock.member.findUnique.mockResolvedValue(null);

      await expect(
        service.update('usr_not_member', 'ws_1', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if caller is viewer', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue({
        id: 'ws_1',
        orgId: 'org_1',
      });
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'viewer',
      });

      await expect(
        service.update('usr_1', 'ws_1', { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException if updated slug collides with another workspace in same org', async () => {
      prismaMock.workspace.findUnique
        .mockResolvedValueOnce({
          id: 'ws_1',
          orgId: 'org_1',
          slug: 'ws-1',
        })
        .mockResolvedValueOnce({
          id: 'ws_2',
          orgId: 'org_1',
          slug: 'colliding-slug',
        });
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'editor',
      });

      await expect(
        service.update('usr_1', 'ws_1', { slug: 'colliding-slug' }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows keeping same slug on the same workspace', async () => {
      prismaMock.workspace.findUnique
        .mockResolvedValueOnce({
          id: 'ws_1',
          orgId: 'org_1',
          slug: 'my-slug',
        })
        .mockResolvedValueOnce({
          id: 'ws_1',
          orgId: 'org_1',
          slug: 'my-slug',
        });
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'editor',
      });
      prismaMock.workspace.update.mockResolvedValue({
        id: 'ws_1',
        orgId: 'org_1',
        name: 'Updated Name',
        slug: 'my-slug',
        settings: null,
      });

      const result = await service.update('usr_1', 'ws_1', {
        name: 'Updated Name',
        slug: 'my-slug',
      });
      expect(result.name).toBe('Updated Name');
    });

    it('updates workspace name, slug, and settings successfully', async () => {
      prismaMock.workspace.findUnique
        .mockResolvedValueOnce({
          id: 'ws_1',
          orgId: 'org_1',
          slug: 'old-slug',
        })
        .mockResolvedValueOnce(null);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'admin',
      });
      prismaMock.workspace.update.mockImplementation(
        ({ data }: { data: { name?: string; slug?: string; settings?: unknown } }) =>
          Promise.resolve({
            id: 'ws_1',
            orgId: 'org_1',
            name: data.name ?? 'Old Name',
            slug: data.slug ?? 'old-slug',
            settings: data.settings ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      );

      const result = await service.update('usr_1', 'ws_1', {
        name: 'New Name',
        slug: 'new-slug',
        settings: { custom: true },
      });

      expect(result.name).toBe('New Name');
      expect(result.slug).toBe('new-slug');
      expect(result.settings).toEqual({ custom: true });
    });
  });

  describe('delete', () => {
    it('throws NotFoundException if workspace does not exist', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue(null);

      await expect(service.delete('usr_1', 'ws_nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if caller is not member of workspace org', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue({
        id: 'ws_1',
        orgId: 'org_1',
      });
      prismaMock.member.findUnique.mockResolvedValue(null);

      await expect(service.delete('usr_not_member', 'ws_1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if caller is viewer or editor', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue({
        id: 'ws_1',
        orgId: 'org_1',
      });
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'editor',
      });

      await expect(service.delete('usr_1', 'ws_1')).rejects.toThrow(ForbiddenException);

      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'viewer',
      });

      await expect(service.delete('usr_1', 'ws_1')).rejects.toThrow(ForbiddenException);
    });

    it('allows admin or owner to delete workspace', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue({
        id: 'ws_1',
        orgId: 'org_1',
      });
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'owner',
      });
      prismaMock.workspace.delete.mockResolvedValue({ id: 'ws_1' });

      const result = await service.delete('usr_1', 'ws_1');
      expect(result).toEqual({ success: true, id: 'ws_1' });
      expect(prismaMock.workspace.delete).toHaveBeenCalledWith({ where: { id: 'ws_1' } });
    });
  });

  describe('listArchitectures', () => {
    it('throws NotFoundException if workspace does not exist', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue(null);

      await expect(service.listArchitectures('usr_1', 'ws_nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if caller is not member of workspace org', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue({
        id: 'ws_1',
        orgId: 'org_1',
      });
      prismaMock.member.findUnique.mockResolvedValue(null);

      await expect(service.listArchitectures('usr_intruder', 'ws_1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns architectures for workspace ordered by createdAt asc', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue({
        id: 'ws_1',
        orgId: 'org_1',
      });
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'usr_1',
        role: 'viewer',
      });
      const mockArchitectures = [
        {
          id: 'arch_1',
          workspaceId: 'ws_1',
          name: 'Architecture 1',
          description: null,
          defaultVersionId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      prismaMock.architecture.findMany.mockResolvedValue(mockArchitectures);

      const result = await service.listArchitectures('usr_1', 'ws_1');
      expect(result).toEqual(mockArchitectures);
      expect(prismaMock.architecture.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws_1' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });
});
