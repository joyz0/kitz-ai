import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// 导入 mock-logger 以确保 logger 模块被正确模拟
import { getMockLogger } from "../../../logger/mock-logger.js";
import { SessionStorage, type SessionData } from "../storage.js";
import { SessionKeyManager } from "../key.js";

// 获取 mock logger 实例（确保 mock 生效）
const mockLogger = getMockLogger();

describe("SessionStorage", () => {
  let storage: SessionStorage;
  let keyManager: SessionKeyManager;

  beforeEach(() => {
    storage = new SessionStorage(100); // Short cleanup interval for testing
    keyManager = new SessionKeyManager();
  });

  afterEach(() => {
    storage.close();
  });

  describe("store and get", () => {
    it("should store and retrieve a session", () => {
      const key = keyManager.generate("user123", "discord");
      const session: SessionData = {
        key,
        context: { foo: "bar" },
        messages: [{ role: "user", content: "Hello", timestamp: Date.now() }],
        metadata: { test: "metadata" },
        lastAccessed: Date.now(),
      };

      storage.store(session);
      const retrieved = storage.get(key.id);

      expect(retrieved).toEqual(session);
    });

    it("should return undefined for non-existent session", () => {
      expect(storage.get("non-existent")).toBeUndefined();
    });

    it("should update lastAccessed when retrieving a session", () => {
      const key = keyManager.generate("user123", "discord");
      const session: SessionData = {
        key,
        context: {},
        messages: [],
        metadata: {},
        lastAccessed: Date.now() - 1000,
      };

      storage.store(session);
      const beforeAccess = session.lastAccessed;
      const retrieved = storage.get(key.id);

      expect(retrieved?.lastAccessed).toBeGreaterThan(beforeAccess);
    });
  });

  describe("delete", () => {
    it("should delete a session", () => {
      const key = keyManager.generate("user123", "discord");
      const session: SessionData = {
        key,
        context: {},
        messages: [],
        metadata: {},
        lastAccessed: Date.now(),
      };

      storage.store(session);
      const deleted = storage.delete(key.id);
      const retrieved = storage.get(key.id);

      expect(deleted).toBe(true);
      expect(retrieved).toBeUndefined();
    });

    it("should return false when deleting non-existent session", () => {
      expect(storage.delete("non-existent")).toBe(false);
    });
  });

  describe("update", () => {
    it("should update a session", () => {
      const key = keyManager.generate("user123", "discord");
      const session: SessionData = {
        key,
        context: { foo: "bar" },
        messages: [],
        metadata: {},
        lastAccessed: Date.now(),
      };

      storage.store(session);
      const updated = storage.update(key.id, (s) => ({
        ...s,
        context: { foo: "updated" },
      }));

      expect(updated?.context).toEqual({ foo: "updated" });
      expect(updated?.lastAccessed).toBeGreaterThan(session.lastAccessed);
    });

    it("should return undefined when updating non-existent session", () => {
      const result = storage.update("non-existent", (s) => s);
      expect(result).toBeUndefined();
    });
  });

  describe("addMessage", () => {
    it("should add a message to a session", () => {
      const key = keyManager.generate("user123", "discord");
      const session: SessionData = {
        key,
        context: {},
        messages: [],
        metadata: {},
        lastAccessed: Date.now(),
      };

      storage.store(session);
      const updated = storage.addMessage(key.id, "user", "Hello");

      expect(updated?.messages).toHaveLength(1);
      expect(updated?.messages[0].content).toBe("Hello");
      expect(updated?.messages[0].role).toBe("user");
    });
  });

  describe("updateContext", () => {
    it("should update the context of a session", () => {
      const key = keyManager.generate("user123", "discord");
      const session: SessionData = {
        key,
        context: { foo: "bar" },
        messages: [],
        metadata: {},
        lastAccessed: Date.now(),
      };

      storage.store(session);
      const updated = storage.updateContext(key.id, { foo: "updated", baz: "new" });

      expect(updated?.context).toEqual({ foo: "updated", baz: "new" });
    });
  });

  describe("getAll and getCount", () => {
    it("should return all sessions and count", () => {
      const key1 = keyManager.generate("user123", "discord");
      const key2 = keyManager.generate("user456", "slack");

      storage.store({
        key: key1,
        context: {},
        messages: [],
        metadata: {},
        lastAccessed: Date.now(),
      });

      storage.store({
        key: key2,
        context: {},
        messages: [],
        metadata: {},
        lastAccessed: Date.now(),
      });

      expect(storage.getCount()).toBe(2);
      expect(storage.getAll()).toHaveLength(2);
    });
  });

  describe("cleanupExpired", () => {
    it("should remove expired sessions", () => {
      const validKey = keyManager.generate("user123", "discord", 3600000); // 1 hour
      const expiredKey = keyManager.generate("user456", "slack", -1000); // Expired

      storage.store({
        key: validKey,
        context: {},
        messages: [],
        metadata: {},
        lastAccessed: Date.now(),
      });

      storage.store({
        key: expiredKey,
        context: {},
        messages: [],
        metadata: {},
        lastAccessed: Date.now(),
      });

      const deleted = storage.cleanupExpired();
      expect(deleted).toBe(1);
      expect(storage.getCount()).toBe(1);
      expect(storage.get(validKey.id)).toBeDefined();
      expect(storage.get(expiredKey.id)).toBeUndefined();
    });
  });

  describe("cleanupIdle", () => {
    it("should remove idle sessions", () => {
      const recentKey = keyManager.generate("user123", "discord");
      const idleKey = keyManager.generate("user456", "slack");

      storage.store({
        key: recentKey,
        context: {},
        messages: [],
        metadata: {},
        lastAccessed: Date.now(),
      });

      storage.store({
        key: idleKey,
        context: {},
        messages: [],
        metadata: {},
        lastAccessed: Date.now() - 3600000, // 1 hour ago
      });

      const deleted = storage.cleanupIdle(1800000); // 30 minutes
      expect(deleted).toBe(1);
      expect(storage.getCount()).toBe(1);
      expect(storage.get(recentKey.id)).toBeDefined();
      expect(storage.get(idleKey.id)).toBeUndefined();
    });
  });
});
