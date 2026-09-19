import {
  Controller,
  Get,
  Query,
  BadRequestException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type {
  ListDailyRequest,
  ListDailyResponse,
  TodayDailyResponse,
} from '@shared/api.interface';
import { DailyService } from './daily.service';
import { requireLogin } from '../auth/require-login';

@Controller('api/daily')
export class DailyController {
  constructor(private readonly dailyService: DailyService) {}

  @Get('today')
  async getToday(
    @Req() req: Request,
    @Query('childId') childId: string,
  ): Promise<TodayDailyResponse> {
    if (!childId) {
      throw new BadRequestException('childId is required');
    }
    const userId = requireLogin(req);
    return this.dailyService.getTodayDaily(childId, userId);
  }

  @Get()
  async getList(
    @Req() req: Request,
    @Query() query: ListDailyRequest,
  ): Promise<ListDailyResponse> {
    if (!query.childId) {
      throw new BadRequestException('childId is required');
    }
    const userId = requireLogin(req);
    const page = query.page ? parseInt(String(query.page), 10) : 1;
    const pageSize = query.pageSize
      ? parseInt(String(query.pageSize), 10)
      : 30;
    return this.dailyService.listDaily(
      query.childId,
      page,
      pageSize,
      userId,
    );
  }
}
