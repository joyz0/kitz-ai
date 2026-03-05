import type { LogLevel } from './levels.js';
import type { RedactSensitiveMode } from './redact.js';
import type { LoggingConfig } from '../config/zod-schema.js';
import { loadConfig } from '../config/index.js';

export type LoggerSettings = LoggingConfig;

let cachedConfig: LoggerSettings | null = null;

// 从配置系统读取日志配置
export function resolveLoggingConfig(): LoggerSettings | undefined {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const config = loadConfig();
    return config.logging;
  } catch {
    // Config module not available, use defaults
    return {
      level: 'info',
      consoleLevel: 'info',
      consoleStyle: 'pretty',
      redactSensitive: 'tools',
    };
  }
}

export function setLoggerConfig(config: LoggerSettings): void {
  cachedConfig = config;
}

export function getLoggerConfig(): LoggerSettings | undefined {
  return cachedConfig ?? resolveLoggingConfig();
}
