// 参考 openclaw 的 model-compat.ts 实现
// 实现更完善的提供商兼容性处理

import { getChildLogger, type Logger } from "../../logger/logger.js";
import type { ProviderConfig } from "./registry.js";

export interface ModelResponse {
  success: boolean;
  text?: string;
  embedding?: number[];
  error?: string;
  metadata?: any;
}

export interface ProviderCompatibilityLayer {
  normalizeRequest(prompt: string, options: any): any;
  normalizeResponse(response: any): ModelResponse;
  getModelMapping(model: string): string;
  getProviderSpecificOptions(options: any): any;
}

export class ProviderCompat {
  private logger: Logger;
  private compatibilityLayers: Map<string, ProviderCompatibilityLayer>;

  constructor() {
    this.logger = getChildLogger({ name: "provider-compat" });
    this.compatibilityLayers = new Map<string, ProviderCompatibilityLayer>();
    this.registerDefaultLayers();
  }

  /**
   * 注册默认兼容性层
   */
  private registerDefaultLayers(): void {
    // OpenAI 兼容性层
    this.registerCompatibilityLayer("openai", {
      normalizeRequest: (prompt, options) => {
        const messages = Array.isArray(options.messages) 
          ? options.messages 
          : [{ role: "user", content: prompt }];
        
        return {
          model: options.model || "gpt-3.5-turbo",
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
          top_p: options.topP || 1.0,
          frequency_penalty: options.frequencyPenalty || 0.0,
          presence_penalty: options.presencePenalty || 0.0,
          ...options,
        };
      },
      normalizeResponse: (response) => {
        return {
          success: true,
          text: response.choices[0]?.message?.content || "",
          metadata: {
            model: response.model,
            usage: response.usage,
            finishReason: response.choices[0]?.finish_reason,
          },
        };
      },
      getModelMapping: (model) => {
        const mappings: Record<string, string> = {
          "gpt-3.5": "gpt-3.5-turbo",
          "gpt-4": "gpt-4",
          "gpt-4-vision": "gpt-4-vision-preview",
          "gpt-5": "gpt-5-turbo",
        };
        return mappings[model] || model;
      },
      getProviderSpecificOptions: (options) => {
        return {
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          top_p: options.topP,
          frequency_penalty: options.frequencyPenalty,
          presence_penalty: options.presencePenalty,
          ...options,
        };
      },
    });

    // Gemini 兼容性层
    this.registerCompatibilityLayer("gemini", {
      normalizeRequest: (prompt, options) => {
        let contents = options.contents;
        if (!contents) {
          contents = [
            {
              parts: [{ text: prompt }],
            },
          ];
        }
        
        return {
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
        };
      },
      normalizeResponse: (response) => {
        return {
          success: true,
          text: response.candidates[0]?.content?.parts[0]?.text || "",
          metadata: {
            model: response.model,
            finishReason: response.candidates[0]?.finishReason,
            safetyRatings: response.candidates[0]?.safetyRatings,
          },
        };
      },
      getModelMapping: (model) => {
        const mappings: Record<string, string> = {
          gemini: "gemini-pro",
          "gemini-vision": "gemini-pro-vision",
          "gemini-embedding": "embedding-001",
          "gemini-1.5": "gemini-1.5-pro",
        };
        return mappings[model] || model;
      },
      getProviderSpecificOptions: (options) => {
        return {
          generationConfig: options.generationConfig,
          safetySettings: options.safetySettings,
          ...options,
        };
      },
    });

    // Anthropic 兼容性层
    this.registerCompatibilityLayer("anthropic", {
      normalizeRequest: (prompt, options) => {
        const messages = Array.isArray(options.messages) 
          ? options.messages 
          : [{ role: "user", content: prompt }];
        
        return {
          model: options.model || "claude-3-opus-20240229",
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
          top_p: options.topP || 1.0,
          ...options,
        };
      },
      normalizeResponse: (response) => {
        return {
          success: true,
          text: response.content[0]?.text || "",
          metadata: {
            model: response.model,
            usage: response.usage,
            finishReason: response.stop_reason,
          },
        };
      },
      getModelMapping: (model) => {
        const mappings: Record<string, string> = {
          claude: "claude-3-opus-20240229",
          "claude-3": "claude-3-opus-20240229",
          "claude-3-sonnet": "claude-3-sonnet-20240229",
          "claude-3-haiku": "claude-3-haiku-20240229",
        };
        return mappings[model] || model;
      },
      getProviderSpecificOptions: (options) => {
        return {
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          top_p: options.topP,
          ...options,
        };
      },
    });
  }

  /**
   * 注册兼容性层
   */
  public registerCompatibilityLayer(provider: string, layer: ProviderCompatibilityLayer): void {
    this.compatibilityLayers.set(provider, layer);
    this.logger.info(`Registered compatibility layer for ${provider}`);
  }

  /**
   * 获取兼容性层
   */
  public getCompatibilityLayer(provider: string): ProviderCompatibilityLayer | undefined {
    return this.compatibilityLayers.get(provider);
  }

  /**
   * 标准化请求
   */
  public normalizeRequest(provider: string, prompt: string, options: any): any {
    const layer = this.getCompatibilityLayer(provider);
    if (layer) {
      return layer.normalizeRequest(prompt, options);
    }
    return { prompt, ...options };
  }

  /**
   * 标准化响应
   */
  public normalizeResponse(provider: string, response: any): ModelResponse {
    const layer = this.getCompatibilityLayer(provider);
    if (layer) {
      return layer.normalizeResponse(response);
    }
    return {
      success: true,
      text: response.text || response.content || "",
      metadata: response.metadata || {},
    };
  }

  /**
   * 映射模型名称
   */
  public mapModel(provider: string, model: string): string {
    const layer = this.getCompatibilityLayer(provider);
    if (layer) {
      return layer.getModelMapping(model);
    }
    return model;
  }

  /**
   * 获取提供商特定选项
   */
  public getProviderSpecificOptions(provider: string, options: any): any {
    const layer = this.getCompatibilityLayer(provider);
    if (layer) {
      return layer.getProviderSpecificOptions(options);
    }
    return options;
  }

  /**
   * 检测提供商类型
   */
  public detectProviderType(modelId: string): string | undefined {
    const providerPrefixes: Record<string, string> = {
      gpt: "openai",
      gemini: "gemini",
      claude: "anthropic",
      llama: "ollama",
      mistral: "mistral",
      mixtral: "mistral",
      moonshot: "moonshot",
      qwen: "qianfan",
      minimax: "minimax",
      nvidia: "nvidia",
      together: "together",
      huggingface: "huggingface",
      hf: "huggingface",
    };

    for (const [prefix, provider] of Object.entries(providerPrefixes)) {
      if (modelId.toLowerCase().startsWith(prefix)) {
        return provider;
      }
    }

    return undefined;
  }

  /**
   * 验证提供商配置
   */
  public validateProviderConfig(provider: string, config: ProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (provider) {
      case "openai":
      case "gemini":
      case "anthropic":
      case "mistral":
      case "moonshot":
      case "qianfan":
      case "minimax":
      case "nvidia":
      case "together":
      case "huggingface":
        if (!config.apiKey) {
          errors.push(`API key is required for ${provider} provider`);
        }
        break;
      case "ollama":
        // Ollama 不需要 API key
        break;
      default:
        errors.push(`Unknown provider: ${provider}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * 创建提供商兼容性实例
 */
export function createProviderCompat(): ProviderCompat {
  return new ProviderCompat();
}

/**
 * 全局提供商兼容性实例
 */
export const providerCompat = createProviderCompat();

