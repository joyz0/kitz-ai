/**
 * 异步重试函数
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    attempts?: number;
    minDelayMs?: number;
    maxDelayMs?: number;
    jitter?: number;
    label?: string;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    attempts = 3,
    minDelayMs = 100,
    maxDelayMs = 5000,
    jitter = 0.2,
    label = "retry",
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === attempts || !shouldRetry(error)) {
        break;
      }

      // 计算延迟时间，带抖动
      const baseDelay = Math.min(minDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitterRange = baseDelay * jitter;
      const delay = baseDelay + Math.random() * jitterRange * 2 - jitterRange;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * 带退避策略的重试
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    baseDelayMs?: number;
    maxDelayMs?: number;
    maxAttempts?: number;
    factor?: number;
    label?: string;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    baseDelayMs = 100,
    maxDelayMs = 10000,
    maxAttempts = 5,
    factor = 2,
    label = "retryWithBackoff",
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        break;
      }

      const delay = Math.min(baseDelayMs * Math.pow(factor, attempt - 1), maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}