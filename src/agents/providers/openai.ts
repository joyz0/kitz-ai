// 参考 openclaw 的 openai 实现
// 增强 OpenAI 提供商功能和错误处理

import { getChildLogger, type Logger } from "../../logger/logger.js";
import type { ProviderConfig } from "./registry.js";
import type { ModelResponse } from "./compat.js";

export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class OpenAIProvider {
  id: string = "openai";
  name: string = "OpenAI";
  private logger: Logger;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.logger = getChildLogger({ name: "openai-provider" });
    this.config = {
      baseURL: "https://api.openai.com/v1",
      timeout: 30000,
      headers: {},
      ...config,
    };
  }

  /**
   * 获取提供商名称
   */
  public getName(): string {
    return "openai";
  }

  /**
   * 生成文本
   */
  public async generate(prompt: string, options: any): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      const messages = Array.isArray(options.messages) 
        ? options.messages 
        : [{ role: "user", content: prompt }];

      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          ...this.config.headers,
        },
        body: JSON.stringify({
          model: options.model || "gpt-3.5-turbo",
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
          top_p: options.topP || 1.0,
          frequency_penalty: options.frequencyPenalty || 0.0,
          presence_penalty: options.presencePenalty || 0.0,
          ...options,
        }),
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `OpenAI API error: ${response.status}`;
        const errorType = errorData.error?.type || "api_error";
        
        this.logger.error(`OpenAI API error (${errorType}): ${errorMessage}`, {
          status: response.status,
          errorType,
        });
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const text = data.choices[0]?.message?.content || "";
      const finishReason = data.choices[0]?.finish_reason;

      // 处理不同的完成原因
      if (finishReason === "length") {
        this.logger.warn("OpenAI API response truncated due to max_tokens limit");
      } else if (finishReason === "content_filter") {
        this.logger.warn("OpenAI API response filtered due to content policy");
      }

      return {
        success: true,
        text,
        metadata: {
          model: data.model,
          usage: data.usage,
          finishReason,
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      this.logger.error("Error generating text with OpenAI", error);
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
      const input = Array.isArray(text) ? text : [text];

      const response = await fetch(`${this.config.baseURL}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          ...this.config.headers,
        },
        body: JSON.stringify({
          model: options.model || "text-embedding-ada-002",
          input,
          encoding_format: options.encodingFormat || "float",
          ...options,
        }),
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const embeddings = data.data.map((item: any) => item.embedding);

      return {
        success: true,
        embedding: Array.isArray(text) ? embeddings : embeddings[0] || [],
        metadata: {
          model: data.model,
          usage: data.usage,
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      this.logger.error("Error embedding text with OpenAI", error);
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
          ...this.config.headers,
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data.map((model: any) => model.id);
    } catch (error) {
      this.logger.error("Error getting OpenAI models", error);
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
      this.logger.warn("OpenAI provider not available", error);
      return false;
    }
  }

  /**
   * 流式生成文本
   */
  public async *streamGenerate(prompt: string, options: any): AsyncGenerator<string> {
    try {
      const messages = Array.isArray(options.messages) 
        ? options.messages 
        : [{ role: "user", content: prompt }];

      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          ...this.config.headers,
        },
        body: JSON.stringify({
          model: options.model || "gpt-3.5-turbo",
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
          stream: true,
          ...options,
        }),
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        buffer += chunk;

        const lines = buffer.split("\n");
        for (const line of lines) {
          if (line === "data: [DONE]") continue;
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices[0]?.delta?.content;
              if (delta) {
                yield delta;
              }
            } catch (error) {
              this.logger.warn("Error parsing OpenAI stream chunk", error);
            }
          }
        }
        buffer = lines[lines.length - 1];
      }
    } catch (error) {
      this.logger.error("Error streaming text with OpenAI", error);
      throw error;
    }
  }
}

/**
 * 创建 OpenAI 提供商实例
 */
export function createOpenAIProvider(config: OpenAIConfig): OpenAIProvider {
  return new OpenAIProvider(config);
}

/**
 * 从 ProviderConfig 创建 OpenAI 提供商实例
 */
export function createOpenAIProviderFromConfig(config: ProviderConfig): OpenAIProvider {
  if (!config.apiKey) {
    throw new Error("OpenAI API key is required");
  }

  return new OpenAIProvider({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });
}

