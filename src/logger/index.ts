// 日志系统核心实现
import fs from 'node:fs';
import path from 'node:path';
import {
  LogLevel,
  Logger,
  LoggerConfig,
  LoggerOptions,
  LogEntry,
  LogOutput,
  LogContext,
} from './types';
import { loadConfig } from '../config';

// 日志级别优先级
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  silent: 0,
  fatal: 1,
  error: 2,
  warn: 3,
  info: 4,
  debug: 5,
  trace: 6,
};

// 颜色映射
const LEVEL_COLORS: Record<LogLevel, string> = {
  fatal: '\x1b[31m', // 红色
  error: '\x1b[31m', // 红色
  warn: '\x1b[33m', // 黄色
  info: '\x1b[32m', // 绿色
  debug: '\x1b[34m', // 蓝色
  trace: '\x1b[35m', // 紫色
  silent: '\x1b[0m', // 重置
};

// 重置颜色
const RESET_COLOR = '\x1b[0m';

// 敏感信息正则表达式
const SENSITIVE_PATTERNS = [
  new RegExp(
    '(?i)(api[\\_\\s-]?key|api[\\_\\s-]?token|password|secret|credential|authorization|bearer)\\s*[:=]\\s*["\']?([^"\'\\s]+)["\']?',
    'g',
  ),
  new RegExp(
    '(?i)(password|secret|credential)\\s*[:=]\\s*["\']?([^"\'\\s]+)["\']?',
    'g',
  ),
  new RegExp('(?i)(token|auth)\\s*[:=]\\s*["\']?([^"\'\\s]+)["\']?', 'g'),
];

// 控制台输出实现
class ConsoleOutput implements LogOutput {
  private style: 'pretty' | 'compact' | 'json';

  constructor(style: 'pretty' | 'compact' | 'json' = 'pretty') {
    this.style = style;
  }

  write(entry: LogEntry): void {
    if (this.style === 'json') {
      console.log(JSON.stringify(entry));
    } else if (this.style === 'compact') {
      const color = LEVEL_COLORS[entry.level];
      console.log(
        `${color}[${entry.level.toUpperCase()}]${RESET_COLOR} [${entry.subsystem}] ${entry.message}`,
      );
    } else {
      const color = LEVEL_COLORS[entry.level];
      console.log(
        `${color}[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.subsystem}]${RESET_COLOR}`,
      );
      console.log(`  ${entry.message}`);
      if (entry.context && Object.keys(entry.context).length > 0) {
        console.log(`  Context: ${JSON.stringify(entry.context, null, 2)}`);
      }
    }
  }
}

// 文件输出实现
class FileOutput implements LogOutput {
  private fileStream: fs.WriteStream;
  private filePath: string;
  private maxFileBytes: number;
  private currentBytes: number;

  constructor(filePath: string, maxFileBytes: number = 10485760) {
    this.filePath = filePath;
    this.maxFileBytes = maxFileBytes;
    this.currentBytes = 0;

    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.fileStream = fs.createWriteStream(filePath, { flags: 'a' });
  }

  write(entry: LogEntry): void {
    const logLine = JSON.stringify(entry) + '\n';
    this.currentBytes += Buffer.byteLength(logLine);

    // 检查文件大小
    if (this.currentBytes > this.maxFileBytes) {
      this.rotateLog();
    }

    this.fileStream.write(logLine);
  }

  private rotateLog(): void {
    this.fileStream.close();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = `${this.filePath}.${timestamp}`;

    if (fs.existsSync(this.filePath)) {
      fs.renameSync(this.filePath, rotatedPath);
    }

    this.fileStream = fs.createWriteStream(this.filePath, { flags: 'a' });
    this.currentBytes = 0;
  }

  close(): void {
    this.fileStream.close();
  }
}

// 日志器实现
class LoggerImpl implements Logger {
  private subsystem: string;
  private config: LoggerConfig;
  private outputs: LogOutput[];
  private redactPatterns: RegExp[];

  constructor(options: LoggerOptions) {
    this.subsystem = options.subsystem;
    this.config = { ...options.config };
    this.outputs = [];
    this.redactPatterns = [...SENSITIVE_PATTERNS];

    // 初始化输出
    this.initOutputs();
  }

  private initOutputs(): void {
    // 控制台输出
    this.outputs.push(
      new ConsoleOutput(
        (this.config.consoleStyle as 'pretty' | 'compact' | 'json') || 'pretty',
      ),
    );

    // 文件输出
    if (this.config.file) {
      this.outputs.push(
        new FileOutput(this.config.file, this.config.maxFileBytes),
      );
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const configLevel = this.config.level || 'info';
    return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[configLevel];
  }

  private redactSensitive(data: any): any {
    if (this.config.redactSensitive === 'off') {
      return data;
    }

    if (typeof data === 'string') {
      let result = data;
      for (const pattern of this.redactPatterns) {
        result = result.replace(
          pattern,
          (match: string, key: string, value: string) => {
            return `${key}="[REDACTED]"`;
          },
        );
      }
      return result;
    } else if (typeof data === 'object' && data !== null) {
      const result: any = Array.isArray(data) ? [] : {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          result[key] = this.redactSensitive(data[key]);
        }
      }
      return result;
    }
    return data;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      subsystem: this.subsystem,
      message: this.redactSensitive(message),
      context: this.redactSensitive(context),
    };

    for (const output of this.outputs) {
      try {
        output.write(entry);
      } catch (error) {
        // 确保日志系统本身不会失败
        console.error('Failed to write log:', error);
      }
    }
  }

  fatal(message: string, context?: LogContext): void {
    this.log('fatal', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  trace(message: string, context?: LogContext): void {
    this.log('trace', message, context);
  }

  getSubsystemLogger(subsystem: string): Logger {
    return new LoggerImpl({
      subsystem: `${this.subsystem}.${subsystem}`,
      config: this.config,
      parent: this,
    });
  }

  close(): void {
    for (const output of this.outputs) {
      if (output.close) {
        try {
          output.close();
        } catch (error) {
          console.error('Failed to close log output:', error);
        }
      }
    }
  }
}

// 全局日志器实例
let globalLogger: Logger | null = null;

// 创建日志器
export function createLogger(options: LoggerOptions): Logger {
  return new LoggerImpl(options);
}

// 获取全局日志器
export function getLogger(subsystem: string = 'root'): Logger {
  if (!globalLogger) {
    const config = loadConfig();
    globalLogger = new LoggerImpl({
      subsystem,
      config: config.logging,
    });
  }

  if (subsystem === 'root') {
    return globalLogger;
  }

  return globalLogger.getSubsystemLogger(subsystem);
}

// 导出日志级别
export { LogLevel };
