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
import type { Architecture, Workspace } from '@prisma/client';
import type { AuthTokenPayload } from '@diagramhq/domain';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './workspaces.dto';
import {
  WorkspacesService,
  type WorkspaceWithCount,
  type WorkspaceWithRole,
} from './workspaces.service';

@UseGuards(AuthGuard)
@Controller()
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post('organizations/:orgId/workspaces')
  async create(
    @CurrentUser() user: AuthTokenPayload,
    @Param('orgId') orgId: string,
    @Body() body: CreateWorkspaceDto,
  ): Promise<{ workspace: Workspace }> {
    const workspace = await this.workspacesService.create(user.sub, orgId, body);
    return { workspace };
  }

  @Get('organizations/:orgId/workspaces')
  async findAllForOrg(
    @CurrentUser() user: AuthTokenPayload,
    @Param('orgId') orgId: string,
  ): Promise<{ workspaces: WorkspaceWithCount[] }> {
    const workspaces = await this.workspacesService.findAllForOrg(user.sub, orgId);
    return { workspaces };
  }

  @Get('workspaces/:id')
  async findById(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ): Promise<{ workspace: WorkspaceWithRole }> {
    const workspace = await this.workspacesService.findById(user.sub, id);
    return { workspace };
  }

  @Patch('workspaces/:id')
  async update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: UpdateWorkspaceDto,
  ): Promise<{ workspace: Workspace }> {
    const workspace = await this.workspacesService.update(user.sub, id, body);
    return { workspace };
  }

  @Delete('workspaces/:id')
  async delete(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.workspacesService.delete(user.sub, id);
  }

  @Get('workspaces/:id/architectures')
  async listArchitectures(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ): Promise<{ architectures: Architecture[] }> {
    const architectures = await this.workspacesService.listArchitectures(user.sub, id);
    return { architectures };
  }
}
