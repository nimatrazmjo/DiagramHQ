import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import type { ViewObject } from '@prisma/client';
import type { AuthTokenPayload } from '@diagramhq/domain';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateObjectPositionDto, BatchUpdateObjectPositionsDto } from './views.dto';
import { ViewsService, type ViewObjectPosition, type BatchUpdateResult } from './views.service';

@UseGuards(AuthGuard)
@Controller('views')
export class ViewsController {
  constructor(private readonly viewsService: ViewsService) {}

  @Patch(':viewId/objects/:objectId/position')
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

  @Patch(':viewId/objects/positions')
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

  @Get(':viewId/objects')
  async getViewObjects(
    @CurrentUser() user: AuthTokenPayload,
    @Param('viewId') viewId: string,
  ): Promise<{ viewObjects: ViewObject[] }> {
    const viewObjects = await this.viewsService.getViewObjects(user.sub, viewId);
    return { viewObjects };
  }
}
