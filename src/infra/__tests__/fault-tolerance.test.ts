import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type FaultToleranceHandler,
  createFaultToleranceHandler,
  type RetryOptions,
  retry,
} from "../fault-tolerance.js";
import { getMockLogger, resetMockLogger } from "../../logger/mock-logger.js";

// 模拟日志记录器
const mockLogger = getMockLogger();

// 模拟延迟函数
vi.useFakeTimers();

describe("FaultToleranceHandler", () => {
  let faultToleranceHandler: FaultToleranceHandler;

  beforeEach(() => {
    faultToleranceHandler = createFaultToleranceHandler(mockLogger);
    // 重置模拟
    vi.clearAllMocks();
    resetMockLogger();
    vi.clearAllTimers();
  });

  it("should create fault tolerance handler successfully", () => {
    expect(faultToleranceHandler).toBeDefined();
  });

  it("should succeed on first attempt", async () => {
    const mockFn = vi.fn().mockResolvedValue("success");
    const options: RetryOptions = {
      maxAttempts: 3,
      backoffType: "fixed",
      backoffOptions: { delay: 100 },
    };

    const result = await faultToleranceHandler.retry(mockFn, options);
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith("Attempt 1/3...");
    expect(mockLogger.debug).toHaveBeenCalledWith("Attempt 1 succeeded");
  });

  it("should retry on failure and succeed", async () => {
    // 禁用假定时器，使用真实的延迟
    vi.useRealTimers();

    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValue("success");

    const options: RetryOptions = {
      maxAttempts: 3,
      backoffType: "fixed",
      backoffOptions: { delay: 10 }, // 减少延迟以加快测试速度
    };

    const result = await faultToleranceHandler.retry(mockFn, options);
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(mockLogger.warn).toHaveBeenCalledWith("Attempt 1 failed: timeout, retrying in 10ms...");
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Attempt 2 failed: network error, retrying in 10ms..."
    );
    expect(mockLogger.debug).toHaveBeenCalledWith("Attempt 3 succeeded");

    // 重新启用假定时器
    vi.useFakeTimers();
  });

  it("should fail after max attempts", async () => {
    // 禁用假定时器，使用真实的延迟
    vi.useRealTimers();

    const mockFn = vi.fn().mockRejectedValue(new Error("timeout"));
    const options: RetryOptions = {
      maxAttempts: 3,
      backoffType: "fixed",
      backoffOptions: { delay: 10 }, // 减少延迟以加快测试速度
    };

    await expect(faultToleranceHandler.retry(mockFn, options)).rejects.toThrow("timeout");
    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(mockLogger.error).toHaveBeenCalledWith("Max attempts reached (3), giving up");

    // 重新启用假定时器
    vi.useFakeTimers();
  });

  it("should not retry non-retryable errors", async () => {
    const nonRetryableError = new Error("Non-retryable error");
    const mockFn = vi.fn().mockRejectedValue(nonRetryableError);
    const options: RetryOptions = {
      maxAttempts: 3,
      backoffType: "fixed",
      backoffOptions: { delay: 100 },
    };

    await expect(faultToleranceHandler.retry(mockFn, options)).rejects.toThrow(
      "Non-retryable error"
    );
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Non-retryable error encountered: Non-retryable error"
    );
  });

  it("should use custom retryableErrors function", async () => {
    // 禁用假定时器，使用真实的延迟
    vi.useRealTimers();

    const retryableError = new Error("Retryable error");
    const nonRetryableError = new Error("Non-retryable error");

    const mockFn = vi.fn().mockRejectedValue(retryableError);
    const options: RetryOptions = {
      maxAttempts: 2,
      backoffType: "fixed",
      backoffOptions: { delay: 10 }, // 减少延迟以加快测试速度
      retryableErrors: (error) => error.message === "Retryable error",
    };

    await expect(faultToleranceHandler.retry(mockFn, options)).rejects.toThrow("Retryable error");
    expect(mockFn).toHaveBeenCalledTimes(2);

    // 重新启用假定时器
    vi.useFakeTimers();
  });

  it("should check if error is retryable", () => {
    const retryableError = new Error("timeout");
    const nonRetryableError = new Error("internal error");

    expect(faultToleranceHandler.isRetryable(retryableError)).toBe(true);
    expect(faultToleranceHandler.isRetryable(nonRetryableError)).toBe(false);
  });

  it("should use convenience retry function", async () => {
    const mockFn = vi.fn().mockResolvedValue("success");
    const options: RetryOptions = {
      maxAttempts: 3,
      backoffType: "fixed",
      backoffOptions: { delay: 100 },
    };

    const result = await retry(mockFn, options, mockLogger);
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
