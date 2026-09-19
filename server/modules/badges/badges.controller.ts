import { Controller, Get, Query, BadRequestException, Req } from '@nestjs/common';
import type { Request } from 'express';
import { BadgesService } from './badges.service';
import { requireLogin } from '../auth/require-login';
import type { ListBadgesResponse } from '@shared/api.interface';

@Controller('api/badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  async listBadges(
    @Req() req: Request,
    @Query('childId') childId?: string,
  ): Promise<ListBadgesResponse> {
    if (!childId) {
      throw new BadRequestException('childId 参数不能为空');
    }
    const userId = requireLogin(req);
    const items = await this.badgesService.listBadges(childId, userId);
    return { items };
  }
}
