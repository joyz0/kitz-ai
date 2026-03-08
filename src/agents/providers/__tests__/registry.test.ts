import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderRegistry, createProviderRegistry, Provider } from '../registry.js';

// 测试提供商数据
const testProviders: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: ['openai-gpt-4', 'openai-gpt-3.5-turbo', 'openai-text-embedding-3-small'],
  },
  {
    id: 'google',
    name: 'Google',
    models: ['google-gemini-pro', 'google-gemini-ultra'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: ['anthropic-claude-3-opus', 'anthropic-claude-3-sonnet'],
  },
];

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = createProviderRegistry(testProviders);
  });

  it('should create provider registry with initial providers', () => {
    expect(registry).toBeDefined();
    expect(registry.getProviders()).toHaveLength(testProviders.length);
  });

  it('should get provider by id', () => {
    const provider = registry.getProvider('openai');
    expect(provider).toBeDefined();
    expect(provider?.id).toBe('openai');
    expect(provider?.name).toBe('OpenAI');
    expect(provider?.models).toEqual(['openai-gpt-4', 'openai-gpt-3.5-turbo', 'openai-text-embedding-3-small']);
  });

  it('should return undefined for non-existent provider', () => {
    const provider = registry.getProvider('non-existent-provider');
    expect(provider).toBeUndefined();
  });

  it('should get all providers', () => {
    const providers = registry.getProviders();
    expect(providers).toHaveLength(testProviders.length);
    expect(providers.map(p => p.id)).toEqual(['openai', 'google', 'anthropic']);
  });

  it('should register new provider', () => {
    const newProvider: Provider = {
      id: 'meta',
      name: 'Meta',
      models: ['meta-llama-3-70b', 'meta-llama-3-8b'],
    };

    registry.registerProvider(newProvider);
    expect(registry.getProviders()).toHaveLength(testProviders.length + 1);
    const addedProvider = registry.getProvider('meta');
    expect(addedProvider).toEqual(newProvider);
  });

  it('should update existing provider', () => {
    const updatedProvider: Provider = {
      id: 'openai',
      name: 'OpenAI (Updated)',
      models: ['openai-gpt-4', 'openai-gpt-3.5-turbo', 'openai-text-embedding-3-small', 'openai-gpt-4o'],
    };

    registry.updateProvider(updatedProvider);
    const provider = registry.getProvider('openai');
    expect(provider).toEqual(updatedProvider);
  });

  it('should unregister provider', () => {
    registry.unregisterProvider('google');
    expect(registry.getProviders()).toHaveLength(testProviders.length - 1);
    expect(registry.getProvider('google')).toBeUndefined();
  });

  it('should handle empty registry', () => {
    const emptyRegistry = createProviderRegistry([]);
    expect(emptyRegistry.getProviders()).toHaveLength(0);
    expect(emptyRegistry.getProvider('any-provider')).toBeUndefined();
  });

  it('should overwrite existing provider when registering with same id', () => {
    const existingProvider = registry.getProvider('openai');
    expect(existingProvider).toBeDefined();

    const newProvider: Provider = {
      id: 'openai',
      name: 'OpenAI (New)',
      models: ['openai-gpt-4'],
    };

    registry.registerProvider(newProvider);
    const updatedProvider = registry.getProvider('openai');
    expect(updatedProvider).toEqual(newProvider);
  });
});
