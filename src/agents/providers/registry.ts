// 参考 openclaw 的 models-config.providers.ts 实现
// 实现更复杂的提供商注册和管理逻辑

import { getChildLogger } from "../../logger/logger.js";
import type { OpenClawConfig } from "../../config/zod-schema.js";

const log = getChildLogger({ name: "provider-registry" });

export type ProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  models?: Array<{
    id: string;
    name?: string;
    contextWindow?: number;
    maxTokens?: number;
    reasoning?: boolean;
    input?: Array<"text" | "image" | "document">;
  }>;
  auth?: "api-key" | "aws-sdk" | "oauth" | "token";
};

export type ProviderRegistry = {
  providers: Record<string, ProviderConfig>;
  normalizeProviders: (params: {
    providers: Record<string, ProviderConfig>;
    agentDir: string;
  }) => Record<string, ProviderConfig>;
  resolveImplicitProviders: (params: {
    agentDir: string;
    explicitProviders: Record<string, ProviderConfig>;
  }) => Promise<Record<string, ProviderConfig>>;
  resolveImplicitBedrockProvider: (params: {
    agentDir: string;
    config: OpenClawConfig;
  }) => Promise<ProviderConfig | undefined>;
  resolveImplicitCopilotProvider: (params: {
    agentDir: string;
  }) => Promise<ProviderConfig | undefined>;
  getProvider: (id: string) => ProviderConfig | undefined;
  getProviders: () => Record<string, ProviderConfig>;
  registerProvider: (provider: { id: string; config: ProviderConfig }) => void;
  updateProvider: (provider: { id: string; config: ProviderConfig }) => void;
  unregisterProvider: (id: string) => void;
};

export function normalizeProviderId(provider: string): string {
  const normalized = provider.toLowerCase().trim();
  const aliases: Record<string, string> = {
    "openai-codex": "openai-codex",
    google: "google",
    anthropic: "anthropic",
    bedrock: "amazon-bedrock",
    "amazon-bedrock": "amazon-bedrock",
    "github-copilot": "github-copilot",
    copilot: "github-copilot",
    zai: "zai",
    "z-ai": "zai",
    openrouter: "openrouter",
    litellm: "litellm",
    "vercel-ai-gateway": "vercel-ai-gateway",
    "cloudflare-ai-gateway": "cloudflare-ai-gateway",
    huggingface: "huggingface",
    hf: "huggingface",
    mistral: "mistral",
    moonshot: "moonshot",
    minimax: "minimax",
    nvidia: "nvidia",
    together: "together",
    qianfan: "qianfan",
    ollama: "ollama",
    vllm: "vllm",
    kilocode: "kilocode",
  };
  return aliases[normalized] || normalized;
}

export function normalizeProviders(params: {
  providers: Record<string, ProviderConfig>;
  agentDir: string;
}): Record<string, ProviderConfig> {
  const { providers, agentDir } = params;
  const normalized: Record<string, ProviderConfig> = {};

  for (const [key, config] of Object.entries(providers)) {
    const normalizedKey = normalizeProviderId(key);
    normalized[normalizedKey] = {
      ...config,
      models: config.models?.map((model) => ({
        ...model,
        id: model.id.trim(),
        name: model.name?.trim() || model.id.trim(),
      })),
    };
  }

  return normalized;
}

export async function resolveImplicitProviders(params: {
  agentDir: string;
  explicitProviders: Record<string, ProviderConfig>;
}): Promise<Record<string, ProviderConfig>> {
  // 这里实现从环境变量、默认配置等获取隐式提供商的逻辑
  // 暂时返回空对象，后续可以根据 openclaw 的实现进行扩展
  return {};
}

export async function resolveImplicitBedrockProvider(params: {
  agentDir: string;
  config: OpenClawConfig;
}): Promise<ProviderConfig | undefined> {
  // 这里实现解析 Amazon Bedrock 提供商的逻辑
  // 暂时返回 undefined，后续可以根据 openclaw 的实现进行扩展
  return undefined;
}

export async function resolveImplicitCopilotProvider(params: {
  agentDir: string;
}): Promise<ProviderConfig | undefined> {
  // 这里实现解析 GitHub Copilot 提供商的逻辑
  // 暂时返回 undefined，后续可以根据 openclaw 的实现进行扩展
  return undefined;
}

export function createProviderRegistry(
  initialProviders: Record<string, ProviderConfig> = {}
): ProviderRegistry {
  const registry: ProviderRegistry = {
    providers: { ...initialProviders },
    normalizeProviders,
    resolveImplicitProviders,
    resolveImplicitBedrockProvider,
    resolveImplicitCopilotProvider,
    getProvider: (id: string) => registry.providers[id],
    getProviders: () => ({ ...registry.providers }),
    registerProvider: (provider) => {
      registry.providers[provider.id] = provider.config;
    },
    updateProvider: (provider) => {
      if (registry.providers[provider.id]) {
        registry.providers[provider.id] = provider.config;
      }
    },
    unregisterProvider: (id: string) => {
      delete registry.providers[id];
    },
  };

  return registry;
}
