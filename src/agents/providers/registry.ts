// 定义提供商接口
export interface Provider {
  id: string;
  name: string;
  models: string[];
  // 其他提供商属性
}

// 定义提供商注册表接口
export interface ProviderRegistry {
  getProvider(id: string): Provider | undefined;
  getProviders(): Provider[];
  registerProvider(provider: Provider): void;
  unregisterProvider(id: string): void;
  updateProvider(provider: Provider): void;
}

// 提供商注册表实现
export class DefaultProviderRegistry implements ProviderRegistry {
  private providers: Map<string, Provider> = new Map();

  constructor(initialProviders: Provider[] = []) {
    initialProviders.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  // 根据ID获取提供商
  getProvider(id: string): Provider | undefined {
    return this.providers.get(id);
  }

  // 获取所有提供商
  getProviders(): Provider[] {
    return Array.from(this.providers.values());
  }

  // 注册提供商
  registerProvider(provider: Provider): void {
    this.providers.set(provider.id, provider);
  }

  // 注销提供商
  unregisterProvider(id: string): void {
    this.providers.delete(id);
  }

  // 更新提供商
  updateProvider(provider: Provider): void {
    this.providers.set(provider.id, provider);
  }
}

// 创建默认提供商
const defaultProviders: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: ['openai-gpt-4', 'openai-gpt-3.5-turbo'],
  },
  {
    id: 'google',
    name: 'Google',
    models: ['google-gemini-pro'],
  },
];

// 创建提供商注册表实例
export function createProviderRegistry(providers: Provider[] = defaultProviders): ProviderRegistry {
  return new DefaultProviderRegistry(providers);
}
