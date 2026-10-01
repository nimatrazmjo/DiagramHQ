import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Flow, FlowStep } from '@prisma/client';
import {
  canWrite,
  createId,
  type MemberRole,
} from '@diagramhq/domain';
import { PrismaService } from '../database/prisma.service';
import type { CreateFlowDto, UpdateFlowDto } from './flows.dto';

export type FlowWithSteps = Flow & { steps: FlowStep[] };

@Injectable()
export class FlowsService {
  constructor(private readonly prisma: PrismaService) {}

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
      throw new NotFoundException('Architecture not found');
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
      throw new NotFoundException('Architecture not found');
    }

    return { orgId, role: member.role as MemberRole };
  }

  private async resolveFlowMember(
    userId: string,
    flowId: string,
  ): Promise<{
    orgId: string;
    role: MemberRole;
    flow: Flow & {
      architecture: {
        workspace: {
          orgId: string;
        };
      };
      steps: FlowStep[];
    };
  }> {
    const flow = await this.prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' },
        },
        architecture: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!flow) {
      throw new NotFoundException('Flow not found');
    }

    const orgId = flow.architecture.workspace.orgId;
    const member = await this.prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Flow not found');
    }

    return { orgId, role: member.role as MemberRole, flow };
  }

  async createFlow(
    userId: string,
    architectureId: string,
    dto: CreateFlowDto,
  ): Promise<{ flow: FlowWithSteps }> {
    const { role } = await this.resolveArchitectureMember(userId, architectureId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Insufficient permissions to create flows');
    }

    const rawSteps = dto.steps ?? [];
    if (rawSteps.length > 0) {
      const connectionIds = [...new Set(rawSteps.map((s) => s.connectionId))];
      const existingConns = await this.prisma.modelConnection.findMany({
        where: {
          architectureId,
          id: { in: connectionIds },
        },
        select: { id: true },
      });
      const existingConnIds = new Set(existingConns.map((c) => c.id));

      for (const step of rawSteps) {
        if (!existingConnIds.has(step.connectionId)) {
          throw new BadRequestException(
            `Invalid flow step: connection "${step.connectionId}" does not exist in architecture`,
          );
        }
      }
    }

    const flowId = createId('flw');

    const createdFlow = await this.prisma.$transaction(async (tx) => {
      await tx.flow.create({
        data: {
          id: flowId,
          architectureId,
          name: dto.name.trim(),
          description: dto.description ?? null,
        },
      });

      const sorted = [...rawSteps].sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0));
      for (let i = 0; i < sorted.length; i++) {
        const step = sorted[i];
        if (!step) continue;
        await tx.flowStep.create({
          data: {
            id: `${flowId}_step_${i + 1}`,
            flowId,
            stepIndex: step.stepIndex !== undefined ? step.stepIndex : i,
            connectionId: step.connectionId,
            note: step.note ?? null,
          },
        });
      }

      return tx.flow.findUniqueOrThrow({
        where: { id: flowId },
        include: {
          steps: {
            orderBy: { stepIndex: 'asc' },
          },
        },
      });
    });

    return { flow: createdFlow };
  }

  async listFlows(
    userId: string,
    architectureId: string,
  ): Promise<{ flows: FlowWithSteps[] }> {
    await this.resolveArchitectureMember(userId, architectureId);

    const flows = await this.prisma.flow.findMany({
      where: { architectureId },
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { flows };
  }

  async getFlow(
    userId: string,
    flowId: string,
  ): Promise<{ flow: FlowWithSteps }> {
    const { flow } = await this.resolveFlowMember(userId, flowId);
    return { flow };
  }

  async updateFlow(
    userId: string,
    flowId: string,
    dto: UpdateFlowDto,
  ): Promise<{ flow: FlowWithSteps }> {
    const { role, flow } = await this.resolveFlowMember(userId, flowId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Insufficient permissions to update flows');
    }

    if (dto.steps !== undefined && dto.steps.length > 0) {
      const connectionIds = [...new Set(dto.steps.map((s) => s.connectionId))];
      const existingConns = await this.prisma.modelConnection.findMany({
        where: {
          architectureId: flow.architectureId,
          id: { in: connectionIds },
        },
        select: { id: true },
      });
      const existingConnIds = new Set(existingConns.map((c) => c.id));

      for (const step of dto.steps) {
        if (!existingConnIds.has(step.connectionId)) {
          throw new BadRequestException(
            `Invalid flow step: connection "${step.connectionId}" does not exist in architecture`,
          );
        }
      }
    }

    const updatedFlow = await this.prisma.$transaction(async (tx) => {
      await tx.flow.update({
        where: { id: flowId },
        data: {
          name: dto.name !== undefined ? dto.name.trim() : undefined,
          description: dto.description !== undefined ? dto.description : undefined,
        },
      });

      if (dto.steps !== undefined) {
        // Replace steps
        await tx.flowStep.deleteMany({
          where: { flowId },
        });

        const sorted = [...dto.steps].sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0));
        for (let i = 0; i < sorted.length; i++) {
          const step = sorted[i];
          if (!step) continue;
          await tx.flowStep.create({
            data: {
              id: `${flowId}_step_${i + 1}`,
              flowId,
              stepIndex: step.stepIndex !== undefined ? step.stepIndex : i,
              connectionId: step.connectionId,
              note: step.note ?? null,
            },
          });
        }
      }

      return tx.flow.findUniqueOrThrow({
        where: { id: flowId },
        include: {
          steps: {
            orderBy: { stepIndex: 'asc' },
          },
        },
      });
    });

    return { flow: updatedFlow };
  }

  async deleteFlow(
    userId: string,
    flowId: string,
  ): Promise<{ deleted: boolean }> {
    const { role } = await this.resolveFlowMember(userId, flowId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Insufficient permissions to delete flows');
    }

    await this.prisma.flow.delete({
      where: { id: flowId },
    });

    return { deleted: true };
  }
}
