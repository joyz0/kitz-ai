import type { Logger as TsLogger } from 'tslog';

// 定义错误类型
export enum ErrorType {
  MODEL_ERROR = 'MODEL_ERROR',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// 定义错误接口
export interface AgentError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  metadata?: Record<string, any>;
}

// 定义错误处理器接口
export interface ErrorHandler {
  handleError(error: AgentError): void;
  logError(error: AgentError): void;
  formatError(error: AgentError): string;
}

// 错误处理器实现
export class DefaultErrorHandler implements ErrorHandler {
  private logger: TsLogger<any>;

  constructor(logger: TsLogger<any>) {
    this.logger = logger;
  }

  // 处理错误
  handleError(error: AgentError): void {
    this.logError(error);
    // 可以添加其他错误处理逻辑，如错误上报、告警等
  }

  // 记录错误
  logError(error: AgentError): void {
    const errorMessage = this.formatError(error);

    switch (error.type) {
      case ErrorType.MODEL_ERROR:
      case ErrorType.PROVIDER_ERROR:
      case ErrorType.NETWORK_ERROR:
        this.logger.warn(errorMessage, error.originalError);
        break;
      case ErrorType.AUTH_ERROR:
      case ErrorType.VALIDATION_ERROR:
        this.logger.error(errorMessage, error.originalError);
        break;
      case ErrorType.RUNTIME_ERROR:
      case ErrorType.UNKNOWN_ERROR:
      default:
        this.logger.error(errorMessage, error.originalError);
        break;
    }
  }

  // 格式化错误消息
  formatError(error: AgentError): string {
    let message = `[${error.type}] ${error.message}`;

    if (error.metadata) {
      message += ` | Metadata: ${JSON.stringify(error.metadata)}`;
    }

    return message;
  }
}

// 创建错误处理器实例
export function createErrorHandler(logger: TsLogger<any>): ErrorHandler {
  return new DefaultErrorHandler(logger);
}

// 创建错误实例
export function createAgentError(
  type: ErrorType,
  message: string,
  originalError?: Error,
  metadata?: Record<string, any>,
): AgentError {
  return {
    type,
    message,
    originalError,
    metadata,
  };
}
