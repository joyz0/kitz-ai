// 定义模型接口
export interface Model {
  id: string;
  name: string;
  provider: string;
  type: 'chat' | 'completion' | 'embedding' | 'image' | 'audio';
  capabilities: string[];
  default: boolean;
  // 其他模型属性
}

// 定义模型目录接口
export interface ModelCatalog {
  getModel(id: string): Model | undefined;
  getModels(): Model[];
  getModelsByType(type: Model['type']): Model[];
  getModelsByProvider(provider: string): Model[];
  getDefaultModel(type: Model['type']): Model | undefined;
  addModel(model: Model): void;
  removeModel(id: string): void;
  updateModel(model: Model): void;
}

// 模型目录实现
export class DefaultModelCatalog implements ModelCatalog {
  private models: Map<string, Model> = new Map();

  constructor(initialModels: Model[] = []) {
    initialModels.forEach(model => {
      this.models.set(model.id, model);
    });
  }

  // 根据ID获取模型
  getModel(id: string): Model | undefined {
    return this.models.get(id);
  }

  // 获取所有模型
  getModels(): Model[] {
    return Array.from(this.models.values());
  }

  // 根据类型获取模型
  getModelsByType(type: Model['type']): Model[] {
    return Array.from(this.models.values()).filter(model => model.type === type);
  }

  // 根据提供商获取模型
  getModelsByProvider(provider: string): Model[] {
    return Array.from(this.models.values()).filter(model => model.provider === provider);
  }

  // 获取默认模型
  getDefaultModel(type: Model['type']): Model | undefined {
    return Array.from(this.models.values()).find(model => model.type === type && model.default);
  }

  // 添加模型
  addModel(model: Model): void {
    this.models.set(model.id, model);
  }

  // 移除模型
  removeModel(id: string): void {
    this.models.delete(id);
  }

  // 更新模型
  updateModel(model: Model): void {
    this.models.set(model.id, model);
  }
}

// 创建默认模型
const defaultModels: Model[] = [
  {
    id: 'openai-gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    type: 'chat',
    capabilities: ['chat', 'vision'],
    default: true,
  },
  {
    id: 'openai-gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    type: 'chat',
    capabilities: ['chat'],
    default: false,
  },
  {
    id: 'google-gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    type: 'chat',
    capabilities: ['chat', 'vision'],
    default: false,
  },
];

// 创建模型目录实例
export function createModelCatalog(models: Model[] = defaultModels): ModelCatalog {
  return new DefaultModelCatalog(models);
}
