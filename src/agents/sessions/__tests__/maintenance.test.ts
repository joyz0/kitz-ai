import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// 导入 mock-logger 以确保 logger 模块被正确模拟
import { getMockLogger } from '../../../logger/mock-logger.js';
import { SessionMaintenance } from '../maintenance.js';
import { SessionStorage, SessionData } from '../storage.js';
import { SessionKeyManager } from '../key.js';

// 获取 mock logger 实例（确保 mock 生效）
const mockLogger = getMockLogger();

describe('SessionMaintenance', () => {
  let maintenance: SessionMaintenance;
  let storage: SessionStorage;
  let keyManager: SessionKeyManager;

  beforeEach(() => {
    storage = new SessionStorage(100); // Short cleanup interval for testing
    maintenance = new SessionMaintenance(storage, 100); // Short maintenance interval for testing
    keyManager = new SessionKeyManager();
  });

  afterEach(() => {
    maintenance.stop();
    storage.close();
  });

  describe('start and stop', () => {
    it('should start and stop maintenance', () => {
      maintenance.start();
      // Maintenance should be running
      maintenance.stop();
      // Maintenance should be stopped
    });
  });

  describe('performMaintenance', () => {
    it('should clean up expired and idle sessions', () => {
      const validKey = keyManager.generate('user123', 'discord', 3600000); // 1 hour
      const expiredKey = keyManager.generate('user456', 'slack', -1000); // Expired
      const idleKey = keyManager.generate('user789', 'telegram');

      // Store valid session
      storage.store({
        key: validKey,
        context: {},
        messages: [],
        metadata: {},
        lastAccessed: Date.now()
      });

      // Store expired session
      storage.store({
        key: expiredKey,
        context: {},
        messages: [],
        metadata: {},
        lastAccessed: Date.now()
      });

      // Store idle session
      storage.store({
        key: idleKey,
        context: {},
        messages: [],
        metadata: {},
        lastAccessed: Date.now() - 3600000 // 1 hour ago
      });

      // Perform maintenance
      maintenance.performMaintenance();

      // Only valid session should remain
      expect(storage.getCount()).toBe(1);
      expect(storage.get(validKey.id)).toBeDefined();
      expect(storage.get(expiredKey.id)).toBeUndefined();
      expect(storage.get(idleKey.id)).toBeUndefined();
    });

    it('should compact sessions with too many messages', () => {
      const key = keyManager.generate('user123', 'discord');
      const messages = Array.from({ length: 150 }, (_, i) => ({
        role: 'user' as const,
        content: `Message ${i}`,
        timestamp: Date.now() - i * 1000
      }));

      const session: SessionData = {
        key,
        context: {},
        messages,
        metadata: {},
        lastAccessed: Date.now()
      };

      storage.store(session);
      maintenance.performMaintenance();

      const compactedSession = storage.get(key.id);
      expect(compactedSession?.messages).toHaveLength(50); // Should be compacted to 50 messages
      expect(compactedSession?.metadata.compacted).toBe(true);
      expect(compactedSession?.metadata.originalMessageCount).toBe(150);
    });
  });

  describe('getStats', () => {
    it('should return maintenance statistics', () => {
      const key = keyManager.generate('user123', 'discord');
      storage.store({
        key,
        context: {},
        messages: [],
        metadata: {},
        lastAccessed: Date.now()
      });

      const stats = maintenance.getStats();
      expect(stats.totalSessions).toBe(1);
      expect(stats.maintenanceIntervalMs).toBe(100);
    });
  });

  describe('triggerMaintenance', () => {
    it('should trigger maintenance manually', () => {
      const expiredKey = keyManager.generate('user456', 'slack', -1000); // Expired

      storage.store({
        key: expiredKey,
        context: {},
        messages: [],
        metadata: {},
        lastAccessed: Date.now()
      });

      maintenance.triggerMaintenance();
      expect(storage.get(expiredKey.id)).toBeUndefined();
    });
  });
});
