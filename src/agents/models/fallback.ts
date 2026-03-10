// 参考 openclaw 的 model-fallback.ts 实现
// 实现模型降级策略

import { getChildLogger } from '../../logger/logger.js';
import type { OpenClawConfig } from '../../config/index.js';
import { loadModelCatalog } from './catalog.js';
import { normalizeProviderId } from '../model-selection.js';

const log = getChildLogger({ name: 'model-fallback' });

export type ModelFallbackReason = 
  | 'provider_unavailable'
  | 'model_unavailable'
  | 'authentication_failed'
  | 'rate_limited'
  | 'timeout'
  | 'network_error'
  | 'unknown_error';

export type ModelFallbackOptions = {
  provider: string;
  model: string;
  reason: ModelFallbackReason;
  config?: OpenClawConfig;
  preferredProviders?: string[];
  excludeProviders?: string[];
  excludeModels?: string[];
};

export type FallbackModel = {
  provider: string;
  model: string;
  reason: string;
};

function isProviderExcluded(provider: string, options: ModelFallbackOptions): boolean {
  const normalizedProvider = normalizeProviderId(provider);
  return options.excludeProviders?.some(excluded => normalizeProviderId(excluded) === normalizedProvider) ?? false;
}

function isModelExcluded(provider: string, model: string, options: ModelFallbackOptions): boolean {
  const fullModelId = `${provider}/${model}`;
  return options.excludeModels?.some(excluded => {
    if (excluded.includes('/')) {
      return excluded === fullModelId;
    }
    return model === excluded;
  }) ?? false;
}

function getPreferredProviders(options: ModelFallbackOptions): string[] {
  return options.preferredProviders?.map(p => normalizeProviderId(p)) ?? [];
}

function sortModelsByPreference(models: Array<{ provider: string; model: string }>, preferredProviders: string[]): Array<{ provider: string; model: string }> {
  return models.sort((a, b) => {
    const aIndex = preferredProviders.indexOf(normalizeProviderId(a.provider));
    const bIndex = preferredProviders.indexOf(normalizeProviderId(b.provider));
    
    if (aIndex === -1 && bIndex === -1) {
      return 0;
    }
    if (aIndex === -1) {
      return 1;
    }
    if (bIndex === -1) {
      return -1;
    }
    return aIndex - bIndex;
  });
}

export async function findFallbackModel(options: ModelFallbackOptions): Promise<FallbackModel | null> {
  try {
    const catalog = await loadModelCatalog({ config: options.config, useCache: true });
    const preferredProviders = getPreferredProviders(options);
    
    // 过滤掉被排除的提供商和模型
    const availableModels = catalog
      .filter(entry => !isProviderExcluded(entry.provider, options))
      .filter(entry => !isModelExcluded(entry.provider, entry.id, options))
      .map(entry => ({ provider: entry.provider, model: entry.id }));
    
    // 按偏好排序
    const sortedModels = sortModelsByPreference(availableModels, preferredProviders);
    
    // 找到第一个合适的模型
    for (const model of sortedModels) {
      // 跳过当前失败的模型
      if (model.provider === options.provider && model.model === options.model) {
        continue;
      }
      
      // 检查模型是否可用（这里可以添加更多的检查逻辑）
      // 暂时假设所有模型都可用
      return {
        provider: model.provider,
        model: model.model,
        reason: `Fallback due to ${options.reason}`,
      };
    }
    
    return null;
  } catch (error) {
    log.error('Error finding fallback model:', error);
    return null;
  }
}

export function shouldFallback(error: any, reason: ModelFallbackReason): boolean {
  // 根据错误类型和原因判断是否应该降级
  // 这里可以添加更详细的错误判断逻辑
  switch (reason) {
    case 'provider_unavailable':
    case 'model_unavailable':
    case 'authentication_failed':
    case 'rate_limited':
    case 'timeout':
    case 'network_error':
      return true;
    case 'unknown_error':
      // 对于未知错误，可以根据具体情况决定是否降级
      return true;
    default:
      return false;
  }
}

export async function getFallbackChain(options: ModelFallbackOptions): Promise<FallbackModel[]> {
  const fallbackChain: FallbackModel[] = [];
  let currentOptions = { ...options };
  
  // 最多尝试 5 个降级模型
  for (let i = 0; i < 5; i++) {
    const fallback = await findFallbackModel(currentOptions);
    if (!fallback) {
      break;
    }
    
    fallbackChain.push(fallback);
    
    // 更新选项，排除当前找到的模型
    currentOptions = {
      ...currentOptions,
      excludeProviders: [...(currentOptions.excludeProviders || []), fallback.provider],
      excludeModels: [...(currentOptions.excludeModels || []), `${fallback.provider}/${fallback.model}`],
    };
  }
  
  return fallbackChain;
}
