import { describe, it, expect, beforeEach, vi } from "vitest";
// 导入 mock-logger 以确保 logger 模块被正确模拟
import { getMockLogger } from "../../../logger/mock-logger.js";
import { ProviderCompat } from "../compat.js";
import { type Provider } from "../registry.js";

// 获取 mock logger 实例（确保 mock 生效）
const mockLogger = getMockLogger();

describe("ProviderCompat", () => {
  let providerCompat: ProviderCompat;

  beforeEach(() => {
    providerCompat = new ProviderCompat();
  });

  it("should create ProviderCompat instance", () => {
    expect(providerCompat).toBeDefined();
  });

  it("should register compatibility layer", () => {
    const mockLayer = {
      normalizeRequest: vi.fn(),
      normalizeResponse: vi.fn(),
      getModelMapping: vi.fn(),
    };

    providerCompat.registerCompatibilityLayer("test-provider", mockLayer);
    const layer = providerCompat.getCompatibilityLayer("test-provider");
    expect(layer).toBeDefined();
  });

  it("should get compatibility layer", () => {
    const layer = providerCompat.getCompatibilityLayer("openai");
    expect(layer).toBeDefined();
    expect(typeof layer?.normalizeRequest).toBe("function");
    expect(typeof layer?.normalizeResponse).toBe("function");
    expect(typeof layer?.getModelMapping).toBe("function");
  });

  it("should return undefined for non-existent compatibility layer", () => {
    const layer = providerCompat.getCompatibilityLayer("non-existent-provider");
    expect(layer).toBeUndefined();
  });

  it("should normalize request for OpenAI", () => {
    const prompt = "Hello";
    const options = { model: "gpt-4", temperature: 0.5 };
    const result = providerCompat.normalizeRequest("openai", prompt, options);

    expect(result).toEqual({
      model: "gpt-4",
      messages: [{ role: "user", content: "Hello" }],
      temperature: 0.5,
      max_tokens: 1000,
    });
  });

  it("should normalize request for Gemini", () => {
    const prompt = "Hello";
    const options = { model: "gemini-pro", temperature: 0.5 };
    const result = providerCompat.normalizeRequest("gemini", prompt, options);

    expect(result).toEqual({
      contents: [
        {
          parts: [{ text: "Hello" }],
        },
      ],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 1000,
      },
      model: "gemini-pro",
    });
  });

  it("should return default request for unknown provider", () => {
    const prompt = "Hello";
    const options = { model: "test-model" };
    const result = providerCompat.normalizeRequest("unknown", prompt, options);

    expect(result).toEqual({ prompt: "Hello", model: "test-model" });
  });

  it("should normalize response for OpenAI", () => {
    const response = {
      model: "gpt-3.5-turbo",
      choices: [
        {
          message: { content: "Hello, world!" },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    };

    const result = providerCompat.normalizeResponse("openai", response);

    expect(result).toEqual({
      success: true,
      text: "Hello, world!",
      metadata: {
        model: "gpt-3.5-turbo",
        usage: { prompt_tokens: 10, completion_tokens: 5 },
        finishReason: "stop",
      },
    });
  });

  it("should normalize response for Gemini", () => {
    const response = {
      model: "gemini-pro",
      candidates: [
        {
          content: {
            parts: [{ text: "Hello, world!" }],
          },
          finishReason: "STOP",
          safetyRatings: [],
        },
      ],
    };

    const result = providerCompat.normalizeResponse("gemini", response);

    expect(result).toEqual({
      success: true,
      text: "Hello, world!",
      metadata: {
        model: "gemini-pro",
        finishReason: "STOP",
        safetyRatings: [],
      },
    });
  });

  it("should return default response for unknown provider", () => {
    const response = {
      text: "Hello, world!",
      metadata: { test: "value" },
    };

    const result = providerCompat.normalizeResponse("unknown", response);

    expect(result).toEqual({
      success: true,
      text: "Hello, world!",
      metadata: { test: "value" },
    });
  });

  it("should map model names for OpenAI", () => {
    expect(providerCompat.mapModel("openai", "gpt-3.5")).toBe("gpt-3.5-turbo");
    expect(providerCompat.mapModel("openai", "gpt-4")).toBe("gpt-4");
    expect(providerCompat.mapModel("openai", "gpt-4o")).toBe("gpt-4o");
  });

  it("should map model names for Gemini", () => {
    expect(providerCompat.mapModel("gemini", "gemini")).toBe("gemini-pro");
    expect(providerCompat.mapModel("gemini", "gemini-embedding")).toBe("embedding-001");
    expect(providerCompat.mapModel("gemini", "gemini-pro-vision")).toBe("gemini-pro-vision");
  });

  it("should return original model name for unknown provider", () => {
    expect(providerCompat.mapModel("unknown", "test-model")).toBe("test-model");
  });

  it("should perform cross provider call with successful provider", async () => {
    const mockProvider1 = {
      getName: vi.fn().mockReturnValue("provider1"),
      generate: vi.fn().mockResolvedValue({
        success: true,
        text: "Response from provider1",
      }),
    };

    const mockProvider2 = {
      getName: vi.fn().mockReturnValue("provider2"),
      generate: vi.fn().mockResolvedValue({
        success: false,
        error: "Failed",
      }),
    };

    const result = await providerCompat.crossProviderCall(
      [mockProvider1 as unknown as Provider, mockProvider2 as unknown as Provider],
      "Hello",
      {}
    );

    expect(result).toEqual({
      success: true,
      text: "Response from provider1",
    });
  });

  it("should return error when all providers fail", async () => {
    const mockProvider1 = {
      getName: vi.fn().mockReturnValue("provider1"),
      generate: vi.fn().mockResolvedValue({
        success: false,
        error: "Failed",
      }),
    };

    const mockProvider2 = {
      getName: vi.fn().mockReturnValue("provider2"),
      generate: vi.fn().mockRejectedValue(new Error("Error")),
    };

    const result = await providerCompat.crossProviderCall(
      [mockProvider1 as unknown as Provider, mockProvider2 as unknown as Provider],
      "Hello",
      {}
    );

    expect(result).toEqual({
      success: false,
      error: "All providers failed",
    });
  });

  it("should get available providers", async () => {
    const mockProvider1 = {
      getName: vi.fn().mockReturnValue("provider1"),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    const mockProvider2 = {
      getName: vi.fn().mockReturnValue("provider2"),
      isAvailable: vi.fn().mockResolvedValue(false),
    };

    const result = await providerCompat.getAvailableProviders([
      mockProvider1 as unknown as Provider,
      mockProvider2 as unknown as Provider,
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(mockProvider1);
  });
});
