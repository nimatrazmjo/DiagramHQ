import { describe, expect, it, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
    modelObject: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    viewObject: {
      upsert: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
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
      modelObject: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      viewObject: {
        upsert: vi.fn(),
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(),
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
      prismaMock.modelObject.findUnique.mockResolvedValue({
        id: 'obj_1',
        architectureId: 'arch_test',
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
    it('throws NotFoundException (404) when model object does not exist', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_owner',
        role: 'owner',
      });
      prismaMock.modelObject.findUnique.mockResolvedValue(null);

      await expect(
        service.updateObjectPosition('usr_owner', 'vw_test', 'obj_nonexistent', { x: 10, y: 20 }),
      ).rejects.toThrow(new NotFoundException("Object 'obj_nonexistent' not found"));

      expect(prismaMock.viewObject.upsert).not.toHaveBeenCalled();
    });

    it('throws BadRequestException (400) when model object belongs to a different architecture', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_owner',
        role: 'owner',
      });
      prismaMock.modelObject.findUnique.mockResolvedValue({
        id: 'obj_other',
        architectureId: 'arch_other',
      });

      await expect(
        service.updateObjectPosition('usr_owner', 'vw_test', 'obj_other', { x: 10, y: 20 }),
      ).rejects.toThrow(new BadRequestException("Object 'obj_other' belongs to a different architecture"));

      expect(prismaMock.viewObject.upsert).not.toHaveBeenCalled();
    });

    it('catches P2003 and throws NotFoundException (404) on foreign key constraint violation', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_owner',
        role: 'owner',
      });
      prismaMock.modelObject.findUnique.mockResolvedValue({
        id: 'obj_1',
        architectureId: 'arch_test',
      });
      const p2003Error = Object.assign(new Error('Foreign key constraint violated'), { code: 'P2003' });
      prismaMock.viewObject.upsert.mockRejectedValue(p2003Error);

      await expect(
        service.updateObjectPosition('usr_owner', 'vw_test', 'obj_1', { x: 10, y: 20 }),
      ).rejects.toThrow(new NotFoundException("Object 'obj_1' not found"));
    });
  });

  describe('updateMultipleObjectPositions', () => {
    const batchDto = {
      positions: [
        { objectId: 'obj_1', x: 100, y: 200 },
        { objectId: 'obj_2', x: 300, y: 400 },
      ],
    };

    it('successfully batches position updates in a transaction for owner', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_owner',
        role: 'owner',
      });
      prismaMock.modelObject.findMany.mockResolvedValue([
        { id: 'obj_1', architectureId: 'arch_test' },
        { id: 'obj_2', architectureId: 'arch_test' },
      ]);
      prismaMock.viewObject.upsert.mockResolvedValue({});
      prismaMock.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.updateMultipleObjectPositions('usr_owner', 'vw_test', batchDto);

      expect(result).toEqual({
        viewId: 'vw_test',
        count: 2,
        positions: [
          { objectId: 'obj_1', x: 100, y: 200 },
          { objectId: 'obj_2', x: 300, y: 400 },
        ],
      });
      expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    });

    it('throws ForbiddenException (403) when viewer tries batch update', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_2',
        orgId: 'org_test',
        userId: 'usr_viewer',
        role: 'viewer',
      });

      await expect(
        service.updateMultipleObjectPositions('usr_viewer', 'vw_test', batchDto),
      ).rejects.toThrow(new ForbiddenException('Viewer role does not have write permissions'));

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException (404) when user is not a member', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMultipleObjectPositions('usr_non_member', 'vw_test', batchDto),
      ).rejects.toThrow(new NotFoundException('View not found'));

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException (404) when view does not exist', async () => {
      prismaMock.view.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMultipleObjectPositions('usr_owner', 'vw_missing', batchDto),
      ).rejects.toThrow(new NotFoundException('View not found'));

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException (404) when an object does not exist in model objects', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_owner',
        role: 'owner',
      });
      prismaMock.modelObject.findMany.mockResolvedValue([
        { id: 'obj_1', architectureId: 'arch_test' },
      ]); // obj_2 is missing

      await expect(
        service.updateMultipleObjectPositions('usr_owner', 'vw_test', batchDto),
      ).rejects.toThrow(new NotFoundException("Object 'obj_2' not found"));

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('throws BadRequestException (400) when an object belongs to a different architecture', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_owner',
        role: 'owner',
      });
      prismaMock.modelObject.findMany.mockResolvedValue([
        { id: 'obj_1', architectureId: 'arch_test' },
        { id: 'obj_2', architectureId: 'arch_other' },
      ]);

      await expect(
        service.updateMultipleObjectPositions('usr_owner', 'vw_test', batchDto),
      ).rejects.toThrow(new BadRequestException("Object 'obj_2' belongs to a different architecture"));

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('catches P2003 and throws NotFoundException (404) in batch update', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_owner',
        role: 'owner',
      });
      prismaMock.modelObject.findMany.mockResolvedValue([
        { id: 'obj_1', architectureId: 'arch_test' },
        { id: 'obj_2', architectureId: 'arch_test' },
      ]);
      const p2003Error = Object.assign(new Error('Foreign key constraint violated'), { code: 'P2003' });
      prismaMock.$transaction.mockRejectedValue(p2003Error);

      await expect(
        service.updateMultipleObjectPositions('usr_owner', 'vw_test', batchDto),
      ).rejects.toThrow(new NotFoundException('Referenced object not found'));
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

  describe('addObjectToView', () => {
    it('successfully adds object to view when user has write permissions and object is valid', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_owner',
        role: 'owner',
      });
      prismaMock.modelObject.findUnique.mockResolvedValue({
        id: 'obj_1',
        architectureId: 'arch_test',
      });
      prismaMock.viewObject.upsert.mockResolvedValue({
        viewId: 'vw_test',
        objectId: 'obj_1',
        position: { x: 50, y: 75 },
      });

      const result = await service.addObjectToView('usr_owner', 'vw_test', {
        objectId: 'obj_1',
        position: { x: 50, y: 75 },
      });

      expect(result).toEqual({
        viewObject: {
          viewId: 'vw_test',
          objectId: 'obj_1',
          position: { x: 50, y: 75 },
        },
      });
      expect(prismaMock.viewObject.upsert).toHaveBeenCalledWith({
        where: { viewId_objectId: { viewId: 'vw_test', objectId: 'obj_1' } },
        update: { position: { x: 50, y: 75 } },
        create: {
          viewId: 'vw_test',
          objectId: 'obj_1',
          position: { x: 50, y: 75 },
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
        service.addObjectToView('usr_viewer', 'vw_test', { objectId: 'obj_1' }),
      ).rejects.toThrow(new ForbiddenException('Viewer role does not have write permissions'));

      expect(prismaMock.viewObject.upsert).not.toHaveBeenCalled();
    });

    it('throws NotFoundException (404) when model object does not exist', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_owner',
        role: 'owner',
      });
      prismaMock.modelObject.findUnique.mockResolvedValue(null);

      await expect(
        service.addObjectToView('usr_owner', 'vw_test', { objectId: 'obj_missing' }),
      ).rejects.toThrow(new NotFoundException("Object 'obj_missing' not found"));

      expect(prismaMock.viewObject.upsert).not.toHaveBeenCalled();
    });

    it('throws BadRequestException (400) when model object belongs to a different architecture', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_owner',
        role: 'owner',
      });
      prismaMock.modelObject.findUnique.mockResolvedValue({
        id: 'obj_1',
        architectureId: 'arch_other',
      });

      await expect(
        service.addObjectToView('usr_owner', 'vw_test', { objectId: 'obj_1' }),
      ).rejects.toThrow(new BadRequestException("Object 'obj_1' belongs to a different architecture"));

      expect(prismaMock.viewObject.upsert).not.toHaveBeenCalled();
    });

    it('catches P2003 and throws NotFoundException (404) on foreign key constraint violation', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_owner',
        role: 'owner',
      });
      prismaMock.modelObject.findUnique.mockResolvedValue({
        id: 'obj_1',
        architectureId: 'arch_test',
      });
      const p2003Error = Object.assign(new Error('Foreign key constraint violated'), { code: 'P2003' });
      prismaMock.viewObject.upsert.mockRejectedValue(p2003Error);

      await expect(
        service.addObjectToView('usr_owner', 'vw_test', { objectId: 'obj_1' }),
      ).rejects.toThrow(new NotFoundException("Object 'obj_1' not found"));
    });
  });

  describe('removeObjectFromView', () => {
    it('successfully removes object from view using deleteMany', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_owner',
        role: 'owner',
      });
      prismaMock.viewObject.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.removeObjectFromView('usr_owner', 'vw_test', 'obj_1');

      expect(result).toEqual({ success: true });
      expect(prismaMock.viewObject.deleteMany).toHaveBeenCalledWith({
        where: { viewId: 'vw_test', objectId: 'obj_1' },
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
        service.removeObjectFromView('usr_viewer', 'vw_test', 'obj_1'),
      ).rejects.toThrow(new ForbiddenException('Viewer role does not have write permissions'));

      expect(prismaMock.viewObject.deleteMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundException (404) when user is not a member', async () => {
      prismaMock.view.findUnique.mockResolvedValue(mockView);
      prismaMock.member.findUnique.mockResolvedValue(null);

      await expect(
        service.removeObjectFromView('usr_non_member', 'vw_test', 'obj_1'),
      ).rejects.toThrow(new NotFoundException('View not found'));

      expect(prismaMock.viewObject.deleteMany).not.toHaveBeenCalled();
    });
  });
});
