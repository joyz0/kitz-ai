// 参考 openclaw 的 gemini 实现
// 增强 Gemini 提供商功能和错误处理

import { getChildLogger, type Logger } from '../../logger/logger.js';
import type { ProviderConfig } from './registry.js';
import type { ModelResponse } from './compat.js';

export interface GeminiConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class GeminiProvider {
  id: string = 'gemini';
  name: string = 'Google Gemini';
  private logger: Logger;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.logger = getChildLogger({ name: 'gemini-provider' });
    this.config = {
      baseURL: 'https://generativelanguage.googleapis.com/v1',
      timeout: 30000,
      headers: {},
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
      
      // 构建内容
      let contents = options.contents;
      if (!contents) {
        contents = [
          {
            parts: [{ text: prompt }],
          },
        ];
      }

      const response = await fetch(
        `${this.config.baseURL}/models/${model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers,
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: options.temperature || 0.7,
              maxOutputTokens: options.maxTokens || 1000,
              topP: options.topP || 1.0,
              topK: options.topK || 40,
              ...options.generationConfig,
            },
            safetySettings: options.safetySettings || [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
              },
              {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
              },
              {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
              },
            ],
            ...options,
          }),
          signal: AbortSignal.timeout(this.config.timeout!),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `Gemini API error: ${response.status}`;
        const errorType = errorData.error?.status || 'api_error';
        
        this.logger.error(`Gemini API error (${errorType}): ${errorMessage}`, {
          status: response.status,
          errorType,
        });
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // 处理安全评级
      const safetyRatings = data.candidates[0]?.safetyRatings;
      if (safetyRatings) {
        const blockedRatings = safetyRatings.filter((rating: any) => 
          rating.threshold === 'BLOCKED'
        );
        if (blockedRatings.length > 0) {
          this.logger.warn('Gemini API response blocked due to safety concerns', {
            blockedCategories: blockedRatings.map((rating: any) => rating.category),
          });
        }
      }

      const text = data.candidates[0]?.content?.parts[0]?.text || '';
      const finishReason = data.candidates[0]?.finishReason;

      // 处理不同的完成原因
      if (finishReason === 'MAX_TOKENS') {
        this.logger.warn('Gemini API response truncated due to maxOutputTokens limit');
      } else if (finishReason === 'SAFETY') {
        this.logger.warn('Gemini API response truncated due to safety concerns');
      }

      return {
        success: true,
        text,
        metadata: {
          model,
          finishReason,
          safetyRatings,
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
            ...this.config.headers,
          },
          body: JSON.stringify({
            model: `models/${model}`,
            content: {
              parts: Array.isArray(text) 
                ? text.map(t => ({ text: t })) 
                : [{ text }],
            },
            taskType: options.taskType || 'RETRIEVAL_QUERY',
            title: options.title,
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
          taskType: options.taskType || 'RETRIEVAL_QUERY',
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
          headers: {
            ...this.config.headers,
          },
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

  /**
   * 流式生成文本
   */
  public async *streamGenerate(prompt: string, options: any): AsyncGenerator<string> {
    try {
      const model = options.model || 'gemini-pro';
      
      // 构建内容
      let contents = options.contents;
      if (!contents) {
        contents = [
          {
            parts: [{ text: prompt }],
          },
        ];
      }

      const response = await fetch(
        `${this.config.baseURL}/models/${model}:streamGenerateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers,
          },
          body: JSON.stringify({
            contents,
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

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line === '') continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data.candidates[0]?.content?.parts[0]?.text;
              if (text) {
                yield text;
              }
            } catch (error) {
              this.logger.warn('Error parsing Gemini stream chunk', error);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Error streaming text with Gemini', error);
      throw error;
    }
  }
}

/**
 * 创建 Gemini 提供商实例
 */
export function createGeminiProvider(config: GeminiConfig): GeminiProvider {
  return new GeminiProvider(config);
}

/**
 * 从 ProviderConfig 创建 Gemini 提供商实例
 */
export function createGeminiProviderFromConfig(config: ProviderConfig): GeminiProvider {
  if (!config.apiKey) {
    throw new Error('Gemini API key is required');
  }

  return new GeminiProvider({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });
}

