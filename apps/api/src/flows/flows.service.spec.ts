import { describe, expect, it, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FlowsService } from './flows.service';
import type { PrismaService } from '../database/prisma.service';

describe('FlowsService', () => {
  let service: FlowsService;
  let prismaMock: {
    architecture: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    member: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    modelConnection: {
      findMany: ReturnType<typeof vi.fn>;
    };
    flow: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
    };
    flowStep: {
      create: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const mockArchitecture = {
    id: 'arch_test',
    workspaceId: 'ws_test',
    workspace: {
      id: 'ws_test',
      orgId: 'org_test',
    },
  };

  const mockFlow = {
    id: 'flw_test',
    architectureId: 'arch_test',
    name: 'Checkout Flow',
    description: 'User completes checkout',
    createdAt: new Date(),
    updatedAt: new Date(),
    architecture: mockArchitecture,
    steps: [
      {
        id: 'flw_test_step_1',
        flowId: 'flw_test',
        stepIndex: 0,
        connectionId: 'con_1',
        note: 'Submit cart',
      },
    ],
  };

  beforeEach(() => {
    prismaMock = {
      architecture: {
        findUnique: vi.fn(),
      },
      member: {
        findUnique: vi.fn(),
      },
      modelConnection: {
        findMany: vi.fn(),
      },
      flow: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findUniqueOrThrow: vi.fn(),
      },
      flowStep: {
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    service = new FlowsService(prismaMock as unknown as PrismaService);
  });

  describe('createFlow', () => {
    it('creates flow with steps when user has editor permission and connections exist', async () => {
      prismaMock.architecture.findUnique.mockResolvedValue(mockArchitecture);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_editor',
        role: 'editor',
      });
      prismaMock.modelConnection.findMany.mockResolvedValue([{ id: 'con_1' }]);

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback({
          flow: {
            create: vi.fn().mockResolvedValue(mockFlow),
            findUniqueOrThrow: vi.fn().mockResolvedValue(mockFlow),
          },
          flowStep: {
            create: vi.fn(),
          },
        });
      });

      const result = await service.createFlow('usr_editor', 'arch_test', {
        name: 'Checkout Flow',
        description: 'User completes checkout',
        steps: [{ connectionId: 'con_1', stepIndex: 0, note: 'Submit cart' }],
      });

      expect(result.flow.name).toBe('Checkout Flow');
      expect(result.flow.steps).toHaveLength(1);
    });

    it('rejects creation when connection does not exist in architecture', async () => {
      prismaMock.architecture.findUnique.mockResolvedValue(mockArchitecture);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_editor',
        role: 'editor',
      });
      // Connection con_invalid not found in DB
      prismaMock.modelConnection.findMany.mockResolvedValue([{ id: 'con_1' }]);

      await expect(
        service.createFlow('usr_editor', 'arch_test', {
          name: 'Invalid Flow',
          steps: [{ connectionId: 'con_invalid', stepIndex: 0 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects creation when user has only viewer role', async () => {
      prismaMock.architecture.findUnique.mockResolvedValue(mockArchitecture);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_viewer',
        role: 'viewer',
      });

      await expect(
        service.createFlow('usr_viewer', 'arch_test', {
          name: 'Test Flow',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listFlows and getFlow', () => {
    it('lists flows for architecture', async () => {
      prismaMock.architecture.findUnique.mockResolvedValue(mockArchitecture);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_viewer',
        role: 'viewer',
      });
      prismaMock.flow.findMany.mockResolvedValue([mockFlow]);

      const result = await service.listFlows('usr_viewer', 'arch_test');
      expect(result.flows).toHaveLength(1);
      expect(result.flows[0].name).toBe('Checkout Flow');
    });

    it('retrieves single flow by id', async () => {
      prismaMock.flow.findUnique.mockResolvedValue(mockFlow);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_viewer',
        role: 'viewer',
      });

      const result = await service.getFlow('usr_viewer', 'flw_test');
      expect(result.flow.id).toBe('flw_test');
      expect(result.flow.steps).toHaveLength(1);
    });

    it('throws NotFoundException when flow not found', async () => {
      prismaMock.flow.findUnique.mockResolvedValue(null);

      await expect(service.getFlow('usr_viewer', 'flw_unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateFlow and deleteFlow', () => {
    it('updates flow and steps', async () => {
      prismaMock.flow.findUnique.mockResolvedValue(mockFlow);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_editor',
        role: 'editor',
      });
      prismaMock.modelConnection.findMany.mockResolvedValue([{ id: 'con_2' }]);

      const updatedFlow = {
        ...mockFlow,
        name: 'Renamed Flow',
        steps: [{ id: 's2', flowId: 'flw_test', stepIndex: 0, connectionId: 'con_2', note: null }],
      };

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback({
          flow: {
            update: vi.fn(),
            findUniqueOrThrow: vi.fn().mockResolvedValue(updatedFlow),
          },
          flowStep: {
            deleteMany: vi.fn(),
            create: vi.fn(),
          },
        });
      });

      const result = await service.updateFlow('usr_editor', 'flw_test', {
        name: 'Renamed Flow',
        steps: [{ connectionId: 'con_2', stepIndex: 0 }],
      });

      expect(result.flow.name).toBe('Renamed Flow');
      expect(result.flow.steps[0].connectionId).toBe('con_2');
    });

    it('deletes flow', async () => {
      prismaMock.flow.findUnique.mockResolvedValue(mockFlow);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 'mem_1',
        orgId: 'org_test',
        userId: 'usr_admin',
        role: 'admin',
      });
      prismaMock.flow.delete.mockResolvedValue(mockFlow);

      const result = await service.deleteFlow('usr_admin', 'flw_test');
      expect(result.deleted).toBe(true);
    });
  });
});
