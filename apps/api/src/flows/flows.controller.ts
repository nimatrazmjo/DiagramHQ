import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthTokenPayload } from '@diagramhq/domain';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateFlowDto, UpdateFlowDto } from './flows.dto';
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
}
