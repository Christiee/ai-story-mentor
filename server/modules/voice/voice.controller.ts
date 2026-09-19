import { Controller, Get, Post, Body } from '@nestjs/common';
import { BadRequestException, Logger } from '@nestjs/common';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
  VoiceConfigResponse,
  SpeechSynthesisRequest,
  SpeechSynthesisResponse,
} from '@shared/api.interface';
import { VoiceService } from './voice.service';

interface UploadedAudioFile {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
  size: number;
}

@Controller('api/voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(private readonly voiceService: VoiceService) {}

  @Get('config')
  getConfig(): VoiceConfigResponse {
    return this.voiceService.getConfig();
  }

  @Post('speech-to-text')
  @UseInterceptors(FileInterceptor('file'))
  async speechToText(
    @UploadedFile() file: UploadedAudioFile,
  ): Promise<{ text: string }> {
    if (!file) {
      throw new BadRequestException('未接收到音频文件');
    }
    const result = await this.voiceService.speechToText(
      file.buffer,
      file.originalname || 'recording.webm',
      file.mimetype || 'audio/webm',
    );
    return { text: result.text };
  }

  @Post('speech-synthesis')
  async speechSynthesis(
    @Body() body: SpeechSynthesisRequest,
  ): Promise<SpeechSynthesisResponse> {
    if (!body.text) {
      throw new BadRequestException('text 参数不能为空');
    }
    const result = await this.voiceService.speechSynthesis(
      body.text,
      body.voiceGender || 'female',
      body.speed || '0.8',
    );
    return { audioUrl: result.audioUrl };
  }
}
