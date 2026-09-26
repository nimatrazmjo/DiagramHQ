import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationsService, slugify } from './organizations.service';
import type { PrismaService } from '../database/prisma.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prismaMock: {
    organization: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    member: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    prismaMock = {
      organization: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      member: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (promises: Promise<unknown>[]) => {
        return Promise.all(promises);
      }),
    };

    service = new OrganizationsService(prismaMock as unknown as PrismaService);
  });

  describe('slugify', () => {
    it('converts names to clean slugs', () => {
      expect(slugify('Acme Corporation')).toBe('acme-corporation');
      expect(slugify('  My Super--Org!! ')).toBe('my-super-org');
      expect(slugify('!!!')).toBe('org');
    });
  });

  describe('create', () => {
    it('creates an organization and an owner member transactionally', async () => {
      prismaMock.organization.findUnique.mockResolvedValue(null);
      prismaMock.organization.create.mockImplementation(
        ({ data }: { data: { id: string; name: string; slug: string } }) =>
          Promise.resolve({
            id: data.id,
            name: data.name,
            slug: data.slug,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      );
      prismaMock.member.create.mockImplementation(
        ({ data }: { data: { id: string; orgId: string; userId: string; role: string } }) =>
          Promise.resolve({
            id: data.id,
            orgId: data.orgId,
            userId: data.userId,
            role: data.role,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      );

      const result = await service.create('usr_test1', { name: 'Acme Cloud' });

      expect(result.name).toBe('Acme Cloud');
      expect(result.slug).toBe('acme-cloud');
      expect(result.role).toBe('owner');
      expect(result.id.startsWith('org_')).toBe(true);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('throws ConflictException if explicit slug already exists', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ id: 'org_existing', slug: 'custom-slug' });

      await expect(
        service.create('usr_test1', { name: 'Another Org', slug: 'custom-slug' }),
      ).rejects.toThrow(ConflictException);
    });

    it('generates a unique suffixed slug when auto-generated slug collides', async () => {
      prismaMock.organization.findUnique.mockResolvedValueOnce({ id: 'org_first', slug: 'acme' });
      prismaMock.organization.create.mockImplementation(
        ({ data }: { data: { id: string; name: string; slug: string } }) =>
          Promise.resolve({
            id: data.id,
            name: data.name,
            slug: data.slug,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      );
      prismaMock.member.create.mockImplementation(
        ({ data }: { data: { id: string; orgId: string; userId: string; role: string } }) =>
          Promise.resolve({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      );

      const result = await service.create('usr_test1', { name: 'Acme' });
      expect(result.slug.startsWith('acme-')).toBe(true);
      expect(result.slug).not.toBe('acme');
    });
  });

  describe('findAllForUser', () => {
    it('returns all organizations the user belongs to with role', async () => {
      const now = new Date();
      prismaMock.member.findMany.mockResolvedValue([
        {
          id: 'mem_1',
          orgId: 'org_1',
          userId: 'usr_test1',
          role: 'owner',
          organization: {
            id: 'org_1',
            name: 'Org One',
            slug: 'org-one',
            createdAt: now,
            updatedAt: now,
          },
        },
        {
          id: 'mem_2',
          orgId: 'org_2',
          userId: 'usr_test1',
          role: 'viewer',
          organization: {
            id: 'org_2',
            name: 'Org Two',
            slug: 'org-two',
            createdAt: now,
            updatedAt: now,
          },
        },
      ]);

      const orgs = await service.findAllForUser('usr_test1');
      expect(orgs).toHaveLength(2);
      expect(orgs[0]).toEqual({
        id: 'org_1',
        name: 'Org One',
        slug: 'org-one',
        role: 'owner',
        createdAt: now,
        updatedAt: now,
      });
      expect(orgs[1]?.role).toBe('viewer');
    });
  });

  describe('findById', () => {
    it('returns organization if user is a member', async () => {
      const now = new Date();
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        role: 'admin',
        organization: {
          id: 'org_123',
          name: 'Target Org',
          slug: 'target-org',
          createdAt: now,
          updatedAt: now,
        },
      });

      const org = await service.findById('usr_test1', 'org_123');
      expect(org.id).toBe('org_123');
      expect(org.role).toBe('admin');
    });

    it('throws NotFoundException if user is not a member or org does not exist', async () => {
      prismaMock.member.findUnique.mockResolvedValue(null);

      await expect(service.findById('usr_stranger', 'org_123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('allows owner or admin to update name or slug', async () => {
      prismaMock.member.findUnique.mockResolvedValue({ role: 'admin' });
      prismaMock.organization.findUnique.mockResolvedValue(null);
      prismaMock.organization.update.mockResolvedValue({
        id: 'org_123',
        name: 'Updated Name',
        slug: 'new-slug',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updated = await service.update('usr_admin', 'org_123', {
        name: 'Updated Name',
        slug: 'new-slug',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.slug).toBe('new-slug');
      expect(updated.role).toBe('admin');
    });

    it('throws ForbiddenException if editor tries to update org details', async () => {
      prismaMock.member.findUnique.mockResolvedValue({ role: 'editor' });

      await expect(
        service.update('usr_editor', 'org_123', { name: 'Unauthorized Change' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException if new slug belongs to another org', async () => {
      prismaMock.member.findUnique.mockResolvedValue({ role: 'owner' });
      prismaMock.organization.findUnique.mockResolvedValue({ id: 'org_other', slug: 'taken-slug' });

      await expect(
        service.update('usr_owner', 'org_123', { slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('allows owner to delete the organization', async () => {
      prismaMock.member.findUnique.mockResolvedValue({ role: 'owner' });
      prismaMock.organization.delete.mockResolvedValue({ id: 'org_123' });

      const res = await service.delete('usr_owner', 'org_123');
      expect(res).toEqual({ success: true, id: 'org_123' });
      expect(prismaMock.organization.delete).toHaveBeenCalledWith({ where: { id: 'org_123' } });
    });

    it('throws ForbiddenException if non-owner tries to delete org', async () => {
      prismaMock.member.findUnique.mockResolvedValue({ role: 'admin' });

      await expect(service.delete('usr_admin', 'org_123')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if user is not in org', async () => {
      prismaMock.member.findUnique.mockResolvedValue(null);

      await expect(service.delete('usr_outsider', 'org_123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listMembers', () => {
    it('returns members when caller is part of the org', async () => {
      const now = new Date();
      prismaMock.member.findUnique.mockResolvedValue({ id: 'mem_caller', role: 'viewer' });
      prismaMock.member.findMany.mockResolvedValue([
        { id: 'mem_1', userId: 'usr_1', role: 'owner', createdAt: now },
        { id: 'mem_2', userId: 'usr_2', role: 'editor', createdAt: now },
      ]);

      const members = await service.listMembers('usr_caller', 'org_123');
      expect(members).toHaveLength(2);
      expect(members[0]?.userId).toBe('usr_1');
    });

    it('throws NotFoundException when caller is not a member', async () => {
      prismaMock.member.findUnique.mockResolvedValue(null);

      await expect(service.listMembers('usr_stranger', 'org_123')).rejects.toThrow(NotFoundException);
    });
  });
});
