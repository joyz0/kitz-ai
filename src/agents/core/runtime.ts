import type { Logger as TsLogger } from 'tslog';
import type { OpenClawConfig } from '../../config/index.js';

// 定义运行时上下文接口
export interface RuntimeContext {
  config: OpenClawConfig;
  logger: TsLogger<any>;
  // 其他上下文信息
}

// 定义运行时选项接口
export interface RuntimeOptions {
  config: OpenClawConfig;
  logger: TsLogger<any>;
}

// 核心运行时类
export class Runtime {
  private context: RuntimeContext;
  private isRunning: boolean = false;

  constructor(options: RuntimeOptions) {
    this.context = {
      config: options.config,
      logger: options.logger,
    };
  }

  // 启动运行时
  async start(): Promise<void> {
    if (this.isRunning) {
      this.context.logger.warn('Runtime is already running');
      return;
    }

    try {
      this.context.logger.info('Starting runtime...');
      // 初始化运行时
      // 1. 加载配置
      // 2. 初始化依赖
      // 3. 启动服务

      this.isRunning = true;
      this.context.logger.info('Runtime started successfully');
    } catch (error) {
      this.context.logger.error('Failed to start runtime:', error);
      throw error;
    }
  }

  // 停止运行时
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.context.logger.warn('Runtime is not running');
      return;
    }

    try {
      this.context.logger.info('Stopping runtime...');
      // 清理资源
      // 1. 停止服务
      // 2. 释放资源

      this.isRunning = false;
      this.context.logger.info('Runtime stopped successfully');
    } catch (error) {
      this.isRunning = false; // 即使出错也要设置为false
      this.context.logger.error('Failed to stop runtime:', error);
      throw error;
    }
  }

  // 获取运行时状态
  getStatus(): {
    isRunning: boolean;
  } {
    return {
      isRunning: this.isRunning,
    };
  }

  // 获取上下文
  getContext(): RuntimeContext {
    return this.context;
  }
}

// 创建运行时实例
export function createRuntime(options: RuntimeOptions): Runtime {
  return new Runtime(options);
}
