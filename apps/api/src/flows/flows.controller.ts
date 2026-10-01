import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import type { FlowStep } from '@prisma/client';
import type { AuthTokenPayload } from '@diagramhq/domain';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  AddFlowStepDto,
  CreateFlowDto,
  ReorderFlowStepsDto,
  UpdateFlowDto,
  UpdateFlowStepDto,
} from './flows.dto';
import { FlowsService, type FlowWithSteps } from './flows.service';

@UseGuards(AuthGuard)
@Controller()
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Post('architectures/:architectureId/flows')
  async createFlow(
    @CurrentUser() user: AuthTokenPayload,
    @Param('architectureId') architectureId: string,
    @Body() body: CreateFlowDto,
  ): Promise<{ flow: FlowWithSteps }> {
    return this.flowsService.createFlow(user.sub, architectureId, body);
  }

  @Get('architectures/:architectureId/flows')
  async listFlows(
    @CurrentUser() user: AuthTokenPayload,
    @Param('architectureId') architectureId: string,
  ): Promise<{ flows: FlowWithSteps[] }> {
    return this.flowsService.listFlows(user.sub, architectureId);
  }

  @Get('flows/:flowId')
  async getFlow(
    @CurrentUser() user: AuthTokenPayload,
    @Param('flowId') flowId: string,
  ): Promise<{ flow: FlowWithSteps }> {
    return this.flowsService.getFlow(user.sub, flowId);
  }

  @Patch('flows/:flowId')
  async updateFlow(
    @CurrentUser() user: AuthTokenPayload,
    @Param('flowId') flowId: string,
    @Body() body: UpdateFlowDto,
  ): Promise<{ flow: FlowWithSteps }> {
    return this.flowsService.updateFlow(user.sub, flowId, body);
  }

  @Delete('flows/:flowId')
  async deleteFlow(
    @CurrentUser() user: AuthTokenPayload,
    @Param('flowId') flowId: string,
  ): Promise<{ deleted: boolean }> {
    return this.flowsService.deleteFlow(user.sub, flowId);
  }

  @Post('flows/:flowId/steps')
  async addStep(
    @CurrentUser() user: AuthTokenPayload,
    @Param('flowId') flowId: string,
    @Body() body: AddFlowStepDto,
  ): Promise<{ flow: FlowWithSteps; step: FlowStep }> {
    return this.flowsService.addStep(user.sub, flowId, body);
  }

  @Patch('flows/:flowId/steps/:stepId')
  async updateStep(
    @CurrentUser() user: AuthTokenPayload,
    @Param('flowId') flowId: string,
    @Param('stepId') stepId: string,
    @Body() body: UpdateFlowStepDto,
  ): Promise<{ flow: FlowWithSteps; step: FlowStep }> {
    return this.flowsService.updateStep(user.sub, flowId, stepId, body);
  }

  @Delete('flows/:flowId/steps/:stepId')
  async removeStep(
    @CurrentUser() user: AuthTokenPayload,
    @Param('flowId') flowId: string,
    @Param('stepId') stepId: string,
  ): Promise<{ flow: FlowWithSteps; deletedStepId: string }> {
    return this.flowsService.removeStep(user.sub, flowId, stepId);
  }

  @Put('flows/:flowId/steps/reorder')
  async reorderSteps(
    @CurrentUser() user: AuthTokenPayload,
    @Param('flowId') flowId: string,
    @Body() body: ReorderFlowStepsDto,
  ): Promise<{ flow: FlowWithSteps }> {
    return this.flowsService.reorderSteps(user.sub, flowId, body);
  }
}
