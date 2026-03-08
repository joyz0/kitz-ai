// 先导入 mock-logger，确保在所有其他导入之前
import { getMockLogger, resetMockLogger } from '../../logger/mock-logger.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GatewayServer } from '../server.js';
import { WebSocketServer } from 'ws';
import { Protocol } from '../protocol.js';
import { AuthManager } from '../auth.js';
import { EventManager } from '../events.js';

// 获取 mock logger 实例
const mockLogger = getMockLogger();

// Mock dependencies
vi.mock('ws');
vi.mock('../protocol.js');
vi.mock('../auth.js');
vi.mock('../events.js');

const mockWebSocketServer = vi.mocked(WebSocketServer);
const mockProtocol = vi.mocked(Protocol);
const mockAuthManager = vi.mocked(AuthManager);
const mockEventManager = vi.mocked(EventManager);

describe('GatewayServer', () => {
  let gatewayServer: GatewayServer;
  let mockWssInstance: any;
  let mockProtocolInstance: any;
  let mockAuthManagerInstance: any;
  let mockEventManagerInstance: any;
  let mockWsInstance: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    resetMockLogger();

    // Create mock WebSocket instance
    mockWsInstance = {
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
    };

    // Create mock WebSocketServer instance
    mockWssInstance = {
      on: vi.fn(),
      close: vi.fn(),
    };

    // Create mock protocol instance
    mockProtocolInstance = {
      parse: vi
        .fn()
        .mockReturnValue({ type: 'test', payload: { token: 'default-token' } }),
      serialize: vi.fn().mockReturnValue('serialized-message'),
    };

    // Create mock auth manager instance
    mockAuthManagerInstance = {
      authenticate: vi.fn().mockResolvedValue(true),
    };

    // Create mock event manager instance
    mockEventManagerInstance = {
      handleEvent: vi.fn().mockResolvedValue({
        type: 'test_response',
        payload: { result: 'test' },
      }),
    };

    // Set up mock constructors
    mockWebSocketServer.mockImplementation(function () {
      return mockWssInstance;
    });
    mockProtocol.mockImplementation(function () {
      return mockProtocolInstance;
    });
    mockAuthManager.mockImplementation(function () {
      return mockAuthManagerInstance;
    });
    mockEventManager.mockImplementation(function () {
      return mockEventManagerInstance;
    });

    // Create GatewayServer instance
    gatewayServer = new GatewayServer(8080);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(mockWebSocketServer).toHaveBeenCalledWith({ port: 8080 });
      expect(mockProtocol).toHaveBeenCalled();
      expect(mockAuthManager).toHaveBeenCalled();
      expect(mockEventManager).toHaveBeenCalled();
    });

    it('should set up event handlers', () => {
      expect(mockWssInstance.on).toHaveBeenCalledWith(
        'connection',
        expect.any(Function),
      );
      expect(mockWssInstance.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
      expect(mockWssInstance.on).toHaveBeenCalledWith(
        'listening',
        expect.any(Function),
      );
    });
  });

  describe('handleMessage', () => {
    it('should handle message successfully', async () => {
      // Simulate connection event to get the message handler
      let messageHandler: Function;
      mockWssInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'connection') {
            // Call the callback to set up the message handler
            callback(mockWsInstance, {});
          }
        },
      );

      // Recreate server to trigger connection event
      gatewayServer = new GatewayServer(8080);

      // Get the message handler from the WebSocket instance
      let wsMessageHandler: Function;
      mockWsInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'message') {
            wsMessageHandler = callback;
          }
        },
      );

      // Simulate message reception
      const messageBuffer = Buffer.from('test message');
      await wsMessageHandler!(messageBuffer);

      expect(mockProtocolInstance.parse).toHaveBeenCalledWith('test message');
      expect(mockAuthManagerInstance.authenticate).toHaveBeenCalled();
      expect(mockEventManagerInstance.handleEvent).toHaveBeenCalled();
      expect(mockProtocolInstance.serialize).toHaveBeenCalled();
      expect(mockWsInstance.send).toHaveBeenCalledWith('serialized-message');
    });

    it('should handle authentication failure', async () => {
      // Mock authentication to fail
      mockAuthManagerInstance.authenticate.mockResolvedValue(false);

      // Simulate connection event
      let wsMessageHandler: Function;
      mockWssInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'connection') {
            callback(mockWsInstance, {});
          }
        },
      );

      // Recreate server
      gatewayServer = new GatewayServer(8080);

      // Get message handler
      mockWsInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'message') {
            wsMessageHandler = callback;
          }
        },
      );

      // Simulate message reception
      const messageBuffer = Buffer.from('test message');
      await wsMessageHandler!(messageBuffer);

      expect(mockAuthManagerInstance.authenticate).toHaveBeenCalled();
      expect(mockEventManagerInstance.handleEvent).not.toHaveBeenCalled();
      expect(mockWsInstance.send).toHaveBeenCalled();
    });

    it('should handle message processing error', async () => {
      // Mock parse to throw error
      mockProtocolInstance.parse.mockImplementation(() => {
        throw new Error('Parse error');
      });

      // Simulate connection event
      let wsMessageHandler: Function;
      mockWssInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'connection') {
            callback(mockWsInstance, {});
          }
        },
      );

      // Recreate server
      gatewayServer = new GatewayServer(8080);

      // Get message handler
      mockWsInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'message') {
            wsMessageHandler = callback;
          }
        },
      );

      // Simulate message reception
      const messageBuffer = Buffer.from('test message');
      await wsMessageHandler!(messageBuffer);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error handling message',
        expect.any(Error),
      );
      expect(mockWsInstance.send).toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('should start the server', () => {
      gatewayServer.start();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting gateway server...',
      );
    });
  });

  describe('stop', () => {
    it('should stop the server', () => {
      gatewayServer.stop();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Stopping gateway server...',
      );
      expect(mockWssInstance.close).toHaveBeenCalled();
    });
  });

  describe('connection events', () => {
    it('should handle connection close', () => {
      // Simulate connection event
      mockWssInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'connection') {
            callback(mockWsInstance, {});
          }
        },
      );

      // Recreate server
      gatewayServer = new GatewayServer(8080);

      // Get close handler
      let closeHandler: Function;
      mockWsInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'close') {
            closeHandler = callback;
          }
        },
      );

      // Simulate close event
      closeHandler!();

      expect(mockLogger.info).toHaveBeenCalledWith('Connection closed');
    });

    it('should handle connection error', () => {
      // Simulate connection event
      mockWssInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'connection') {
            callback(mockWsInstance, {});
          }
        },
      );

      // Recreate server
      gatewayServer = new GatewayServer(8080);

      // Get error handler
      let errorHandler: Function;
      mockWsInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'error') {
            errorHandler = callback;
          }
        },
      );

      // Simulate error event
      const error = new Error('Connection error');
      errorHandler!(error);

      expect(mockLogger.error).toHaveBeenCalledWith('Connection error', error);
    });

    it('should handle server error', () => {
      // Get server error handler
      let serverErrorHandler: Function;
      mockWssInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'error') {
            serverErrorHandler = callback;
          }
        },
      );

      // Recreate server
      gatewayServer = new GatewayServer(8080);

      // Simulate server error event
      const error = new Error('Server error');
      serverErrorHandler!(error);

      expect(mockLogger.error).toHaveBeenCalledWith('Server error', error);
    });

    it('should handle server listening', () => {
      // Get listening handler
      let listeningHandler: Function;
      mockWssInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'listening') {
            listeningHandler = callback;
          }
        },
      );

      // Recreate server
      gatewayServer = new GatewayServer(8080);

      // Simulate listening event
      listeningHandler!();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Gateway server listening on port 8080',
      );
    });
  });
});
