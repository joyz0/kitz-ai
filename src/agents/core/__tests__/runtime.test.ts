import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Runtime, createRuntime } from '../runtime.js';
import { getMockLogger, resetMockLogger } from '../../../logger/mock-logger.js';
import { OpenClawConfigSchema } from '../../../config/index.js';

// 模拟配置
const mockConfig = OpenClawConfigSchema.parse({});

// 获取模拟 logger 实例
const mockLogger = getMockLogger();

describe('Runtime', () => {
  let runtime: Runtime;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();
    resetMockLogger();
    runtime = createRuntime({ config: mockConfig, logger: mockLogger });
  });

  it('should create runtime instance successfully', () => {
    expect(runtime).toBeInstanceOf(Runtime);
  });

  it('should start runtime successfully', async () => {
    await runtime.start();
    expect(runtime.getStatus().isRunning).toBe(true);
    expect(mockLogger.info).toHaveBeenCalledWith('Starting runtime...');
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Runtime started successfully',
    );
  });

  it('should not start runtime if already running', async () => {
    await runtime.start();
    await runtime.start(); // 第二次调用应该被忽略
    expect(runtime.getStatus().isRunning).toBe(true);
    expect(mockLogger.warn).toHaveBeenCalledWith('Runtime is already running');
  });

  it('should stop runtime successfully', async () => {
    await runtime.start();
    await runtime.stop();
    expect(runtime.getStatus().isRunning).toBe(false);
    expect(mockLogger.info).toHaveBeenCalledWith('Stopping runtime...');
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Runtime stopped successfully',
    );
  });

  it('should not stop runtime if not running', async () => {
    await runtime.stop(); // 运行时未启动，应该被忽略
    expect(runtime.getStatus().isRunning).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith('Runtime is not running');
  });

  it('should return correct status', async () => {
    expect(runtime.getStatus().isRunning).toBe(false);
    await runtime.start();
    expect(runtime.getStatus().isRunning).toBe(true);
    await runtime.stop();
    expect(runtime.getStatus().isRunning).toBe(false);
  });

  it('should return correct context', async () => {
    const context = runtime.getContext();
    expect(context.config).toEqual(mockConfig);
    expect(context.logger).toEqual(mockLogger);
  });

  it('should handle start error', async () => {
    // 模拟启动时出错
    vi.spyOn(mockLogger, 'info').mockImplementationOnce(() => {
      throw new Error('Start error');
    });

    await expect(runtime.start()).rejects.toThrow('Start error');
    expect(runtime.getStatus().isRunning).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to start runtime:',
      expect.any(Error),
    );
  });

  it('should handle stop error', async () => {
    await runtime.start();

    // 模拟停止时出错
    vi.spyOn(mockLogger, 'info').mockImplementationOnce(() => {
      throw new Error('Stop error');
    });

    await expect(runtime.stop()).rejects.toThrow('Stop error');
    expect(runtime.getStatus().isRunning).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to stop runtime:',
      expect.any(Error),
    );
  });
});
