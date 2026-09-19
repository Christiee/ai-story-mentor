import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ChildrenService } from './children.service';
import { requireLogin } from '../auth/require-login';
import type {
  ChildProfile,
  ListChildrenResponse,
  CreateChildRequest,
  UpdateChildRequest,
} from '@shared/api.interface';

@Controller('api/children')
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Get()
  async listChildren(@Req() req: Request): Promise<ListChildrenResponse> {
    const userId = requireLogin(req);
    const items: ChildProfile[] = await this.childrenService.list(userId);
    return { items };
  }

  @Get(':id')
  async getChild(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ChildProfile> {
    const userId = requireLogin(req);
    return this.childrenService.getById(id, userId);
  }

  @Post()
  async createChild(
    @Req() req: Request,
    @Body() dto: CreateChildRequest,
  ): Promise<ChildProfile> {
    const userId = requireLogin(req);
    return this.childrenService.create(dto, userId);
  }

  @Patch(':id')
  async updateChild(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateChildRequest,
  ): Promise<ChildProfile> {
    const userId = requireLogin(req);
    return this.childrenService.update(id, dto, userId);
  }
}
