import { resolveContextTokensForModel, shouldSkipEagerContextWindowWarmup, resolveConfiguredProviderContextWindow } from "../src/agents/core/context.js";

describe("Context Module", () => {
  describe("resolveContextTokensForModel", () => {
    it("should return default context tokens when model info is not found", () => {
      const result = resolveContextTokensForModel("unknown-model", { providers: {} });
      expect(result).toBe(4096); // 默认值
    });

    it("should return model-specific context window when available", () => {
      const config = {
        providers: {
          openai: {
            models: {
              "gpt-4": { contextWindow: 8192 },
            },
          },
        },
      };
      const result = resolveContextTokensForModel("openai/gpt-4", config);
      expect(result).toBe(8192);
    });

    it("should return provider-specific default context window when model info is not found", () => {
      const config = {
        providers: {
          openai: {
            defaultContextWindow: 4096,
          },
        },
      };
      const result = resolveContextTokensForModel("openai/unknown-model", config);
      expect(result).toBe(4096);
    });
  });

  describe("shouldSkipEagerContextWindowWarmup", () => {
    it("should return true for primary commands", () => {
      const argv = ["node", "cli.js", "chat"];
      const result = shouldSkipEagerContextWindowWarmup(argv);
      expect(result).toBe(true);
    });

    it("should return false for non-primary commands", () => {
      const argv = ["node", "cli.js", "config"];
      const result = shouldSkipEagerContextWindowWarmup(argv);
      expect(result).toBe(false);
    });
  });

  describe("resolveConfiguredProviderContextWindow", () => {
    it("should return provider-specific context window when configured", () => {
      const config = {
        providers: {
          openai: {
            defaultContextWindow: 4096,
          },
        },
      };
      const result = resolveConfiguredProviderContextWindow("openai", config);
      expect(result).toBe(4096);
    });

    it("should return undefined when provider is not configured", () => {
      const config = {
        providers: {},
      };
      const result = resolveConfiguredProviderContextWindow("unknown-provider", config);
      expect(result).toBeUndefined();
    });
  });
});
