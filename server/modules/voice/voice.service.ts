import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { CapabilityService, FileService } from '@lark-apaas/fullstack-nestjs-core';
import type {
  ChildVoiceSpeechToTextOneInput,
  ChildVoiceSpeechToTextOneOutput,
  ChildScriptVoiceSynthesisOneInput,
  ChildScriptVoiceSynthesisOneOutput,
} from '@shared/plugin-types';

const ASR_INSTANCE_ID = 'child_voice_speech_to_text_1';
const TTS_INSTANCE_ID = 'child_script_voice_synthesis_1';

const SUPPORTED_MIME_TYPES = ['audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/webm;codecs=opus'];
const NATIVE_SUPPORTED_MIME_TYPES = ['audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mpeg', 'audio/mp3'];

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    @Inject(CapabilityService)
    private readonly capabilityService: CapabilityService,
    private readonly fileService: FileService,
  ) {}

  /**
   * 获取语音能力配置状态
   */
  getConfig(): { asrEngine: 'volcengine' | 'browser' | 'none'; ttsEngine: 'volcengine' | 'browser' | 'none' } {
    return {
      asrEngine: 'volcengine',
      ttsEngine: 'volcengine',
    };
  }

  /**
   * 语音识别（ASR）：将音频文件转写为中文文字
   * 基于平台插件（底层火山引擎语音技术）
   */
  async speechToText(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ text: string }> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('音频文件为空');
    }

    this.logger.log(
      `开始语音识别: fileName=${fileName}, size=${fileBuffer.length}, type=${mimeType}`,
    );

    if (!SUPPORTED_MIME_TYPES.some((t) => mimeType.toLowerCase().includes(t))) {
      this.logger.warn(`不支持的音频格式: ${mimeType}`);
      throw new BadRequestException(`不支持的音频格式（${mimeType}），请使用 WAV、MP3 或 OGG 格式`);
    }

    const isNativeFormat = NATIVE_SUPPORTED_MIME_TYPES.some((t) =>
      mimeType.toLowerCase().includes(t),
    );
    this.logger.log(`音频格式判断: mimeType=${mimeType}, nativeSupported=${isNativeFormat}`);

    let audioUrl: string;
    try {
      const uploadResult = await this.fileService.upload(fileBuffer, {
        fileName,
        contentType: mimeType,
      });
      audioUrl = uploadResult.downloadURL;
      this.logger.log(`音频上传成功: filePath=${uploadResult.filePath}`);
    } catch (error) {
      this.logger.error(
        `音频上传失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('音频文件上传失败，请重试');
    }

    try {
      const input: ChildVoiceSpeechToTextOneInput = {
        audio_file: [audioUrl],
      };
      const result = await this.capabilityService
        .load(ASR_INSTANCE_ID)
        .call('speechToText', input);

      const text = ((result as { text?: string }).text || '').trim();
      this.logger.log(`语音识别完成，文本长度: ${text.length}`);
      if (text.length === 0) {
        throw new BadRequestException('没有识别到语音内容，请大声一点、说慢一点再试一次~');
      }
      return { text };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`语音识别插件调用失败: ${errorMsg}`);

      if (errorMsg.includes('unsupported') || errorMsg.includes('format')) {
        throw new BadRequestException('音频格式不被识别服务支持，请换一种录音方式或使用其他浏览器');
      }
      if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
        throw new BadRequestException('语音识别超时了，说短一点试试？');
      }
      if (errorMsg.includes('Network') || errorMsg.includes('connect')) {
        throw new BadRequestException('网络连接不太好，检查下网络再试试');
      }

      throw new BadRequestException('语音识别失败，请再试一次');
    }
  }

  /**
   * 语音合成（TTS）：将文本合成为语音音频
   * 基于平台插件（底层火山引擎语音技术），温柔女声，稍慢语速适合儿童
   */
  async speechSynthesis(
    text: string,
    voiceGender: 'female' | 'male' = 'female',
    speed: string = '0.8',
  ): Promise<{ audioUrl: string }> {
    if (!text || !text.trim()) {
      throw new BadRequestException('合成文本不能为空');
    }

    this.logger.log(
      `开始语音合成: gender=${voiceGender}, speed=${speed}, length=${text.length}`,
    );

    try {
      const input: ChildScriptVoiceSynthesisOneInput = {
        script_content: text,
        voice_gender: voiceGender,
        playback_speed: speed,
      };
      const result = await this.capabilityService
        .load(TTS_INSTANCE_ID)
        .call('speechSynthesis', input);

      const audioUrl = (result as { audioUrl?: string }).audioUrl || '';
      this.logger.log(
        `语音合成完成: urlPrefix=${audioUrl.slice(0, 60)}...`,
      );
      return { audioUrl };
    } catch (error) {
      this.logger.error(
        `语音合成插件调用失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('语音合成失败，请稍后重试');
    }
  }
}
