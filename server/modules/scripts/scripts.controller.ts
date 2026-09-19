import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Req,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ScriptsService } from './scripts.service';
import { requireLogin } from '../auth/require-login';
import type {
  ListScriptsResponse,
  ScriptDetailResponse,
  ScriptWork,
  MentorChatRequest,
  MentorChatResponse,
  GeneratePagesRequest,
  GeneratePagesResponse,
  GenerateAudioRequest,
  GenerateAudioResponse,
  StartScriptRequest,
} from '@shared/api.interface';

@Controller('api/scripts')
export class ScriptsController {
  constructor(private readonly scriptsService: ScriptsService) {}

  @Get('examples')
  async listExamples(): Promise<ListScriptsResponse> {
    return this.scriptsService.listExampleScripts();
  }

  @Get('showcase')
  async listShowcase(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ListScriptsResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const size = pageSize ? parseInt(pageSize, 10) : 12;
    return this.scriptsService.listShowcaseScripts(pageNum, size);
  }

  @Get('examples/:id')
  async getExampleDetail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ScriptDetailResponse> {
    const result = await this.scriptsService.getExampleScriptDetail(id);
    if (!result) {
      throw new NotFoundException('示例作品不存在');
    }
    return result;
  }

  @Get()
  async listScripts(
    @Req() req: Request,
    @Query('childId') childId: string,
    @Query('status') status?: 'draft' | 'completed',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ListScriptsResponse> {
    const userId = requireLogin(req);
    const pageNum = page ? parseInt(page, 10) : 1;
    const size = pageSize ? parseInt(pageSize, 10) : 10;
    return this.scriptsService.listScripts(childId, userId, status, pageNum, size);
  }

  @Get(':id')
  async getScriptDetail(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ScriptDetailResponse> {
    const userId = requireLogin(req);
    return this.scriptsService.getScriptDetail(id, userId);
  }

  @Post('start')
  async startScript(
    @Req() req: Request,
    @Body() body: StartScriptRequest,
  ): Promise<ScriptWork> {
    const userId = requireLogin(req);
    return this.scriptsService.startScript(body.childId, userId);
  }

  @Post('mentor-chat')
  async mentorChat(
    @Req() req: Request,
    @Body() body: MentorChatRequest,
  ): Promise<MentorChatResponse> {
    const userId = requireLogin(req);
    return this.scriptsService.mentorChat(
      body.scriptId,
      body.childId,
      body.childInput,
      userId,
    );
  }

  @Post('generate-pages')
  async generatePages(
    @Req() req: Request,
    @Body() body: GeneratePagesRequest,
  ): Promise<GeneratePagesResponse> {
    const userId = requireLogin(req);
    return this.scriptsService.generatePages(body.scriptId, userId);
  }

  @Post('generate-audio')
  async generateAudio(
    @Req() req: Request,
    @Body() body: GenerateAudioRequest,
  ): Promise<GenerateAudioResponse> {
    const userId = requireLogin(req);
    return this.scriptsService.generateAudio(
      body.scriptId,
      body.voiceGender,
      body.playbackSpeed,
      userId,
    );
  }
}
