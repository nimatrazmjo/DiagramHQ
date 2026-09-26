import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ViewsService } from './views.service';
import type { PrismaService } from '../database/prisma.service';

describe('ViewsService', () => {
  let service: ViewsService;
  let prismaMock: {
    view: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    member: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    viewObject: {
      upsert: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  const mockView = {
    id: 'vw_test',
    name: 'Context View',
    architectureId: 'arch_test',
    architecture: {
      id: 'arch_test',
      workspaceId: 'ws_test',
      workspace: {
        id: 'ws_test',
        orgId: 'org_test',
      },
    },
  };

  beforeEach(() => {
    prismaMock = {
      view: {
        findUnique: vi.fn(),
      },
      member: {
        findUnique: vi.fn(),
      },
      viewObject: {
        upsert: vi.fn(),
        findMany: vi.fn(),
      },
    };

    service = new ViewsService(prismaMock as unknown as PrismaService);
  });

  describe('updateObjectPosition', () => {
    it('successfully updates object position when user has write permissions', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_owner',
        role: 'owner',
      });
      prismaMock.viewObject.upsert.mockResolvedValue({
        viewId: 'vw_test',
        objectId: 'obj_1',
        position: { x: 100, y: 200 },
        collapsed: false,
        hidden: false,
        style: null,
      });

      const result = await service.updateObjectPosition('usr_owner', 'vw_test', 'obj_1', {
        x: 100,
        y: 200,
      });

      expect(result).toEqual({
        viewId: 'vw_test',
        objectId: 'obj_1',
        position: { x: 100, y: 200 },
      });
      expect(prismaMock.view.findUnique).toHaveBeenCalledWith({
        where: { id: 'vw_test' },
        include: {
          architecture: {
            include: {
              workspace: true,
            },
          },
        },
      });
      expect(prismaMock.member.findUnique).toHaveBeenCalledWith({
        where: {
          orgId_userId: {
            orgId: 'org_test',
            userId: 'usr_owner',
          },
        },
      });
      expect(prismaMock.viewObject.upsert).toHaveBeenCalledWith({
        where: {
          viewId_objectId: {
            viewId: 'vw_test',
            objectId: 'obj_1',
          },
        },
        update: {
          position: { x: 100, y: 200 },
        },
        create: {
          viewId: 'vw_test',
          objectId: 'obj_1',
          position: { x: 100, y: 200 },
        },
      });
    });

    it('throws ForbiddenException (403) when user has viewer role', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_2',
        orgId: 'org_test',
        userId: 'usr_viewer',
        role: 'viewer',
      });

      await expect(
        service.updateObjectPosition('usr_viewer', 'vw_test', 'obj_1', { x: 50, y: 60 }),
      ).rejects.toThrow(new ForbiddenException('Viewer role does not have write permissions'));

      expect(prismaMock.viewObject.upsert).not.toHaveBeenCalled();
    });

    it('throws NotFoundException (404) without leaking existence when user is not a member', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue(null);

      await expect(
        service.updateObjectPosition('usr_non_member', 'vw_test', 'obj_1', { x: 10, y: 20 }),
      ).rejects.toThrow(new NotFoundException('View not found'));

      expect(prismaMock.viewObject.upsert).not.toHaveBeenCalled();
    });

    it('throws NotFoundException (404) when view does not exist', async () => {
      prismaMock.view.findUnique.mockResolvedValue(null);

      await expect(
        service.updateObjectPosition('usr_owner', 'vw_missing', 'obj_1', { x: 10, y: 20 }),
      ).rejects.toThrow(new NotFoundException('View not found'));

      expect(prismaMock.member.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.viewObject.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getViewObjects', () => {
    it('successfully returns view objects for an authorized member', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_viewer',
        role: 'viewer',
      });
      const expectedObjects = [
        {
          viewId: 'vw_test',
          objectId: 'obj_1',
          position: { x: 100, y: 200 },
          collapsed: false,
          hidden: false,
          style: null,
        },
      ];
      prismaMock.viewObject.findMany.mockResolvedValue(expectedObjects);

      const result = await service.getViewObjects('usr_viewer', 'vw_test');

      expect(result).toEqual(expectedObjects);
      expect(prismaMock.viewObject.findMany).toHaveBeenCalledWith({
        where: { viewId: 'vw_test' },
      });
    });

    it('throws NotFoundException (404) when user is not a member', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue(null);

      await expect(service.getViewObjects('usr_non_member', 'vw_test')).rejects.toThrow(
        new NotFoundException('View not found'),
      );

      expect(prismaMock.viewObject.findMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundException (404) when view does not exist', async () => {
      prismaMock.view.findUnique.mockResolvedValue(null);

      await expect(service.getViewObjects('usr_owner', 'vw_missing')).rejects.toThrow(
        new NotFoundException('View not found'),
      );

      expect(prismaMock.viewObject.findMany).not.toHaveBeenCalled();
    });
  });
});
