import {
  getCompactionSafeguardSettings,
  shouldAllowCompaction,
  calculateCompactionTarget,
} from "../src/agents/pi-extensions/compaction-safeguard.js";
import { getContextPruningSettings } from "../src/agents/pi-extensions/context-pruning/settings.js";
import { pruneContext, Message } from "../src/agents/pi-extensions/context-pruning/pruner.js";

describe("Pi Extensions Module", () => {
  describe("Compaction Safeguard", () => {
    describe("getCompactionSafeguardSettings", () => {
      it("should return default settings when no config is provided", () => {
        const config = {};
        const settings = getCompactionSafeguardSettings(config);
        expect(settings.enabled).toBe(true);
        expect(settings.minMessages).toBe(5);
        expect(settings.minTokens).toBe(1000);
        expect(settings.maxCompactionRatio).toBe(0.5);
        expect(settings.cooldownSeconds).toBe(60);
      });

      it("should return configured settings when provided", () => {
        const config = {
          agents: {
            compactionSafeguard: {
              enabled: false,
              minMessages: 10,
              minTokens: 2000,
              maxCompactionRatio: 0.6,
              cooldownSeconds: 120,
            },
          },
        };
        const settings = getCompactionSafeguardSettings(config);
        expect(settings.enabled).toBe(false);
        expect(settings.minMessages).toBe(10);
        expect(settings.minTokens).toBe(2000);
        expect(settings.maxCompactionRatio).toBe(0.6);
        expect(settings.cooldownSeconds).toBe(120);
      });
    });

    describe("shouldAllowCompaction", () => {
      it("should allow compaction when all conditions are met", () => {
        const settings = getCompactionSafeguardSettings({});
        const result = shouldAllowCompaction({
          settings,
          messageCount: 10,
          tokenCount: 2000,
        });
        expect(result.allowed).toBe(true);
      });

      it("should disallow compaction when message count is too low", () => {
        const settings = getCompactionSafeguardSettings({});
        const result = shouldAllowCompaction({
          settings,
          messageCount: 3,
          tokenCount: 2000,
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("Not enough messages (3 < 5)");
      });

      it("should disallow compaction when token count is too low", () => {
        const settings = getCompactionSafeguardSettings({});
        const result = shouldAllowCompaction({
          settings,
          messageCount: 10,
          tokenCount: 500,
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("Not enough tokens (500 < 1000)");
      });
    });

    describe("calculateCompactionTarget", () => {
      it("should calculate compaction target based on settings", () => {
        const settings = getCompactionSafeguardSettings({});
        const result = calculateCompactionTarget({
          settings,
          currentTokens: 2000,
          contextWindow: 4096,
        });
        expect(result).toBe(1000); // 2000 * 0.5 = 1000
      });

      it("should respect context window limit", () => {
        const settings = getCompactionSafeguardSettings({});
        const result = calculateCompactionTarget({
          settings,
          currentTokens: 10000,
          contextWindow: 4096,
        });
        expect(result).toBe(3276.8); // 4096 * 0.8 = 3276.8
      });
    });
  });

  describe("Context Pruning", () => {
    describe("getContextPruningSettings", () => {
      it("should return default settings when no config is provided", () => {
        const config = {};
        const settings = getContextPruningSettings(config);
        expect(settings.enabled).toBe(true);
        expect(settings.maxTokens).toBe(10000);
        expect(settings.minMessages).toBe(10);
        expect(settings.pruneRatio).toBe(0.3);
        expect(settings.keepRecentMessages).toBe(5);
        expect(settings.keepImportantMessages).toBe(true);
      });

      it("should return configured settings when provided", () => {
        const config = {
          agents: {
            contextPruning: {
              enabled: false,
              maxTokens: 20000,
              minMessages: 15,
              pruneRatio: 0.4,
              keepRecentMessages: 10,
              keepImportantMessages: false,
            },
          },
        };
        const settings = getContextPruningSettings(config);
        expect(settings.enabled).toBe(false);
        expect(settings.maxTokens).toBe(20000);
        expect(settings.minMessages).toBe(15);
        expect(settings.pruneRatio).toBe(0.4);
        expect(settings.keepRecentMessages).toBe(10);
        expect(settings.keepImportantMessages).toBe(false);
      });
    });

    describe("pruneContext", () => {
      it("should not prune when token count is below threshold", () => {
        const settings = getContextPruningSettings({});
        const messages: Message[] = [
          { id: "1", role: "user", content: "Hello", tokens: 10, timestamp: Date.now() - 10000 },
          { id: "2", role: "assistant", content: "Hi", tokens: 5, timestamp: Date.now() - 9000 },
        ];
        const result = pruneContext({
          messages,
          settings,
          currentTokens: 15,
        });
        expect(result.prunedCount).toBe(0);
        expect(result.prunedTokens).toBe(0);
        expect(result.messages.length).toBe(2);
      });

      it("should prune older messages when token count exceeds threshold", () => {
        const settings = getContextPruningSettings({});
        const messages: Message[] = [
          { id: "1", role: "user", content: "Hello", tokens: 1000, timestamp: Date.now() - 10000 },
          { id: "2", role: "assistant", content: "Hi", tokens: 500, timestamp: Date.now() - 9000 },
          {
            id: "3",
            role: "user",
            content: "How are you?",
            tokens: 1000,
            timestamp: Date.now() - 8000,
          },
          {
            id: "4",
            role: "assistant",
            content: "I'm fine",
            tokens: 500,
            timestamp: Date.now() - 7000,
          },
          {
            id: "5",
            role: "user",
            content: "What's up?",
            tokens: 1000,
            timestamp: Date.now() - 6000,
          },
          {
            id: "6",
            role: "assistant",
            content: "Not much",
            tokens: 500,
            timestamp: Date.now() - 5000,
          },
          {
            id: "7",
            role: "user",
            content: "Let's chat",
            tokens: 1000,
            timestamp: Date.now() - 4000,
          },
          {
            id: "8",
            role: "assistant",
            content: "Okay",
            tokens: 500,
            timestamp: Date.now() - 3000,
          },
          {
            id: "9",
            role: "user",
            content: "Tell me a joke",
            tokens: 1000,
            timestamp: Date.now() - 2000,
          },
          {
            id: "10",
            role: "assistant",
            content: "Why did the chicken cross the road?",
            tokens: 1000,
            timestamp: Date.now() - 1000,
          },
          { id: "11", role: "user", content: "I don't know", tokens: 500, timestamp: Date.now() },
        ];
        const result = pruneContext({
          messages,
          settings,
          currentTokens: 8500, // 超过maxTokens 10000的85%
        });
        expect(result.prunedCount).toBeGreaterThan(0);
        expect(result.prunedTokens).toBeGreaterThan(0);
        expect(result.messages.length).toBeLessThan(11);
      });
    });
  });
});
