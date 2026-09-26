import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  Architecture,
  ModelConnection,
  ModelObject,
  Version,
} from '@prisma/client';
import type { AuthTokenPayload } from '@diagramhq/domain';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  CreateArchitectureDto,
  CreateModelConnectionDto,
  CreateModelObjectDto,
  UpdateArchitectureDto,
  UpdateModelConnectionDto,
  UpdateModelObjectDto,
} from './architectures.dto';
import {
  ArchitecturesService,
  type ArchitectureModelSnapshot,
} from './architectures.service';

@UseGuards(AuthGuard)
@Controller()
export class ArchitecturesController {
  constructor(private readonly architecturesService: ArchitecturesService) {}

  // --- Architectures ---

  @Post('workspaces/:workspaceId/architectures')
  async createArchitecture(
    @CurrentUser() user: AuthTokenPayload,
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateArchitectureDto,
  ): Promise<{ architecture: Architecture; version: Version }> {
    return this.architecturesService.createArchitecture(user.sub, workspaceId, body);
  }

  @Get('architectures/:id')
  async getArchitecture(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ): Promise<{ architecture: Architecture }> {
    return this.architecturesService.getArchitecture(user.sub, id);
  }

  @Patch('architectures/:id')
  async updateArchitecture(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: UpdateArchitectureDto,
  ): Promise<{ architecture: Architecture }> {
    return this.architecturesService.updateArchitecture(user.sub, id, body);
  }

  @Delete('architectures/:id')
  async deleteArchitecture(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.architecturesService.deleteArchitecture(user.sub, id);
  }

  // --- Architecture Model Snapshot (F018) ---

  @Get('architectures/:id/model')
  async getArchitectureModel(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Query('versionId') versionId?: string,
  ): Promise<ArchitectureModelSnapshot> {
    return this.architecturesService.getArchitectureModel(
      user.sub,
      id,
      versionId,
    );
  }

  // --- Model Objects ---

  @Get('architectures/:id/objects')
  async listModelObjects(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Query('versionId') versionId?: string,
    @Query('kind') kind?: string,
  ): Promise<{ objects: ModelObject[] }> {
    return this.architecturesService.listModelObjects(user.sub, id, {
      versionId,
      kind,
    });
  }

  @Post('architectures/:id/objects')
  async createModelObject(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: CreateModelObjectDto,
  ): Promise<{ object: ModelObject }> {
    return this.architecturesService.createModelObject(user.sub, id, body);
  }

  @Get('objects/:id')
  async getModelObject(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ): Promise<{ object: ModelObject }> {
    return this.architecturesService.getModelObject(user.sub, id);
  }

  @Patch('objects/:id')
  async updateModelObject(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: UpdateModelObjectDto,
  ): Promise<{ object: ModelObject }> {
    return this.architecturesService.updateModelObject(user.sub, id, body);
  }

  @Delete('objects/:id')
  async deleteModelObject(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.architecturesService.deleteModelObject(user.sub, id);
  }

  // --- Model Connections ---

  @Get('architectures/:id/connections')
  async listModelConnections(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Query('versionId') versionId?: string,
  ): Promise<{ connections: ModelConnection[] }> {
    return this.architecturesService.listModelConnections(user.sub, id, {
      versionId,
    });
  }

  @Post('architectures/:id/connections')
  async createModelConnection(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: CreateModelConnectionDto,
  ): Promise<{ connection: ModelConnection }> {
    return this.architecturesService.createModelConnection(user.sub, id, body);
  }

  @Get('connections/:id')
  async getModelConnection(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ): Promise<{ connection: ModelConnection }> {
    return this.architecturesService.getModelConnection(user.sub, id);
  }

  @Patch('connections/:id')
  async updateModelConnection(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: UpdateModelConnectionDto,
  ): Promise<{ connection: ModelConnection }> {
    return this.architecturesService.updateModelConnection(user.sub, id, body);
  }

  @Delete('connections/:id')
  async deleteModelConnection(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.architecturesService.deleteModelConnection(user.sub, id);
  }
}
