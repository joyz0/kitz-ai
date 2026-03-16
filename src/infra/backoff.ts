// 定义退避策略接口
export interface BackoffStrategy {
  next(): number;
  reset(): void;
  getAttempts(): number;
}

// 指数退避策略
export class ExponentialBackoff implements BackoffStrategy {
  private attempts: number = 0;
  private baseDelay: number;
  private maxDelay: number;
  private jitter: number;

  constructor(
    options: {
      baseDelay?: number;
      maxDelay?: number;
      jitter?: number;
    } = {},
  ) {
    this.baseDelay = options.baseDelay || 1000; // 默认1秒
    this.maxDelay = options.maxDelay || 60000; // 默认60秒
    this.jitter = options.jitter ?? 0.1; // 默认10%抖动
  }

  // 获取下一次退避时间
  next(): number {
    this.attempts++;
    // 计算指数退避时间
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.attempts - 1),
      this.maxDelay,
    );
    // 添加抖动
    if (this.jitter > 0) {
      const jitteredDelay = delay * (1 + this.jitter * (Math.random() * 2 - 1));
      return Math.max(0, jitteredDelay);
    }
    return delay;
  }

  // 重置退避计数器
  reset(): void {
    this.attempts = 0;
  }

  // 获取当前尝试次数
  getAttempts(): number {
    return this.attempts;
  }
}

// 固定退避策略
export class FixedBackoff implements BackoffStrategy {
  private attempts: number = 0;
  private delay: number;

  constructor(delay: number = 1000) {
    this.delay = delay;
  }

  // 获取下一次退避时间
  next(): number {
    this.attempts++;
    return this.delay;
  }

  // 重置退避计数器
  reset(): void {
    this.attempts = 0;
  }

  // 获取当前尝试次数
  getAttempts(): number {
    return this.attempts;
  }
}

// 线性退避策略
export class LinearBackoff implements BackoffStrategy {
  private attempts: number = 0;
  private baseDelay: number;
  private maxDelay: number;

  constructor(
    options: {
      baseDelay?: number;
      maxDelay?: number;
    } = {},
  ) {
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 60000;
  }

  // 获取下一次退避时间
  next(): number {
    this.attempts++;
    const delay = Math.min(this.baseDelay * this.attempts, this.maxDelay);
    return delay;
  }

  // 重置退避计数器
  reset(): void {
    this.attempts = 0;
  }

  // 获取当前尝试次数
  getAttempts(): number {
    return this.attempts;
  }
}

// 创建退避策略实例
export function createBackoffStrategy(
  type: 'exponential' | 'fixed' | 'linear',
  options?: any,
): BackoffStrategy {
  switch (type) {
    case 'exponential':
      return new ExponentialBackoff(options);
    case 'fixed':
      return new FixedBackoff(options?.delay);
    case 'linear':
      return new LinearBackoff(options);
    default:
      return new ExponentialBackoff();
  }
}
