import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionKeyManager, SessionKey } from '../key.js';

describe('SessionKeyManager', () => {
  let keyManager: SessionKeyManager;

  beforeEach(() => {
    keyManager = new SessionKeyManager();
  });

  describe('generate', () => {
    it('should generate a session key with required fields', () => {
      const key = keyManager.generate('user123', 'discord');
      
      expect(key).toHaveProperty('id');
      expect(typeof key.id).toBe('string');
      expect(key.userId).toBe('user123');
      expect(key.channel).toBe('discord');
      expect(key.createdAt).toBeGreaterThan(0);
      expect(key.expiresAt).toBeUndefined();
    });

    it('should generate a session key with expiration time when ttl is provided', () => {
      const ttl = 3600000; // 1 hour
      const key = keyManager.generate('user123', 'discord', ttl);
      
      expect(key.expiresAt).toBeDefined();
      expect(key.expiresAt).toBeGreaterThan(key.createdAt);
    });
  });

  describe('validate', () => {
    it('should return true for valid session key', () => {
      const key = keyManager.generate('user123', 'discord');
      expect(keyManager.validate(key)).toBe(true);
    });

    it('should return false for session key with missing fields', () => {
      const invalidKey = { userId: 'user123', channel: 'discord' } as any;
      expect(keyManager.validate(invalidKey)).toBe(false);
    });

    it('should return false for expired session key', () => {
      const key = keyManager.generate('user123', 'discord', -1000); // Expired
      expect(keyManager.validate(key)).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return false for session key without expiration', () => {
      const key = keyManager.generate('user123', 'discord');
      expect(keyManager.isExpired(key)).toBe(false);
    });

    it('should return true for expired session key', () => {
      const key = keyManager.generate('user123', 'discord', -1000); // Expired
      expect(keyManager.isExpired(key)).toBe(true);
    });

    it('should return false for non-expired session key', () => {
      const key = keyManager.generate('user123', 'discord', 3600000); // 1 hour
      expect(keyManager.isExpired(key)).toBe(false);
    });
  });

  describe('extend', () => {
    it('should extend the expiration time of a session key', () => {
      const originalKey = keyManager.generate('user123', 'discord', 3600000);
      const originalExpiresAt = originalKey.expiresAt;
      
      const extendedKey = keyManager.extend(originalKey, 7200000); // 2 hours
      
      expect(extendedKey.expiresAt).toBeGreaterThan(originalExpiresAt!);
      expect(extendedKey.userId).toBe(originalKey.userId);
      expect(extendedKey.channel).toBe(originalKey.channel);
    });
  });

  describe('serialize and deserialize', () => {
    it('should serialize and deserialize session key correctly', () => {
      const originalKey = keyManager.generate('user123', 'discord', 3600000);
      const serialized = keyManager.serialize(originalKey);
      const deserialized = keyManager.deserialize(serialized);
      
      expect(deserialized).toEqual(originalKey);
    });

    it('should throw error for invalid serialized data', () => {
      expect(() => keyManager.deserialize('invalid json')).toThrow('Invalid session key');
    });
  });
});
