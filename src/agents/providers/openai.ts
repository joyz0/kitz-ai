import { getChildLogger, type Logger } from '../../logger/logger.js';
import { Provider } from './registry.js';
import type { ModelResponse } from './compat.js';

export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

export class OpenAIProvider implements Provider {
  id: string = 'openai';
  name: string = 'OpenAI';
  models: string[] = ['gpt-3.5-turbo', 'gpt-4', 'text-embedding-ada-002'];
  private logger: Logger;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.logger = getChildLogger({ name: 'openai-provider' });
    this.config = {
      baseURL: 'https://api.openai.com/v1',
      timeout: 30000,
      ...config,
    };
  }

  /**
   * 获取提供商名称
   */
  public getName(): string {
    return 'openai';
  }

  /**
   * 生成文本
   */
  public async generate(prompt: string, options: any): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
          ...options,
        }),
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `OpenAI API error: ${response.status}`,
        );
      }

      const data = await response.json();
      const text = data.choices[0]?.message?.content || '';

      return {
        success: true,
        text,
        metadata: {
          model: data.model,
          usage: data.usage,
          finishReason: data.choices[0]?.finish_reason,
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      this.logger.error('Error generating text with OpenAI', error);
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
      const response = await fetch(`${this.config.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model || 'text-embedding-ada-002',
          input: text,
          ...options,
        }),
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `OpenAI API error: ${response.status}`,
        );
      }

      const data = await response.json();
      const embedding = data.data[0]?.embedding || [];

      return {
        success: true,
        embedding,
        metadata: {
          model: data.model,
          usage: data.usage,
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      this.logger.error('Error embedding text with OpenAI', error);
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
      const response = await fetch(`${this.config.baseURL}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data.map((model: any) => model.id);
    } catch (error) {
      this.logger.error('Error getting OpenAI models', error);
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
      this.logger.warn('OpenAI provider not available', error);
      return false;
    }
  }
}
