// 日志系统的核心类型定义

// 日志级别
export type LogLevel = 'silent' | 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

// 控制台样式
export type ConsoleStyle = 'pretty' | 'compact' | 'json';

// 敏感信息过滤模式
export type RedactMode = 'off' | 'tools';

// 日志配置类型
export type LoggerConfig = {
  level?: LogLevel;
  file?: string;
  maxFileBytes?: number;
  consoleLevel?: LogLevel;
  consoleStyle?: ConsoleStyle;
  redactSensitive?: RedactMode;
  redactPatterns?: string[];
};

// 日志上下文类型
export type LogContext = Record<string, any>;

// 日志条目类型
export type LogEntry = {
  timestamp: string;
  level: LogLevel;
  subsystem: string;
  message: string;
  context?: LogContext;
  [key: string]: any;
};

// 日志输出目标类型
export type LogOutput = {
  write: (entry: LogEntry) => void;
  close?: () => void;
};

// 日志器选项类型
export type LoggerOptions = {
  subsystem: string;
  config?: LoggerConfig;
  parent?: Logger;
};

// 日志器接口
export interface Logger {
  fatal(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  trace(message: string, context?: LogContext): void;
  getSubsystemLogger(subsystem: string): Logger;
  close(): void;
}
