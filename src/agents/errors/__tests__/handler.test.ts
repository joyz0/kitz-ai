import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type ErrorHandler,
  createErrorHandler,
  ErrorType,
  createAgentError,
  type AgentError,
} from "../handler.js";
import { getMockLogger, resetMockLogger } from "../../../logger/mock-logger.js";

// 获取模拟 logger 实例
const mockLogger = getMockLogger();

describe("ErrorHandler", () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = createErrorHandler(mockLogger);
    // 重置模拟
    vi.clearAllMocks();
    resetMockLogger();
  });

  it("should create error handler successfully", () => {
    expect(errorHandler).toBeDefined();
  });

  it("should format error message correctly", () => {
    const error: AgentError = {
      type: ErrorType.MODEL_ERROR,
      message: "Model error message",
      metadata: { modelId: "openai-gpt-4" },
    };

    const formattedMessage = errorHandler.formatError(error);
    expect(formattedMessage).toContain("[MODEL_ERROR] Model error message");
    expect(formattedMessage).toContain('Metadata: {"modelId":"openai-gpt-4"}');
  });

  it("should format error message without metadata", () => {
    const error: AgentError = {
      type: ErrorType.NETWORK_ERROR,
      message: "Network error message",
    };

    const formattedMessage = errorHandler.formatError(error);
    expect(formattedMessage).toBe("[NETWORK_ERROR] Network error message");
  });

  it("should log warning for recoverable errors", () => {
    const error: AgentError = {
      type: ErrorType.MODEL_ERROR,
      message: "Model error message",
    };

    errorHandler.logError(error);
    expect(mockLogger.warn).toHaveBeenCalledWith("[MODEL_ERROR] Model error message", undefined);
  });

  it("should log error for critical errors", () => {
    const error: AgentError = {
      type: ErrorType.AUTH_ERROR,
      message: "Authentication error message",
    };

    errorHandler.logError(error);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "[AUTH_ERROR] Authentication error message",
      undefined
    );
  });

  it("should log error with original error", () => {
    const originalError = new Error("Original error message");
    const error: AgentError = {
      type: ErrorType.RUNTIME_ERROR,
      message: "Runtime error message",
      originalError,
    };

    errorHandler.logError(error);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "[RUNTIME_ERROR] Runtime error message",
      originalError
    );
  });

  it("should handle error by logging it", () => {
    const error: AgentError = {
      type: ErrorType.PROVIDER_ERROR,
      message: "Provider error message",
    };

    errorHandler.handleError(error);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "[PROVIDER_ERROR] Provider error message",
      undefined
    );
  });

  it("should create agent error correctly", () => {
    const originalError = new Error("Original error");
    const metadata = { provider: "openai" };

    const error = createAgentError(
      ErrorType.MODEL_ERROR,
      "Test error message",
      originalError,
      metadata
    );

    expect(error).toEqual({
      type: ErrorType.MODEL_ERROR,
      message: "Test error message",
      originalError,
      metadata,
    });
  });

  it("should create agent error without optional parameters", () => {
    const error = createAgentError(ErrorType.NETWORK_ERROR, "Network error");

    expect(error).toEqual({
      type: ErrorType.NETWORK_ERROR,
      message: "Network error",
    });
    expect(error.originalError).toBeUndefined();
    expect(error.metadata).toBeUndefined();
  });
});
