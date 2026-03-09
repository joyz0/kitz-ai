import { getChildLogger, type Logger } from '../../logger/logger.js';
import type { Provider } from './registry.js';
import type { ModelResponse } from './compat.js';

export interface GeminiConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

export class GeminiProvider implements Provider {
  id: string = 'gemini';
  name: string = 'Google Gemini';
  models: string[] = ['gemini-pro', 'gemini-pro-vision'];
  private logger: Logger;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.logger = getChildLogger({ name: 'gemini-provider' });
    this.config = {
      baseURL: 'https://generativelanguage.googleapis.com/v1',
      timeout: 30000,
      ...config,
    };
  }

  /**
   * 获取提供商名称
   */
  public getName(): string {
    return 'gemini';
  }

  /**
   * 生成文本
   */
  public async generate(prompt: string, options: any): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      const model = options.model || 'gemini-pro';
      const response = await fetch(
        `${this.config.baseURL}/models/${model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: options.temperature || 0.7,
              maxOutputTokens: options.maxTokens || 1000,
              ...options.generationConfig,
            },
            ...options,
          }),
          signal: AbortSignal.timeout(this.config.timeout!),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Gemini API error: ${response.status}`,
        );
      }

      const data = await response.json();
      const text = data.candidates[0]?.content?.parts[0]?.text || '';

      return {
        success: true,
        text,
        metadata: {
          model,
          finishReason: data.candidates[0]?.finishReason,
          safetyRatings: data.candidates[0]?.safetyRatings,
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      this.logger.error('Error generating text with Gemini', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * 嵌入文本
   */
  public async embed(text: string, options: any): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      const model = options.model || 'embedding-001';
      const response = await fetch(
        `${this.config.baseURL}/models/${model}:embedContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: `models/${model}`,
            content: {
              parts: [{ text }],
            },
          }),
          signal: AbortSignal.timeout(this.config.timeout!),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Gemini API error: ${response.status}`,
        );
      }

      const data = await response.json();
      const embedding = data.embedding?.values || [];

      return {
        success: true,
        embedding,
        metadata: {
          model,
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      this.logger.error('Error embedding text with Gemini', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * 获取模型列表
   */
  public async getModels(): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.config.baseURL}/models?key=${this.config.apiKey}`,
        {
          signal: AbortSignal.timeout(this.config.timeout!),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return (
        data.models?.map((model: any) => model.name.replace('models/', '')) ||
        []
      );
    } catch (error) {
      this.logger.error('Error getting Gemini models', error);
      return [];
    }
  }

  /**
   * 检查提供商是否可用
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const models = await this.getModels();
      return models.length > 0;
    } catch (error) {
      this.logger.warn('Gemini provider not available', error);
      return false;
    }
  }
}
