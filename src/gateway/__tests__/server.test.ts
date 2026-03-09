// 先导入 mock-logger，确保在所有其他导入之前
import { getMockLogger, resetMockLogger } from "../../logger/mock-logger.js";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GatewayServer } from "../server.js";
import { WebSocketServer } from "ws";
import { Protocol } from "../protocol.js";
import { AuthManager } from "../auth.js";
import { EventManager } from "../events.js";

// 获取 mock logger 实例
const mockLogger = getMockLogger();

// Mock dependencies
vi.mock("ws");
vi.mock("../protocol.js");
vi.mock("../auth.js");
vi.mock("../events.js");

const mockWebSocketServer = vi.mocked(WebSocketServer);
const mockProtocol = vi.mocked(Protocol);
const mockAuthManager = vi.mocked(AuthManager);
const mockEventManager = vi.mocked(EventManager);

describe("GatewayServer", () => {
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
        .mockReturnValue({ type: "test", payload: { token: "default-token" } }),
      serialize: vi.fn().mockReturnValue("serialized-message"),
    };

    // Create mock auth manager instance
    mockAuthManagerInstance = {
      authenticate: vi.fn().mockResolvedValue(true),
    };

    // Create mock event manager instance
    mockEventManagerInstance = {
      handleEvent: vi.fn().mockResolvedValue({
        type: "test_response",
        payload: { result: "test" },
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

    // 暂时不创建 GatewayServer 实例，在每个测试用例中根据需要创建
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with correct parameters", () => {
      // Create server instance
      gatewayServer = new GatewayServer(8080);
      expect(mockWebSocketServer).toHaveBeenCalledWith({ port: 8080 });
      expect(mockProtocol).toHaveBeenCalled();
      expect(mockAuthManager).toHaveBeenCalled();
      expect(mockEventManager).toHaveBeenCalled();
    });

    it("should set up event handlers", () => {
      // Create server instance
      gatewayServer = new GatewayServer(8080);
      expect(mockWssInstance.on).toHaveBeenCalledWith(
        "connection",
        expect.any(Function)
      );
      expect(mockWssInstance.on).toHaveBeenCalledWith(
        "error",
        expect.any(Function)
      );
      expect(mockWssInstance.on).toHaveBeenCalledWith(
        "listening",
        expect.any(Function)
      );
    });
  });

  describe("handleMessage", () => {
    it("should handle message successfully", async () => {
      // 模拟 WebSocket 实例
      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
      };

      // 创建服务器实例
      gatewayServer = new GatewayServer(8080);

      // 直接访问私有方法进行测试
      // @ts-ignore - 允许访问私有方法
      await gatewayServer.handleMessage(mockWs, Buffer.from("test message"));

      // 验证所有方法都被调用
      expect(mockProtocolInstance.parse).toHaveBeenCalledWith("test message");
      expect(mockAuthManagerInstance.authenticate).toHaveBeenCalled();
      expect(mockEventManagerInstance.handleEvent).toHaveBeenCalled();
      expect(mockProtocolInstance.serialize).toHaveBeenCalled();
      expect(mockWs.send).toHaveBeenCalledWith("serialized-message");
    });

    it("should handle authentication failure", async () => {
      // Mock authentication to fail
      mockAuthManagerInstance.authenticate.mockResolvedValue(false);

      // Get message handler
      let wsMessageHandler: ((data: Buffer) => Promise<void>) | undefined =
        undefined;
      mockWsInstance.on.mockImplementation((event: string, callback: any) => {
        if (event === "message") {
          wsMessageHandler = callback;
        }
      });

      // Simulate connection event
      mockWssInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === "connection") {
            callback(mockWsInstance, {});
          }
        }
      );

      // Create server
      gatewayServer = new GatewayServer(8080);

      // Simulate message reception
      const messageBuffer = Buffer.from("test message");
      if (wsMessageHandler) {
        await (wsMessageHandler as any)(messageBuffer);
      }

      expect(mockAuthManagerInstance.authenticate).toHaveBeenCalled();
      expect(mockEventManagerInstance.handleEvent).not.toHaveBeenCalled();
      expect(mockWsInstance.send).toHaveBeenCalled();
    });

    it("should handle message processing error", async () => {
      // Mock parse to throw error
      mockProtocolInstance.parse.mockImplementation(() => {
        throw new Error("Parse error");
      });

      // Get message handler
      let wsMessageHandler: ((data: Buffer) => Promise<void>) | undefined =
        undefined;
      mockWsInstance.on.mockImplementation((event: string, callback: any) => {
        if (event === "message") {
          wsMessageHandler = callback;
        }
      });

      // Simulate connection event
      mockWssInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === "connection") {
            callback(mockWsInstance, {});
          }
        }
      );

      // Create server
      gatewayServer = new GatewayServer(8080);

      // Simulate message reception
      const messageBuffer = Buffer.from("test message");
      if (wsMessageHandler) {
        await (wsMessageHandler as any)(messageBuffer);
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error handling message",
        expect.any(Error)
      );
      expect(mockWsInstance.send).toHaveBeenCalled();
    });
  });

  describe("start", () => {
    it("should start the server", () => {
      // Create server instance
      gatewayServer = new GatewayServer(8080);
      gatewayServer.start();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Starting gateway server..."
      );
    });
  });

  describe("stop", () => {
    it("should stop the server", () => {
      // Create server instance
      gatewayServer = new GatewayServer(8080);
      gatewayServer.stop();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Stopping gateway server..."
      );
      expect(mockWssInstance.close).toHaveBeenCalled();
    });
  });

  describe("connection events", () => {
    it("should handle connection close", () => {
      // Get close handler
      let closeHandler: (() => void) | undefined = undefined;
      mockWsInstance.on.mockImplementation((event: string, callback: any) => {
        if (event === "close") {
          closeHandler = callback;
        }
      });

      // Simulate connection event
      mockWssInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === "connection") {
            callback(mockWsInstance, {});
          }
        }
      );

      // Create server
      gatewayServer = new GatewayServer(8080);

      // Simulate close event
      if (closeHandler) {
        (closeHandler as any)();
      }

      expect(mockLogger.info).toHaveBeenCalledWith("Connection closed");
    });

    it("should handle connection error", () => {
      // Get error handler
      let errorHandler: ((error: Error) => void) | undefined = undefined;
      mockWsInstance.on.mockImplementation((event: string, callback: any) => {
        if (event === "error") {
          errorHandler = callback;
        }
      });

      // Simulate connection event
      mockWssInstance.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === "connection") {
            callback(mockWsInstance, {});
          }
        }
      );

      // Create server
      gatewayServer = new GatewayServer(8080);

      // Simulate error event
      const error = new Error("Connection error");
      if (errorHandler) {
        (errorHandler as any)(error);
      }

      expect(mockLogger.error).toHaveBeenCalledWith("Connection error", error);
    });

    it("should handle server error", () => {
      // Get server error handler
      let serverErrorHandler: ((error: Error) => void) | undefined = undefined;
      mockWssInstance.on.mockImplementation((event: string, callback: any) => {
        if (event === "error") {
          serverErrorHandler = callback;
        }
      });

      // Create server
      gatewayServer = new GatewayServer(8080);

      // Simulate server error event
      const error = new Error("Server error");
      if (serverErrorHandler) {
        (serverErrorHandler as any)(error);
      }

      expect(mockLogger.error).toHaveBeenCalledWith("Server error", error);
    });

    it("should handle server listening", () => {
      // Get listening handler
      let listeningHandler: (() => void) | undefined = undefined;
      mockWssInstance.on.mockImplementation((event: string, callback: any) => {
        if (event === "listening") {
          listeningHandler = callback;
        }
      });

      // Create server
      gatewayServer = new GatewayServer(8080);

      // Simulate listening event
      if (listeningHandler) {
        (listeningHandler as any)();
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Gateway server listening on port 8080"
      );
    });
  });
});
