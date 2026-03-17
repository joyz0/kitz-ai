import { describe, it, expect, beforeEach } from "vitest";
import { type ProviderRegistry, createProviderRegistry, type ProviderConfig } from "../registry.js";

// 测试提供商数据
const testProviders = {
  openai: {
    apiKey: "test-openai-key",
    baseUrl: "https://api.openai.com",
    models: [
      { id: "gpt-4", name: "GPT-4", contextWindow: 8192 },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", contextWindow: 4096 },
    ],
  },
  google: {
    apiKey: "test-google-key",
    baseUrl: "https://generativelanguage.googleapis.com",
    models: [{ id: "gemini-pro", name: "Gemini Pro", contextWindow: 32768 }],
  },
  anthropic: {
    apiKey: "test-anthropic-key",
    baseUrl: "https://api.anthropic.com",
    models: [{ id: "claude-3-opus", name: "Claude 3 Opus", contextWindow: 200000 }],
  },
};

describe("ProviderRegistry", () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = createProviderRegistry(testProviders);
  });

  it("should create provider registry with initial providers", () => {
    expect(registry).toBeDefined();
    expect(Object.keys(registry.getProviders())).toHaveLength(Object.keys(testProviders).length);
  });

  it("should get provider by id", () => {
    const provider = registry.getProvider("openai");
    expect(provider).toBeDefined();
    expect(provider?.apiKey).toBe("test-openai-key");
    expect(provider?.baseUrl).toBe("https://api.openai.com");
    expect(provider?.models).toEqual([
      { id: "gpt-4", name: "GPT-4", contextWindow: 8192 },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", contextWindow: 4096 },
    ]);
  });

  it("should return undefined for non-existent provider", () => {
    const provider = registry.getProvider("non-existent-provider");
    expect(provider).toBeUndefined();
  });

  it("should get all providers", () => {
    const providers = registry.getProviders();
    expect(Object.keys(providers)).toHaveLength(Object.keys(testProviders).length);
    expect(Object.keys(providers)).toEqual(["openai", "google", "anthropic"]);
  });

  it("should register new provider", () => {
    const newProvider = {
      id: "meta",
      config: {
        apiKey: "test-meta-key",
        baseUrl: "https://api.meta.com",
        models: [
          { id: "llama-3-70b", name: "Llama 3 70B", contextWindow: 4096 },
          { id: "llama-3-8b", name: "Llama 3 8B", contextWindow: 4096 },
        ],
      },
    };

    registry.registerProvider(newProvider);
    expect(Object.keys(registry.getProviders())).toHaveLength(
      Object.keys(testProviders).length + 1
    );
    const addedProvider = registry.getProvider("meta");
    expect(addedProvider).toEqual(newProvider.config);
  });

  it("should update existing provider", () => {
    const updatedProvider = {
      id: "openai",
      config: {
        apiKey: "updated-openai-key",
        baseUrl: "https://api.openai.com",
        models: [
          { id: "gpt-4", name: "GPT-4", contextWindow: 8192 },
          { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", contextWindow: 4096 },
          { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000 },
        ],
      },
    };

    registry.updateProvider(updatedProvider);
    const provider = registry.getProvider("openai");
    expect(provider).toEqual(updatedProvider.config);
  });

  it("should unregister provider", () => {
    registry.unregisterProvider("google");
    expect(Object.keys(registry.getProviders())).toHaveLength(
      Object.keys(testProviders).length - 1
    );
    expect(registry.getProvider("google")).toBeUndefined();
  });

  it("should handle empty registry", () => {
    const emptyRegistry = createProviderRegistry({});
    expect(Object.keys(emptyRegistry.getProviders())).toHaveLength(0);
    expect(emptyRegistry.getProvider("any-provider")).toBeUndefined();
  });

  it("should overwrite existing provider when registering with same id", () => {
    const existingProvider = registry.getProvider("openai");
    expect(existingProvider).toBeDefined();

    const newProvider = {
      id: "openai",
      config: {
        apiKey: "new-openai-key",
        baseUrl: "https://api.openai.com",
        models: [{ id: "gpt-4", name: "GPT-4", contextWindow: 8192 }],
      },
    };

    registry.registerProvider(newProvider);
    const updatedProvider = registry.getProvider("openai");
    expect(updatedProvider).toEqual(newProvider.config);
  });
});
