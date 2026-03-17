import type { ModelInfo } from "../models/catalog.js";
import type { OpenClawConfig } from "../../config/config.js";
import { getProviderRuntime } from "../models/catalog.js";

export function normalizeProviderName(provider: string): string {
  const lower = provider.toLowerCase();
  if (lower === "openai" || lower === "openai.com") {
    return "openai";
  }
  if (lower === "anthropic" || lower === "anthropic.com") {
    return "anthropic";
  }
  if (lower === "google" || lower === "google.com" || lower === "gemini") {
    return "google";
  }
  if (lower === "mistral" || lower === "mistral.ai") {
    return "mistral";
  }
  if (lower === "groq" || lower === "groq.com") {
    return "groq";
  }
  if (lower === "perplexity" || lower === "perplexity.ai") {
    return "perplexity";
  }
  if (lower === "openrouter" || lower === "openrouter.ai") {
    return "openrouter";
  }
  if (lower === "zhipu" || lower === "zhipuai" || lower === "glm") {
    return "zhipu";
  }
  if (lower === "moonshot" || lower === "moonshot.ai") {
    return "moonshot";
  }
  if (lower === "deepseek" || lower === "deepseek.ai") {
    return "deepseek";
  }
  if (lower === "baidu" || lower === "ERNIE-Bot" || lower === "ERNIE") {
    return "baidu";
  }
  if (lower === "alibaba" || lower === "tongyi" || lower === "qwen") {
    return "alibaba";
  }
  if (lower === "tencent" || lower === "hunyuan" || lower === "tencent-hunyuan") {
    return "tencent";
  }
  return provider;
}

export function getModelInfo(cfg: OpenClawConfig, model: string): ModelInfo | undefined {
  const runtime = getProviderRuntime(cfg);
  return runtime.getModelInfo(model);
}

export function isModelAvailable(cfg: OpenClawConfig, model: string): boolean {
  const modelInfo = getModelInfo(cfg, model);
  return modelInfo !== undefined;
}

export function getModelContextWindow(modelInfo: ModelInfo): number {
  return modelInfo.contextWindow || 4096;
}

export function getModelMaxOutputTokens(modelInfo: ModelInfo): number {
  return modelInfo.maxOutputTokens || 1024;
}

export function getModelProvider(modelInfo: ModelInfo): string {
  return modelInfo.provider || "unknown";
}

export function isModelSuppressed(cfg: OpenClawConfig, model: string): boolean {
  const runtime = getProviderRuntime(cfg);
  return runtime.isModelSuppressed(model);
}

export function getModelCapabilities(modelInfo: ModelInfo) {
  return {
    vision: modelInfo.vision || false,
    audio: modelInfo.audio || false,
    tools: modelInfo.tools || false,
    streaming: modelInfo.streaming || false,
    functionCalling: modelInfo.functionCalling || false,
    multiModal: modelInfo.multiModal || false,
  };
}
