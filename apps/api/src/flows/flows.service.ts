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
import type {
  AddFlowStepDto,
  CreateFlowDto,
  ReorderFlowStepsDto,
  UpdateFlowDto,
  UpdateFlowStepDto,
} from './flows.dto';

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

  async addStep(
    userId: string,
    flowId: string,
    dto: AddFlowStepDto,
  ): Promise<{ flow: FlowWithSteps; step: FlowStep }> {
    const { role, flow } = await this.resolveFlowMember(userId, flowId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Insufficient permissions to modify flow steps');
    }

    const conn = await this.prisma.modelConnection.findFirst({
      where: {
        architectureId: flow.architectureId,
        id: dto.connectionId,
      },
    });
    if (!conn) {
      throw new BadRequestException(
        `Invalid flow step: connection "${dto.connectionId}" does not exist in architecture`,
      );
    }

    const currentSteps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);
    const targetIndex =
      dto.insertAtIndex !== undefined
        ? Math.max(0, Math.min(dto.insertAtIndex, currentSteps.length))
        : currentSteps.length;

    const newStepId = `${flowId}_step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const newStepItem = {
      id: newStepId,
      flowId,
      stepIndex: targetIndex,
      connectionId: dto.connectionId,
      note: dto.note ?? null,
    };

    currentSteps.splice(targetIndex, 0, newStepItem as FlowStep);

    await this.prisma.$transaction(async (tx) => {
      await tx.flowStep.deleteMany({ where: { flowId } });
      for (let i = 0; i < currentSteps.length; i++) {
        const s = currentSteps[i];
        if (!s) continue;
        await tx.flowStep.create({
          data: {
            id: s.id,
            flowId,
            stepIndex: i,
            connectionId: s.connectionId,
            note: s.note,
          },
        });
      }
    });

    const updatedFlow = await this.prisma.flow.findUniqueOrThrow({
      where: { id: flowId },
      include: {
        steps: { orderBy: { stepIndex: 'asc' } },
      },
    });

    const createdStep =
      updatedFlow.steps.find((s) => s.id === newStepId) ??
      updatedFlow.steps[targetIndex];
    if (!createdStep) {
      throw new NotFoundException('Failed to retrieve created step');
    }
    return { flow: updatedFlow, step: createdStep };
  }

  async updateStep(
    userId: string,
    flowId: string,
    stepId: string,
    dto: UpdateFlowStepDto,
  ): Promise<{ flow: FlowWithSteps; step: FlowStep }> {
    const { role, flow } = await this.resolveFlowMember(userId, flowId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Insufficient permissions to modify flow steps');
    }

    const stepIndex = flow.steps.findIndex((s) => s.id === stepId);
    if (stepIndex < 0) {
      throw new NotFoundException(`Step "${stepId}" not found in flow "${flowId}"`);
    }

    const steps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);
    const targetStep = steps[stepIndex];
    if (!targetStep) {
      throw new NotFoundException(`Step "${stepId}" not found in flow "${flowId}"`);
    }

    if (dto.note !== undefined) {
      targetStep.note = dto.note;
    }

    if (dto.stepIndex !== undefined && dto.stepIndex !== targetStep.stepIndex) {
      steps.splice(stepIndex, 1);
      const newIdx = Math.max(0, Math.min(dto.stepIndex, steps.length));
      steps.splice(newIdx, 0, targetStep);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.flowStep.deleteMany({ where: { flowId } });
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        if (!s) continue;
        await tx.flowStep.create({
          data: {
            id: s.id,
            flowId,
            stepIndex: i,
            connectionId: s.connectionId,
            note: s.note,
          },
        });
      }
    });

    const updatedFlow = await this.prisma.flow.findUniqueOrThrow({
      where: { id: flowId },
      include: {
        steps: { orderBy: { stepIndex: 'asc' } },
      },
    });

    const updatedStep = updatedFlow.steps.find((s) => s.id === stepId);
    if (!updatedStep) {
      throw new NotFoundException(`Step "${stepId}" not found after update`);
    }
    return { flow: updatedFlow, step: updatedStep };
  }

  async removeStep(
    userId: string,
    flowId: string,
    stepId: string,
  ): Promise<{ flow: FlowWithSteps; deletedStepId: string }> {
    const { role, flow } = await this.resolveFlowMember(userId, flowId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Insufficient permissions to delete flow steps');
    }

    const stepIndex = flow.steps.findIndex((s) => s.id === stepId);
    if (stepIndex < 0) {
      throw new NotFoundException(`Step "${stepId}" not found in flow "${flowId}"`);
    }

    const steps = [...flow.steps].sort((a, b) => a.stepIndex - b.stepIndex);
    steps.splice(stepIndex, 1);

    await this.prisma.$transaction(async (tx) => {
      await tx.flowStep.deleteMany({ where: { flowId } });
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        if (!s) continue;
        await tx.flowStep.create({
          data: {
            id: s.id,
            flowId,
            stepIndex: i,
            connectionId: s.connectionId,
            note: s.note,
          },
        });
      }
    });

    const updatedFlow = await this.prisma.flow.findUniqueOrThrow({
      where: { id: flowId },
      include: {
        steps: { orderBy: { stepIndex: 'asc' } },
      },
    });

    return { flow: updatedFlow, deletedStepId: stepId };
  }

  async reorderSteps(
    userId: string,
    flowId: string,
    dto: ReorderFlowStepsDto,
  ): Promise<{ flow: FlowWithSteps }> {
    const { role, flow } = await this.resolveFlowMember(userId, flowId);
    if (!canWrite(role)) {
      throw new ForbiddenException('Insufficient permissions to reorder flow steps');
    }

    const stepMap = new Map<string, FlowStep>(flow.steps.map((s) => [s.id, s]));
    if (dto.orderedStepIds.length !== flow.steps.length) {
      throw new BadRequestException(
        `Reorder step count mismatch: expected ${flow.steps.length}, received ${dto.orderedStepIds.length}`,
      );
    }

    for (const stepId of dto.orderedStepIds) {
      if (!stepMap.has(stepId)) {
        throw new BadRequestException(`Step "${stepId}" not found in flow`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.flowStep.deleteMany({ where: { flowId } });
      for (let i = 0; i < dto.orderedStepIds.length; i++) {
        const stepId = dto.orderedStepIds[i];
        if (!stepId) continue;
        const existing = stepMap.get(stepId);
        if (!existing) continue;
        await tx.flowStep.create({
          data: {
            id: existing.id,
            flowId,
            stepIndex: i,
            connectionId: existing.connectionId,
            note: existing.note,
          },
        });
      }
    });

    const updatedFlow = await this.prisma.flow.findUniqueOrThrow({
      where: { id: flowId },
      include: {
        steps: { orderBy: { stepIndex: 'asc' } },
      },
    });

    return { flow: updatedFlow };
  }
}
