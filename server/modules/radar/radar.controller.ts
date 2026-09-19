import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RadarService } from './radar.service';
import { requireLogin } from '../auth/require-login';
import type { LatestRadarResponse } from '@shared/api.interface';

@Controller('api/radar')
export class RadarController {
  constructor(private readonly radarService: RadarService) {}

  @Get('latest')
  async getLatest(
    @Req() req: Request,
    @Query('childId') childId: string,
  ): Promise<LatestRadarResponse> {
    const userId = requireLogin(req);
    return this.radarService.getLatest(childId, userId);
  }
}
