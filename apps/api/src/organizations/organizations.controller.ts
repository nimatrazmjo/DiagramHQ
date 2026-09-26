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
import {
  CreateOrganizationDto,
  UpdateMemberRoleDto,
  UpdateOrganizationDto,
} from './organizations.dto';
import { OrganizationsService, type OrganizationWithRole } from './organizations.service';

@UseGuards(AuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthTokenPayload,
    @Body() body: CreateOrganizationDto,
  ): Promise<{ organization: OrganizationWithRole }> {
    const organization = await this.organizationsService.create(user.sub, body);
    return { organization };
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthTokenPayload,
  ): Promise<{ organizations: OrganizationWithRole[] }> {
    const organizations = await this.organizationsService.findAllForUser(user.sub);
    return { organizations };
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ): Promise<{ organization: OrganizationWithRole }> {
    const organization = await this.organizationsService.findById(user.sub, id);
    return { organization };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: UpdateOrganizationDto,
  ): Promise<{ organization: OrganizationWithRole }> {
    const organization = await this.organizationsService.update(user.sub, id, body);
    return { organization };
  }

  @Delete(':id')
  async delete(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.organizationsService.delete(user.sub, id);
  }

  @Get(':id/members')
  async listMembers(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ): Promise<{ members: Array<{ id: string; userId: string; role: string; createdAt: Date }> }> {
    const members = await this.organizationsService.listMembers(user.sub, id);
    return { members };
  }

  @Patch(':id/members/:memberId')
  async updateMemberRole(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberRoleDto,
  ): Promise<{
    member: {
      id: string;
      orgId: string;
      userId: string;
      role: string;
      createdAt: Date;
      updatedAt: Date;
    };
  }> {
    const member = await this.organizationsService.updateMemberRole(
      user.sub,
      orgId,
      memberId,
      body.role,
    );
    return { member };
  }
}
