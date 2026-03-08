// 先导入 mock-logger，确保在所有其他导入之前
import { getMockLogger, resetMockLogger } from '../../logger/mock-logger.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GatewayClient } from '../client.js';
import WebSocket from 'ws';
import { Protocol } from '../protocol.js';

// Mock dependencies
vi.mock('ws');
vi.mock('../protocol.js');

const mockWebSocket = vi.mocked(WebSocket);
const mockProtocol = vi.mocked(Protocol);
const mockLogger = getMockLogger();

describe('GatewayClient', () => {
  let gatewayClient: GatewayClient;
  let mockWebSocketInstance: any;
  let mockProtocolInstance: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    resetMockLogger();

    // Create mock WebSocket instance
    mockWebSocketInstance = {
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
    };

    // Create mock protocol instance
    mockProtocolInstance = {
      serialize: vi.fn().mockReturnValue('serialized-message'),
      parse: vi.fn().mockReturnValue({ type: 'test', payload: {} }),
    };

    // Set up mock constructors
    mockWebSocket.mockImplementation(function () {
      return mockWebSocketInstance;
    });
    mockProtocol.mockImplementation(function () {
      return mockProtocolInstance;
    });

    // Create GatewayClient instance
    gatewayClient = new GatewayClient('ws://localhost:8080', 'test-token');
    // 设置mock WebSocket实例
    (gatewayClient as any).setWebSocket(mockWebSocketInstance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(mockProtocol).toHaveBeenCalled();
    });
  });

  describe('connect', () => {
    it('should connect to server successfully', async () => {
      // Set up mock WebSocket events
      let openCallback: Function;
      mockWebSocketInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'open') {
            openCallback = callback;
          }
        },
      );

      const connectPromise = gatewayClient.connect();

      // Simulate WebSocket open event
      openCallback!();

      await connectPromise;

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connected to gateway server',
      );
      expect(mockWebSocket).toHaveBeenCalledWith('ws://localhost:8080');
    });

    it('should handle connection error', async () => {
      mockWebSocket.mockImplementation(() => {
        throw new Error('Connection error');
      });

      await expect(gatewayClient.connect()).rejects.toThrow('Connection error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect',
        expect.any(Error),
      );
    });

    it('should handle WebSocket error', async () => {
      // Set up mock WebSocket events
      let errorCallback: Function;
      mockWebSocketInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'error') {
            errorCallback = callback;
          }
        },
      );

      const connectPromise = gatewayClient.connect();

      // Simulate WebSocket error event
      const error = new Error('WebSocket error');
      errorCallback!(error);

      await expect(connectPromise).rejects.toThrow('WebSocket error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'WebSocket error',
        error,
      );
    });
  });

  describe('send', () => {
    it('should send message when connected', () => {
      gatewayClient.send('test', { data: 'test' });

      expect(mockProtocolInstance.serialize).toHaveBeenCalledWith({
        type: 'test',
        payload: {
          data: 'test',
          token: 'test-token',
        },
      });
      expect(mockWebSocketInstance.send).toHaveBeenCalledWith(
        'serialized-message',
      );
    });

    it('should not send message when not connected', () => {
      // Set WebSocket to closed state
      mockWebSocketInstance.readyState = WebSocket.CLOSED;

      gatewayClient.send('test', { data: 'test' });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cannot send message: not connected',
      );
      expect(mockProtocolInstance.serialize).not.toHaveBeenCalled();
    });

    it('should handle serialization error', () => {
      mockProtocolInstance.serialize.mockImplementation(() => {
        throw new Error('Serialization error');
      });

      gatewayClient.send('test', { data: 'test' });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error sending message',
        expect.any(Error),
      );
    });
  });

  describe('on', () => {
    it('should register message handler', () => {
      const handler = vi.fn();
      gatewayClient.on('test', handler);

      // Simulate message reception
      const messageBuffer = Buffer.from('test message');
      // Access private method using type assertion
      (gatewayClient as any).handleMessage(messageBuffer);

      expect(handler).toHaveBeenCalledWith({ type: 'test', payload: {} });
    });

    it('should handle multiple handlers for same type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      gatewayClient.on('test', handler1);
      gatewayClient.on('test', handler2);

      // Simulate message reception
      const messageBuffer = Buffer.from('test message');
      (gatewayClient as any).handleMessage(messageBuffer);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket connection', () => {
      gatewayClient.disconnect();

      expect(mockWebSocketInstance.close).toHaveBeenCalled();
    });

    it('should handle null WebSocket', () => {
      // Set WebSocket to null
      (gatewayClient as any).ws = null;

      gatewayClient.disconnect();

      expect(mockWebSocketInstance.close).not.toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    it('should handle message successfully', () => {
      const handler = vi.fn();
      gatewayClient.on('test', handler);

      const messageBuffer = Buffer.from('test message');
      (gatewayClient as any).handleMessage(messageBuffer);

      expect(mockProtocolInstance.parse).toHaveBeenCalledWith('test message');
      expect(handler).toHaveBeenCalledWith({ type: 'test', payload: {} });
    });

    it('should handle parse error', () => {
      mockProtocolInstance.parse.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const messageBuffer = Buffer.from('test message');
      (gatewayClient as any).handleMessage(messageBuffer);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error handling message',
        expect.any(Error),
      );
    });

    it('should handle handler error', () => {
      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      gatewayClient.on('test', handler);

      const messageBuffer = Buffer.from('test message');
      (gatewayClient as any).handleMessage(messageBuffer);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in message handler',
        expect.any(Error),
      );
    });
  });

  describe('attemptReconnect', () => {
    it('should attempt reconnect', async () => {
      // Set up mock connect method
      const mockConnect = vi
        .spyOn(gatewayClient, 'connect')
        .mockResolvedValue(undefined);

      // Set reconnect attempts
      (gatewayClient as any).reconnectAttempts = 1;

      // Mock setTimeout
      const mockSetTimeout = vi
        .spyOn(global, 'setTimeout')
        .mockImplementation((callback) => {
          callback();
          return 1 as any;
        });

      (gatewayClient as any).attemptReconnect();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Attempting to reconnect in 1000ms (2/5)',
      );
      expect(mockConnect).toHaveBeenCalled();

      mockSetTimeout.mockRestore();
    });

    it('should stop reconnecting after max attempts', () => {
      // Set max reconnect attempts
      (gatewayClient as any).reconnectAttempts = 5;

      (gatewayClient as any).attemptReconnect();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Max reconnect attempts reached',
      );
    });
  });

  describe('isConnected', () => {
    it('should return true when connected', () => {
      mockWebSocketInstance.readyState = WebSocket.OPEN;
      expect(gatewayClient.isConnected()).toBe(true);
    });

    it('should return false when not connected', () => {
      mockWebSocketInstance.readyState = WebSocket.CLOSED;
      expect(gatewayClient.isConnected()).toBe(false);
    });

    it('should return false when WebSocket is null', () => {
      (gatewayClient as any).ws = null;
      expect(gatewayClient.isConnected()).toBe(false);
    });
  });
});
