import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { type AxiosError } from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const ARK_API_BASE = 'https://ark.cn-beijing.volces.com/api/v3';
const DEFAULT_MODEL = 'doubao-seed-2-1-pro-260628';

interface ArkChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ArkTextResult {
  content: string;
  via: 'ark' | 'fallback-plugin';
}

@Injectable()
export class ArkTextService implements OnModuleInit {
  private readonly logger = new Logger(ArkTextService.name);

  onModuleInit(): void {
    const configured = this.isConfigured();
    this.logger.log(
      `火山方舟配置状态: ${configured ? '已配置' : '未配置'} (model=${this.modelId})`,
    );
  }

  get apiKey(): string | undefined {
    return process.env.ARK_API_KEY;
  }

  get modelId(): string {
    return process.env.ARK_MODEL || DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  /**
   * 调用火山方舟 Chat Completions（非流式）
   * 失败时返回 null，由调用方决定是否回退
   */
  async chatCompletions(
    messages: ArkChatMessage[],
    options: { temperature?: number; maxTokens?: number } = {},
  ): Promise<string | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await axios.post(
        `${ARK_API_BASE}/chat/completions`,
        {
          model: this.modelId,
          messages,
          stream: false,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 1024,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 60000,
        },
      );

      const content: string | undefined =
        response.data?.choices?.[0]?.message?.content;
      if (!content) {
        this.logger.warn('Ark API 返回内容为空');
        return null;
      }
      return content;
    } catch (error) {
      const err = error as AxiosError;
      const status = err.response?.status;
      const data = err.response?.data as unknown;
      this.logger.error(
        `Ark API 调用失败 (status=${status}): ${JSON.stringify(data ?? err.message)}`,
      );
      return null;
    }
  }

  /**
   * 便捷方法：单轮 system + user 文本生成
   * 返回结果 + 来源标记（ark / fallback-plugin）
   * 调用方需自行实现 fallback 逻辑，这里只负责 Ark 调用
   */
  async generateText(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<ArkTextResult | null> {
    const content = await this.chatCompletions([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    if (content == null) return null;
    return { content, via: 'ark' };
  }
}
