// 先导入 mock-logger，确保在所有其他导入之前
import { getMockLogger, resetMockLogger } from '../../logger/mock-logger.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventManager } from '../events.js';
import { GatewayMessage } from '../protocol.js';

// 获取 mock logger 实例
const mockLogger = getMockLogger();

describe('EventManager', () => {
  let eventManager: EventManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    resetMockLogger();

    // Create EventManager instance
    eventManager = new EventManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default handlers', () => {
      const registeredTypes = eventManager.getRegisteredEventTypes();
      expect(registeredTypes).toContain('ping');
      expect(registeredTypes).toContain('echo');
    });
  });

  describe('registerHandler', () => {
    it('should register a new event handler', () => {
      const handler = vi.fn().mockResolvedValue({ result: 'test' });
      eventManager.registerHandler('test', handler);

      expect(eventManager.getRegisteredEventTypes()).toContain('test');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Registered handler for event type: test',
      );
    });

    it('should override existing event handler', () => {
      const originalHandler = vi.fn().mockResolvedValue({ result: 'original' });
      const newHandler = vi.fn().mockResolvedValue({ result: 'new' });

      eventManager.registerHandler('test', originalHandler);
      eventManager.registerHandler('test', newHandler);

      expect(eventManager.getRegisteredEventTypes()).toContain('test');
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleEvent', () => {
    it('should handle event with registered handler', async () => {
      const handler = vi.fn().mockResolvedValue({ result: 'test' });
      eventManager.registerHandler('test', handler);

      const message: GatewayMessage = {
        type: 'test',
        payload: { data: 'test' },
      };

      const response = await eventManager.handleEvent(message);

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
      expect(response).toEqual({
        type: 'test_response',
        payload: { result: 'test' },
      });
    });

    it('should handle ping event', async () => {
      const message: GatewayMessage = {
        type: 'ping',
        payload: {},
      };

      const response = await eventManager.handleEvent(message);

      expect(response).toEqual({
        type: 'ping_response',
        payload: { message: 'pong' },
      });
    });

    it('should handle echo event', async () => {
      const message: GatewayMessage = {
        type: 'echo',
        payload: { message: 'test message' },
      };

      const response = await eventManager.handleEvent(message);

      expect(response).toEqual({
        type: 'echo_response',
        payload: { message: 'test message' },
      });
    });

    it('should return error for unknown event type', async () => {
      const message: GatewayMessage = {
        type: 'unknown',
        payload: {},
      };

      const response = await eventManager.handleEvent(message);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No handler found for event type: unknown',
      );
      expect(response).toEqual({
        type: 'error',
        payload: { message: 'Unknown event type: unknown' },
      });
    });

    it('should return error when handler throws', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      eventManager.registerHandler('test', handler);

      const message: GatewayMessage = {
        type: 'test',
        payload: {},
      };

      const response = await eventManager.handleEvent(message);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error handling event',
        expect.any(Error),
      );
      expect(response).toEqual({
        type: 'error',
        payload: { message: 'Failed to handle event' },
      });
    });
  });

  describe('getRegisteredEventTypes', () => {
    it('should return all registered event types', () => {
      eventManager.registerHandler('test1', vi.fn());
      eventManager.registerHandler('test2', vi.fn());

      const registeredTypes = eventManager.getRegisteredEventTypes();
      expect(registeredTypes).toContain('ping');
      expect(registeredTypes).toContain('echo');
      expect(registeredTypes).toContain('test1');
      expect(registeredTypes).toContain('test2');
    });

    it('should return empty array when no handlers are registered', () => {
      // Remove all handlers
      eventManager.removeHandler('ping');
      eventManager.removeHandler('echo');

      const registeredTypes = eventManager.getRegisteredEventTypes();
      expect(registeredTypes).toEqual([]);
    });
  });

  describe('removeHandler', () => {
    it('should remove existing event handler', () => {
      eventManager.registerHandler('test', vi.fn());
      expect(eventManager.getRegisteredEventTypes()).toContain('test');

      eventManager.removeHandler('test');
      expect(eventManager.getRegisteredEventTypes()).not.toContain('test');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Removed handler for event type: test',
      );
    });

    it('should handle removing non-existent handler', () => {
      eventManager.removeHandler('non-existent');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Removed handler for event type: non-existent',
      );
    });
  });
});
