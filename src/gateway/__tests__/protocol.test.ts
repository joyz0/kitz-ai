// 先导入 mock-logger，确保在所有其他导入之前
import { getMockLogger, resetMockLogger } from '../../logger/mock-logger.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Protocol, GatewayMessage } from '../protocol.js';

// 获取 mock logger 实例
const mockLogger = getMockLogger();

describe('Protocol', () => {
  let protocol: Protocol;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    resetMockLogger();

    // Create Protocol instance
    protocol = new Protocol();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with logger', () => {
      // 验证 logger 初始化成功
      expect(protocol).toBeDefined();
    });
  });

  describe('serialize', () => {
    it('should serialize message to JSON string', () => {
      const message: GatewayMessage = {
        type: 'test',
        payload: { data: 'test' },
      };

      const serialized = protocol.serialize(message);
      const parsed = JSON.parse(serialized);

      expect(parsed.type).toBe('test');
      expect(parsed.payload).toEqual({ data: 'test' });
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.id).toBeDefined();
    });

    it('should use existing timestamp and id if provided', () => {
      const message: GatewayMessage = {
        type: 'test',
        payload: { data: 'test' },
        timestamp: 1234567890,
        id: 'test-id',
      };

      const serialized = protocol.serialize(message);
      const parsed = JSON.parse(serialized);

      expect(parsed.timestamp).toBe(1234567890);
      expect(parsed.id).toBe('test-id');
    });

    it('should throw error when serialization fails', () => {
      // Create a circular reference to cause JSON.stringify to fail
      const circular: any = { type: 'test' };
      circular.payload = circular;

      expect(() => protocol.serialize(circular)).toThrow(
        'Failed to serialize message',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error serializing message',
        expect.any(Error),
      );
    });
  });

  describe('parse', () => {
    it('should parse JSON string to message object', () => {
      const json = '{"type":"test","payload":{"data":"test"}}';
      const message = protocol.parse(json);

      expect(message.type).toBe('test');
      expect(message.payload).toEqual({ data: 'test' });
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = 'invalid json';
      expect(() => protocol.parse(invalidJson)).toThrow(
        'Failed to parse message',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error parsing message',
        expect.any(Error),
      );
    });

    it('should throw error for missing message type', () => {
      const json = '{"payload":{"data":"test"}}';
      expect(() => protocol.parse(json)).toThrow('Failed to parse message');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error parsing message',
        expect.any(Error),
      );
    });

    it('should throw error for non-string message type', () => {
      const json = '{"type":123,"payload":{"data":"test"}}';
      expect(() => protocol.parse(json)).toThrow('Failed to parse message');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error parsing message',
        expect.any(Error),
      );
    });
  });

  describe('validate', () => {
    it('should return true for valid message', () => {
      const message: GatewayMessage = {
        type: 'test',
        payload: { data: 'test' },
      };

      expect(protocol.validate(message)).toBe(true);
    });

    it('should return false for message without type', () => {
      const message = { payload: { data: 'test' } } as any;
      expect(protocol.validate(message)).toBe(false);
    });

    it('should return false for message with non-string type', () => {
      const message = { type: 123, payload: { data: 'test' } } as any;
      expect(protocol.validate(message)).toBe(false);
    });

    it('should return false for message without payload', () => {
      const message = { type: 'test' } as any;
      expect(protocol.validate(message)).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate a unique id', () => {
      // Access private method using type assertion
      const id1 = (protocol as any).generateId();
      const id2 = (protocol as any).generateId();

      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
    });
  });
});
