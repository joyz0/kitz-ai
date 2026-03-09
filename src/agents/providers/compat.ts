import { getChildLogger, type Logger } from "../../logger/logger.js";
import type { Provider } from "./registry.js";

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
        return {
          model: options.model || "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
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
        };
        return mappings[model] || model;
      },
    });

    // Gemini 兼容性层
    this.registerCompatibilityLayer("gemini", {
      normalizeRequest: (prompt, options) => {
        // 从 options 中移除 temperature，因为它已经在 generationConfig 中
        const { temperature, ...restOptions } = options;
        return {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: temperature || 0.7,
            maxOutputTokens: options.maxTokens || 1000,
            ...options.generationConfig,
          },
          ...restOptions,
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
          "gemini-embedding": "embedding-001",
        };
        return mappings[model] || model;
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
      text: response.text || "",
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
   * 跨提供商调用
   */
  public async crossProviderCall(
    providers: Provider[],
    prompt: string,
    options: any
  ): Promise<ModelResponse> {
    for (const provider of providers) {
      try {
        this.logger.debug(`Trying provider: ${provider.getName()}`);
        const result = await provider.generate(prompt, options);
        if (result.success) {
          return result;
        }
      } catch (error) {
        this.logger.warn(`Error with provider ${provider.getName()}:`, error);
      }
    }

    return {
      success: false,
      error: "All providers failed",
    };
  }

  /**
   * 获取可用的提供商
   */
  public async getAvailableProviders(providers: Provider[]): Promise<Provider[]> {
    const available: Provider[] = [];

    for (const provider of providers) {
      try {
        const isAvailable = await provider.isAvailable();
        if (isAvailable) {
          available.push(provider);
        }
      } catch (error) {
        this.logger.warn(`Error checking availability for ${provider.getName()}:`, error);
      }
    }

    return available;
  }
}
