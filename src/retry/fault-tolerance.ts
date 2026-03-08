import type { BackoffStrategy } from './backoff.js';
import { createBackoffStrategy } from './backoff.js';
import type { Logger as TsLogger } from 'tslog';

// 定义重试选项接口
export interface RetryOptions {
  maxAttempts: number;
  backoffType: 'exponential' | 'fixed' | 'linear';
  backoffOptions?: any;
  retryableErrors?: (error: Error) => boolean;
}

// 定义容错处理器接口
export interface FaultToleranceHandler {
  retry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T>;
  isRetryable(error: Error): boolean;
}

// 容错处理器实现
export class DefaultFaultToleranceHandler implements FaultToleranceHandler {
  private logger: TsLogger<any>;

  constructor(logger: TsLogger<any>) {
    this.logger = logger;
  }

  // 重试函数
  async retry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
    const backoff = createBackoffStrategy(
      options.backoffType,
      options.backoffOptions,
    );
    let lastError: Error;

    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      try {
        this.logger.debug(`Attempt ${attempt}/${options.maxAttempts}...`);
        const result = await fn();
        this.logger.debug(`Attempt ${attempt} succeeded`);
        return result;
      } catch (error) {
        lastError = error as Error;

        // 检查是否可以重试
        if (!this.isRetryableError(lastError, options.retryableErrors)) {
          this.logger.warn(
            `Non-retryable error encountered: ${lastError.message}`,
          );
          throw lastError;
        }

        // 检查是否达到最大尝试次数
        if (attempt >= options.maxAttempts) {
          this.logger.error(
            `Max attempts reached (${options.maxAttempts}), giving up`,
          );
          throw lastError;
        }

        // 计算退避时间
        const delay = backoff.next();
        this.logger.warn(
          `Attempt ${attempt} failed: ${lastError.message}, retrying in ${Math.round(delay)}ms...`,
        );

        // 等待退避时间
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // 理论上不会到达这里，但为了类型安全
    throw lastError!;
  }

  // 检查错误是否可以重试
  isRetryable(error: Error): boolean {
    // 默认可重试的错误类型
    const retryableErrorMessages = [
      'timeout',
      'network error',
      'connection refused',
      'service unavailable',
      '503',
      '504',
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrorMessages.some((message) =>
      errorMessage.includes(message),
    );
  }

  // 检查错误是否可以重试（使用自定义函数）
  private isRetryableError(
    error: Error,
    retryableErrors?: (error: Error) => boolean,
  ): boolean {
    if (retryableErrors) {
      return retryableErrors(error);
    }
    return this.isRetryable(error);
  }
}

// 创建容错处理器实例
export function createFaultToleranceHandler(
  logger: TsLogger<any>,
): FaultToleranceHandler {
  return new DefaultFaultToleranceHandler(logger);
}

// 便捷的重试函数
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  logger: TsLogger<any>,
): Promise<T> {
  const handler = createFaultToleranceHandler(logger);
  return handler.retry(fn, options);
}
