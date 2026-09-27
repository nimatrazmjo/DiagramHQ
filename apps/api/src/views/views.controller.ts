import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common';
import type { View, ViewObject } from '@prisma/client';
import type { AuthTokenPayload } from '@diagramhq/domain';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  UpdateObjectPositionDto,
  BatchUpdateObjectPositionsDto,
  CreateViewDto,
  UpdateViewDto,
  AddViewObjectDto,
} from './views.dto';
import { ViewsService, type ViewObjectPosition, type BatchUpdateResult } from './views.service';

@UseGuards(AuthGuard)
@Controller()
export class ViewsController {
  constructor(private readonly viewsService: ViewsService) {}

  @Post('architectures/:architectureId/views')
  async createView(
    @CurrentUser() user: AuthTokenPayload,
    @Param('architectureId') architectureId: string,
    @Body() body: CreateViewDto,
  ): Promise<{ view: View }> {
    return this.viewsService.createView(user.sub, architectureId, body);
  }

  @Get('architectures/:architectureId/views')
  async listViews(
    @CurrentUser() user: AuthTokenPayload,
    @Param('architectureId') architectureId: string,
  ): Promise<{ views: View[] }> {
    return this.viewsService.listViews(user.sub, architectureId);
  }

  @Get('views/:viewId')
  async getView(
    @CurrentUser() user: AuthTokenPayload,
    @Param('viewId') viewId: string,
  ): Promise<{ view: View }> {
    return this.viewsService.getView(user.sub, viewId);
  }

  @Patch('views/:viewId')
  async updateView(
    @CurrentUser() user: AuthTokenPayload,
    @Param('viewId') viewId: string,
    @Body() body: UpdateViewDto,
  ): Promise<{ view: View }> {
    return this.viewsService.updateView(user.sub, viewId, body);
  }

  @Delete('views/:viewId')
  async deleteView(
    @CurrentUser() user: AuthTokenPayload,
    @Param('viewId') viewId: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.viewsService.deleteView(user.sub, viewId);
  }

  @Post('views/:viewId/objects')
  async addObjectToView(
    @CurrentUser() user: AuthTokenPayload,
    @Param('viewId') viewId: string,
    @Body() body: AddViewObjectDto,
  ): Promise<{ viewObject: { viewId: string; objectId: string; position?: { x: number; y: number } } }> {
    return this.viewsService.addObjectToView(user.sub, viewId, body);
  }

  @Delete('views/:viewId/objects/:objectId')
  async removeObjectFromView(
    @CurrentUser() user: AuthTokenPayload,
    @Param('viewId') viewId: string,
    @Param('objectId') objectId: string,
  ): Promise<{ success: boolean }> {
    return this.viewsService.removeObjectFromView(user.sub, viewId, objectId);
  }

  @Patch('views/:viewId/objects/:objectId/position')
  async updateObjectPosition(
    @CurrentUser() user: AuthTokenPayload,
    @Param('viewId') viewId: string,
    @Param('objectId') objectId: string,
    @Body() body: UpdateObjectPositionDto,
  ): Promise<{ viewObject: ViewObjectPosition }> {
    const viewObject = await this.viewsService.updateObjectPosition(
      user.sub,
      viewId,
      objectId,
      body,
    );
    return { viewObject };
  }

  @Patch('views/:viewId/objects/positions')
  async updateMultipleObjectPositions(
    @CurrentUser() user: AuthTokenPayload,
    @Param('viewId') viewId: string,
    @Body() body: BatchUpdateObjectPositionsDto,
  ): Promise<{ result: BatchUpdateResult }> {
    const result = await this.viewsService.updateMultipleObjectPositions(
      user.sub,
      viewId,
      body,
    );
    return { result };
  }

  @Get('views/:viewId/objects')
  async getViewObjects(
    @CurrentUser() user: AuthTokenPayload,
    @Param('viewId') viewId: string,
  ): Promise<{ viewObjects: ViewObject[] }> {
    const viewObjects = await this.viewsService.getViewObjects(user.sub, viewId);
    return { viewObjects };
  }

  @Get('views/:viewId/projection')
  async getViewProjection(
    @CurrentUser() user: AuthTokenPayload,
    @Param('viewId') viewId: string,
  ): Promise<{
    view: View;
    objects: Array<{
      id: string;
      name: string;
      kind: string;
      metadata: Record<string, unknown> | null;
      position: { x: number; y: number } | null;
    }>;
  }> {
    return this.viewsService.getViewProjection(user.sub, viewId);
  }
}
