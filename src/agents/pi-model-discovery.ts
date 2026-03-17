// 模型发现功能
import type { OpenClawConfig } from "../config/zod-schema.js";

export class ModelRegistry {
  private models: Map<string, any> = new Map();

  public registerModel(provider: string, modelId: string, modelSpec: any): void {
    const fullModelId = `${provider}/${modelId}`;
    this.models.set(fullModelId, {
      id: fullModelId,
      provider,
      ...modelSpec,
    });
  }

  public getModel(modelId: string): any | undefined {
    return this.models.get(modelId);
  }

  public getAllModels(): any[] {
    return Array.from(this.models.values());
  }
}

export class AuthStorage {
  private authData: Map<string, any> = new Map();

  public setAuth(provider: string, authInfo: any): void {
    this.authData.set(provider, authInfo);
  }

  public getAuth(provider: string): any | undefined {
    return this.authData.get(provider);
  }
}

export async function discoverModels(config: OpenClawConfig): Promise<any[]> {
  const models: any[] = [];

  // 从配置中发现模型
  if (config.models?.providers) {
    for (const [providerId, providerConfig] of Object.entries(config.models.providers)) {
      const typedProviderConfig = providerConfig as any;
      if (typedProviderConfig.models) {
        for (const [modelId, modelSpec] of Object.entries(typedProviderConfig.models)) {
          models.push({
            id: `${providerId}/${modelId}`,
            provider: providerId,
            ...(typeof modelSpec === "object" && modelSpec !== null ? modelSpec : {}),
          });
        }
      }
    }
  }

  return models;
}

export async function discoverAuthStorage(config: OpenClawConfig): Promise<AuthStorage> {
  const authStorage = new AuthStorage();

  // 从配置中发现认证信息
  if (config.models?.providers) {
    for (const [providerId, providerConfig] of Object.entries(config.models.providers)) {
      const typedProviderConfig = providerConfig as any;
      if (typedProviderConfig.apiKey) {
        authStorage.setAuth(providerId, {
          apiKey: typedProviderConfig.apiKey,
          baseUrl: typedProviderConfig.baseUrl,
        });
      }
    }
  }

  return authStorage;
}
