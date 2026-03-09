import { describe, it, expect, vi, beforeEach } from "vitest";
// 导入 mock-logger 以确保 logger 模块被正确模拟
import { getMockLogger } from "../../../logger/mock-logger.js";
import { SessionCompaction } from "../compaction.js";
import { type SessionData } from "../storage.js";
import { SessionKeyManager } from "../key.js";

// 获取 mock logger 实例（确保 mock 生效）
const mockLogger = getMockLogger();

describe("SessionCompaction", () => {
  let compaction: SessionCompaction;
  let keyManager: SessionKeyManager;

  beforeEach(() => {
    compaction = new SessionCompaction();
    keyManager = new SessionKeyManager();
  });

  describe("compact", () => {
    it("should compact a session with too many messages", () => {
      const key = keyManager.generate("user123", "discord");
      const messages = Array.from({ length: 100 }, (_, i) => ({
        role: "user" as const,
        content: `Message ${i}`,
        timestamp: Date.now() - i * 1000,
      }));

      const session: SessionData = {
        key,
        context: {},
        messages,
        metadata: {},
        lastAccessed: Date.now(),
      };

      const compacted = compaction.compact(session, { maxMessages: 50 });
      expect(compacted.messages).toHaveLength(50);
      expect(compacted.metadata.compacted).toBe(true);
      expect(compacted.metadata.originalMessageCount).toBe(100);
      expect(compacted.metadata.compactedMessageCount).toBe(50);
    });

    it("should preserve system messages during compaction", () => {
      const key = keyManager.generate("user123", "discord");
      const messages = [
        { role: "system" as const, content: "System message 1", timestamp: Date.now() - 10000 },
        ...Array.from({ length: 60 }, (_, i) => ({
          role: "user" as const,
          content: `User message ${i}`,
          timestamp: Date.now() - i * 1000,
        })),
      ];

      const session: SessionData = {
        key,
        context: {},
        messages,
        metadata: {},
        lastAccessed: Date.now(),
      };

      const compacted = compaction.compact(session, {
        maxMessages: 50,
        preserveSystemMessages: true,
      });
      // Should have 1 system message + 50 user messages = 51 messages
      expect(compacted.messages).toHaveLength(51);
      expect(compacted.messages[0].role).toBe("system");
    });

    it("should not compact sessions with fewer messages than the limit", () => {
      const key = keyManager.generate("user123", "discord");
      const messages = Array.from({ length: 30 }, (_, i) => ({
        role: "user" as const,
        content: `Message ${i}`,
        timestamp: Date.now() - i * 1000,
      }));

      const session: SessionData = {
        key,
        context: {},
        messages,
        metadata: {},
        lastAccessed: Date.now(),
      };

      const compacted = compaction.compact(session, { maxMessages: 50 });
      expect(compacted.messages).toHaveLength(30);
      expect(compacted.metadata.compacted).toBeUndefined();
    });
  });

  describe("smartCompact", () => {
    it("should compact old sessions more aggressively", () => {
      const key = keyManager.generate("user123", "discord");
      // Create a session that's 8 days old
      const oldKey = { ...key, createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000 };
      const messages = Array.from({ length: 100 }, (_, i) => ({
        role: "user" as const,
        content: `Message ${i}`,
        timestamp: Date.now() - i * 1000,
      }));

      const session: SessionData = {
        key: oldKey,
        context: {},
        messages,
        metadata: {},
        lastAccessed: Date.now(),
      };

      const compacted = compaction.smartCompact(session);
      // Should be compacted to 20 messages for old sessions
      expect(compacted.messages).toHaveLength(20);
    });

    it("should compact sessions with very many messages more aggressively", () => {
      const key = keyManager.generate("user123", "discord");
      const messages = Array.from({ length: 600 }, (_, i) => ({
        role: "user" as const,
        content: `Message ${i}`,
        timestamp: Date.now() - i * 1000,
      }));

      const session: SessionData = {
        key,
        context: {},
        messages,
        metadata: {},
        lastAccessed: Date.now(),
      };

      const compacted = compaction.smartCompact(session);
      // Should be compacted to fewer messages for very large sessions
      expect(compacted.messages.length).toBeLessThan(50);
    });
  });

  describe("calculateSize", () => {
    it("should calculate the size of a session", () => {
      const key = keyManager.generate("user123", "discord");
      const session: SessionData = {
        key,
        context: {},
        messages: [{ role: "user", content: "Hello", timestamp: Date.now() }],
        metadata: {},
        lastAccessed: Date.now(),
      };

      const size = compaction.calculateSize(session);
      expect(size).toBeGreaterThan(0);
    });
  });

  describe("needsCompaction", () => {
    it("should return true for sessions that need compaction", () => {
      const key = keyManager.generate("user123", "discord");
      const messages = Array.from({ length: 150 }, (_, i) => ({
        role: "user" as const,
        content: `Message ${i}`,
        timestamp: Date.now() - i * 1000,
      }));

      const session: SessionData = {
        key,
        context: {},
        messages,
        metadata: {},
        lastAccessed: Date.now(),
      };

      expect(compaction.needsCompaction(session)).toBe(true);
    });

    it("should return false for sessions that do not need compaction", () => {
      const key = keyManager.generate("user123", "discord");
      const messages = Array.from({ length: 50 }, (_, i) => ({
        role: "user" as const,
        content: `Message ${i}`,
        timestamp: Date.now() - i * 1000,
      }));

      const session: SessionData = {
        key,
        context: {},
        messages,
        metadata: {},
        lastAccessed: Date.now(),
      };

      expect(compaction.needsCompaction(session)).toBe(false);
    });
  });

  describe("compactBatch", () => {
    it("should compact multiple sessions", () => {
      const key1 = keyManager.generate("user123", "discord");
      const key2 = keyManager.generate("user456", "slack");

      const session1: SessionData = {
        key: key1,
        context: {},
        messages: Array.from({ length: 150 }, (_, i) => ({
          role: "user" as const,
          content: `Message ${i}`,
          timestamp: Date.now() - i * 1000,
        })),
        metadata: {},
        lastAccessed: Date.now(),
      };

      const session2: SessionData = {
        key: key2,
        context: {},
        messages: Array.from({ length: 30 }, (_, i) => ({
          role: "user" as const,
          content: `Message ${i}`,
          timestamp: Date.now() - i * 1000,
        })),
        metadata: {},
        lastAccessed: Date.now(),
      };

      const compactedSessions = compaction.compactBatch([session1, session2]);
      expect(compactedSessions[0].messages).toHaveLength(50);
      expect(compactedSessions[1].messages).toHaveLength(30); // Should not be compacted
    });
  });
});
