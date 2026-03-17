import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import * as path from "node:path";
import { Logger as TsLogger } from "tslog";
import type { LoggerSettings } from "./config.js";
import { resolveLoggingConfig } from "./config.js";
import type { LogLevel } from "./levels.js";
import { levelToMinLevel, normalizeLogLevel } from "./levels.js";
import { redactSensitiveText } from "./redact.js";

export type Logger = TsLogger<LogObj>;

const DEFAULT_LOG_DIR = path.join(process.cwd(), "logs");
const DEFAULT_LOG_FILE = path.join(DEFAULT_LOG_DIR, "app.log");
const LOG_PREFIX = "app";
const LOG_SUFFIX = ".log";
const MAX_LOG_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const DEFAULT_MAX_LOG_FILE_BYTES = 500 * 1024 * 1024; // 500 MB
const LOG_BUFFER_SIZE = 100; // 日志缓冲大小
const LOG_FLUSH_INTERVAL = 1000; // 日志刷新间隔（毫秒）

export type LogObj = { date?: Date } & Record<string, unknown>;

type ResolvedSettings = {
  level: LogLevel;
  file: string;
  maxFileBytes: number;
  consoleLevel: LogLevel;
  consoleStyle: "pretty" | "compact" | "json";
};

export type LogTransport = (logObj: Record<string, unknown>) => void;
export type LogTransportRecord = Record<string, unknown>;
export type LoggerResolvedSettings = ResolvedSettings;

export type PinoLikeLogger = {
  level: string;
  child: (bindings?: Record<string, unknown>) => PinoLikeLogger;
  trace: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  fatal: (...args: unknown[]) => void;
};

const externalTransports = new Set<LogTransport>();

// 全局日志状态
interface LoggingState {
  cachedLogger: TsLogger<LogObj> | null;
  cachedSettings: ResolvedSettings | null;
  overrideSettings: LoggerSettings | null;
}

const loggingState: LoggingState = {
  cachedLogger: null,
  cachedSettings: null,
  overrideSettings: null,
};

// 日志缓冲队列
class LogBuffer {
  private buffer: string[] = [];
  private isFlushing = false;
  private lastFlushTime = Date.now();

  constructor(
    private file: string,
    private maxSize: number
  ) {
    // 定期刷新缓冲
    setInterval(() => this.flushIfNeeded(), LOG_FLUSH_INTERVAL);
  }

  public add(line: string): void {
    this.buffer.push(line);
    if (this.buffer.length >= LOG_BUFFER_SIZE) {
      this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;
    const lines = [...this.buffer];
    this.buffer = [];

    try {
      await fsPromises.appendFile(this.file, lines.join(""), {
        encoding: "utf8",
      });
    } catch {
      // 忽略写入错误
    } finally {
      this.isFlushing = false;
      this.lastFlushTime = Date.now();
    }
  }

  private flushIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastFlushTime >= LOG_FLUSH_INTERVAL && this.buffer.length > 0) {
      this.flush();
    }
  }
}

// 创建控制台日志记录器
function createConsoleLogger(settings: ResolvedSettings): TsLogger<LogObj> {
  return new TsLogger<LogObj>({
    name: "app",
    minLevel: levelToMinLevel(settings.consoleLevel),
    type: settings.consoleStyle === "json" ? "json" : "pretty",
  });
}

// 设置日志目录
async function setupLogDirectory(file: string): Promise<void> {
  await fsPromises.mkdir(path.dirname(file), { recursive: true });

  if (isRollingPath(file)) {
    await pruneOldRollingLogs(path.dirname(file));
  }
}

// 处理日志文件大小限制
function handleLogSizeLimit(
  settings: ResolvedSettings,
  currentFileBytes: number,
  payloadBytes: number,
  warnedAboutSizeCap: boolean
): { shouldWrite: boolean; newWarnedState: boolean } {
  const nextBytes = currentFileBytes + payloadBytes;
  if (nextBytes > settings.maxFileBytes) {
    if (!warnedAboutSizeCap) {
      const warningLine = JSON.stringify({
        time: new Date().toISOString(),
        level: "warn",
        subsystem: "logging",
        message: `log file size cap reached; suppressing writes file=${settings.file} maxFileBytes=${settings.maxFileBytes}`,
      });
      appendLogLineSync(settings.file, `${warningLine}\n`);
      process.stderr.write(
        `[app] log file size cap reached; suppressing writes file=${settings.file} maxFileBytes=${settings.maxFileBytes}\n`
      );
      return { shouldWrite: false, newWarnedState: true };
    }
    return { shouldWrite: false, newWarnedState: warnedAboutSizeCap };
  }
  return { shouldWrite: true, newWarnedState: warnedAboutSizeCap };
}

// 同步追加日志行（用于警告信息）
function appendLogLineSync(file: string, line: string): boolean {
  try {
    fs.appendFileSync(file, line, { encoding: "utf8" });
    return true;
  } catch {
    return false;
  }
}

// 获取当前日志文件大小
async function getCurrentLogFileBytes(file: string): Promise<number> {
  try {
    const stat = await fsPromises.stat(file);
    return stat.size;
  } catch {
    return 0;
  }
}

// 异步清理旧的滚动日志
export async function pruneOldRollingLogs(dir: string): Promise<void> {
  try {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    const cutoff = Date.now() - MAX_LOG_AGE_MS;

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      if (!entry.name.startsWith(`${LOG_PREFIX}-`) || !entry.name.endsWith(LOG_SUFFIX)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      try {
        const stat = await fsPromises.stat(fullPath);
        if (stat.mtimeMs < cutoff) {
          await fsPromises.rm(fullPath, { force: true });
        }
      } catch {
        // 忽略清理错误
      }
    }
  } catch {
    // 忽略目录不存在或读取错误
  }
}

// 创建文件日志记录器
function createFileLogger(logger: TsLogger<LogObj>, settings: ResolvedSettings): void {
  let logBuffer: LogBuffer | null = null;
  let currentFileBytes = 0;
  let warnedAboutSizeCap = false;

  // 初始化日志缓冲
  setupLogDirectory(settings.file).then(() => {
    logBuffer = new LogBuffer(settings.file, DEFAULT_MAX_LOG_FILE_BYTES);
    getCurrentLogFileBytes(settings.file).then((size) => {
      currentFileBytes = size;
    });
  });

  logger.attachTransport(async (logObj: LogObj) => {
    try {
      if (!logBuffer) {
        return;
      }

      const time = new Date().toISOString();
      // 脱敏敏感数据
      const redactedLogObj = redactLogObject(logObj);
      const line = JSON.stringify({ ...redactedLogObj, time });
      const payload = `${line}\n`;
      const payloadBytes = Buffer.byteLength(payload, "utf8");

      // 检查文件大小限制
      const { shouldWrite, newWarnedState } = handleLogSizeLimit(
        settings,
        currentFileBytes,
        payloadBytes,
        warnedAboutSizeCap
      );

      warnedAboutSizeCap = newWarnedState;

      if (shouldWrite) {
        logBuffer.add(payload);
        currentFileBytes += payloadBytes;
      }
    } catch {
      // 从不因日志失败而阻塞
    }
  });
}

// 附加外部传输器
function attachExternalTransport(logger: TsLogger<LogObj>, transport: LogTransport): void {
  logger.attachTransport((logObj: LogObj) => {
    if (!externalTransports.has(transport)) {
      return;
    }
    try {
      transport(logObj);
    } catch {
      // 从不因日志失败而阻塞
    }
  });
}

// 脱敏日志对象
function redactLogObject(logObj: LogObj): LogObj {
  const redacted: LogObj = {};
  for (const [key, value] of Object.entries(logObj)) {
    if (typeof value === "string") {
      redacted[key] = redactSensitiveText(value);
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactLogObject(value as LogObj);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

// 格式化本地日期
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 获取今天的默认滚动路径
function defaultRollingPathForToday(): string {
  const today = formatLocalDate(new Date());
  return path.join(DEFAULT_LOG_DIR, `${LOG_PREFIX}-${today}${LOG_SUFFIX}`);
}

// 检查是否为滚动路径
function isRollingPath(file: string): boolean {
  const base = path.basename(file);
  return (
    base.startsWith(`${LOG_PREFIX}-`) &&
    base.endsWith(LOG_SUFFIX) &&
    base.length === `${LOG_PREFIX}-YYYY-MM-DD${LOG_SUFFIX}`.length
  );
}

// 构建日志记录器
function buildLogger(settings: ResolvedSettings): TsLogger<LogObj> {
  const logger = createConsoleLogger(settings);

  // 静默模式不写入文件
  if (settings.level !== "silent") {
    createFileLogger(logger, settings);
  }

  // 附加外部传输器
  for (const transport of externalTransports) {
    attachExternalTransport(logger, transport);
  }

  return logger;
}

// 解析日志设置
function resolveSettings(): ResolvedSettings {
  let config = loggingState.overrideSettings ?? resolveLoggingConfig();
  const defaultLevel = "info";
  const fromConfig = normalizeLogLevel(config?.level, defaultLevel);
  const level = fromConfig;
  const file = config?.file ?? defaultRollingPathForToday();
  const maxFileBytes = config?.maxFileBytes ?? DEFAULT_MAX_LOG_FILE_BYTES;
  const consoleLevel = normalizeLogLevel(config?.consoleLevel, defaultLevel);
  const consoleStyle = config?.consoleStyle ?? "pretty";
  return { level, file, maxFileBytes, consoleLevel, consoleStyle };
}

// 检查设置是否变更
function settingsChanged(a: ResolvedSettings | null, b: ResolvedSettings): boolean {
  if (!a) {
    return true;
  }
  return (
    a.level !== b.level ||
    a.file !== b.file ||
    a.maxFileBytes !== b.maxFileBytes ||
    a.consoleLevel !== b.consoleLevel ||
    a.consoleStyle !== b.consoleStyle
  );
}

export function getLogger(): TsLogger<LogObj> {
  const settings = resolveSettings();
  if (!loggingState.cachedLogger || settingsChanged(loggingState.cachedSettings, settings)) {
    loggingState.cachedLogger = buildLogger(settings);
    loggingState.cachedSettings = settings;
  }
  return loggingState.cachedLogger;
}

export function getChildLogger(
  bindings?: Record<string, unknown>,
  opts?: { level?: LogLevel }
): TsLogger<LogObj> {
  const base = getLogger();
  const minLevel = opts?.level ? levelToMinLevel(opts.level) : undefined;
  const name = bindings ? JSON.stringify(bindings) : undefined;
  return base.getSubLogger({
    name,
    minLevel,
    prefix: bindings ? [name ?? ""] : [],
  });
}

export function registerLogTransport(transport: LogTransport): () => void {
  externalTransports.add(transport);
  if (loggingState.cachedLogger) {
    attachExternalTransport(loggingState.cachedLogger, transport);
  }
  return () => {
    externalTransports.delete(transport);
  };
}

export function resetLogger() {
  loggingState.cachedLogger = null;
  loggingState.cachedSettings = null;
}

// Baileys expects a pino-like logger shape. Provide a lightweight adapter.
export function toPinoLikeLogger(logger: TsLogger<LogObj>, level: LogLevel): PinoLikeLogger {
  const buildChild = (bindings?: Record<string, unknown>) =>
    toPinoLikeLogger(
      logger.getSubLogger({
        name: bindings ? JSON.stringify(bindings) : undefined,
      }),
      level
    );

  return {
    level,
    child: buildChild,
    trace: (...args: unknown[]) => logger.trace(...args),
    debug: (...args: unknown[]) => logger.debug(...args),
    info: (...args: unknown[]) => logger.info(...args),
    warn: (...args: unknown[]) => logger.warn(...args),
    error: (...args: unknown[]) => logger.error(...args),
    fatal: (...args: unknown[]) => logger.fatal(...args),
  };
}

export function getResolvedLoggerSettings(): LoggerResolvedSettings {
  return resolveSettings();
}

// Test helpers
export function setLoggerOverride(settings: LoggerSettings | null) {
  loggingState.overrideSettings = settings;
  loggingState.cachedLogger = null;
  loggingState.cachedSettings = null;
}

export function isFileLogLevelEnabled(level: LogLevel): boolean {
  const settings = loggingState.cachedSettings ?? resolveSettings();
  if (!loggingState.cachedSettings) {
    loggingState.cachedSettings = settings;
  }
  if (settings.level === "silent") {
    return false;
  }
  return levelToMinLevel(level) <= levelToMinLevel(settings.level);
}
