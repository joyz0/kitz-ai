import fs from 'node:fs';
import path from 'node:path';
import { Logger as TsLogger } from 'tslog';
import type { LoggerSettings } from './config.js';
import { resolveLoggingConfig } from './config.js';
import type { LogLevel } from './levels.js';
import { levelToMinLevel, normalizeLogLevel } from './levels.js';
import { redactSensitiveText } from './redact.js';

const DEFAULT_LOG_DIR = path.join(process.cwd(), 'logs');
const DEFAULT_LOG_FILE = path.join(DEFAULT_LOG_DIR, 'app.log');
const LOG_PREFIX = 'app';
const LOG_SUFFIX = '.log';
const MAX_LOG_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const DEFAULT_MAX_LOG_FILE_BYTES = 500 * 1024 * 1024; // 500 MB

type LogObj = { date?: Date } & Record<string, unknown>;

type ResolvedSettings = {
  level: LogLevel;
  file: string;
  maxFileBytes: number;
  consoleLevel: LogLevel;
  consoleStyle: 'pretty' | 'compact' | 'json';
};

export type LogTransport = (logObj: Record<string, unknown>) => void;

const externalTransports = new Set<LogTransport>();

function buildLogger(settings: ResolvedSettings): TsLogger<LogObj> {
  const logger = new TsLogger<LogObj>({
    name: 'app',
    minLevel: levelToMinLevel(settings.consoleLevel),
    type: settings.consoleStyle === 'json' ? 'json' : 'pretty',
  });

  // Silent logging does not write files; skip all filesystem setup in this path.
  if (settings.level !== 'silent') {
    fs.mkdirSync(path.dirname(settings.file), { recursive: true });
    // Clean up stale rolling logs when using a dated log filename.
    if (isRollingPath(settings.file)) {
      pruneOldRollingLogs(path.dirname(settings.file));
    }
    let currentFileBytes = getCurrentLogFileBytes(settings.file);
    let warnedAboutSizeCap = false;

    logger.attachTransport((logObj: LogObj) => {
      try {
        const time = new Date().toISOString();
        // Redact sensitive data
        const redactedLogObj = redactLogObject(logObj);
        const line = JSON.stringify({ ...redactedLogObj, time });
        const payload = `${line}\n`;
        const payloadBytes = Buffer.byteLength(payload, 'utf8');
        const nextBytes = currentFileBytes + payloadBytes;
        if (nextBytes > settings.maxFileBytes) {
          if (!warnedAboutSizeCap) {
            warnedAboutSizeCap = true;
            const warningLine = JSON.stringify({
              time: new Date().toISOString(),
              level: 'warn',
              subsystem: 'logging',
              message: `log file size cap reached; suppressing writes file=${settings.file} maxFileBytes=${settings.maxFileBytes}`,
            });
            appendLogLine(settings.file, `${warningLine}\n`);
            process.stderr.write(
              `[app] log file size cap reached; suppressing writes file=${settings.file} maxFileBytes=${settings.maxFileBytes}\n`,
            );
          }
          return;
        }
        if (appendLogLine(settings.file, payload)) {
          currentFileBytes = nextBytes;
        }
      } catch {
        // never block on logging failures
      }
    });
  }

  for (const transport of externalTransports) {
    attachExternalTransport(logger, transport);
  }

  return logger;
}

function attachExternalTransport(
  logger: TsLogger<LogObj>,
  transport: LogTransport,
): void {
  logger.attachTransport((logObj: LogObj) => {
    if (!externalTransports.has(transport)) {
      return;
    }
    try {
      transport(logObj);
    } catch {
      // never block on logging failures
    }
  });
}

function getCurrentLogFileBytes(file: string): number {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

function appendLogLine(file: string, line: string): boolean {
  try {
    fs.appendFileSync(file, line, { encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}

function redactLogObject(logObj: LogObj): LogObj {
  const redacted: LogObj = {};
  for (const [key, value] of Object.entries(logObj)) {
    if (typeof value === 'string') {
      redacted[key] = redactSensitiveText(value);
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactLogObject(value as LogObj);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultRollingPathForToday(): string {
  const today = formatLocalDate(new Date());
  return path.join(DEFAULT_LOG_DIR, `${LOG_PREFIX}-${today}${LOG_SUFFIX}`);
}

function isRollingPath(file: string): boolean {
  const base = path.basename(file);
  return (
    base.startsWith(`${LOG_PREFIX}-`) &&
    base.endsWith(LOG_SUFFIX) &&
    base.length === `${LOG_PREFIX}-YYYY-MM-DD${LOG_SUFFIX}`.length
  );
}

function pruneOldRollingLogs(dir: string): void {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const cutoff = Date.now() - MAX_LOG_AGE_MS;
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      if (
        !entry.name.startsWith(`${LOG_PREFIX}-`) ||
        !entry.name.endsWith(LOG_SUFFIX)
      ) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.mtimeMs < cutoff) {
          fs.rmSync(fullPath, { force: true });
        }
      } catch {
        // ignore errors during pruning
      }
    }
  } catch {
    // ignore missing dir or read errors
  }
}

let cachedLogger: TsLogger<LogObj> | null = null;
let cachedSettings: ResolvedSettings | null = null;

function resolveSettings(): ResolvedSettings {
  const config = resolveLoggingConfig();
  const defaultLevel = 'info';
  const fromConfig = normalizeLogLevel(config?.level, defaultLevel);
  const level = fromConfig;
  const file = config?.file ?? defaultRollingPathForToday();
  const maxFileBytes = config?.maxFileBytes ?? DEFAULT_MAX_LOG_FILE_BYTES;
  const consoleLevel = normalizeLogLevel(config?.consoleLevel, defaultLevel);
  const consoleStyle = config?.consoleStyle ?? 'pretty';
  return { level, file, maxFileBytes, consoleLevel, consoleStyle };
}

function settingsChanged(
  a: ResolvedSettings | null,
  b: ResolvedSettings,
): boolean {
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
  if (!cachedLogger || settingsChanged(cachedSettings, settings)) {
    cachedLogger = buildLogger(settings);
    cachedSettings = settings;
  }
  return cachedLogger;
}

export function getChildLogger(
  bindings?: Record<string, unknown>,
  opts?: { level?: LogLevel },
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
  if (cachedLogger) {
    attachExternalTransport(cachedLogger, transport);
  }
  return () => {
    externalTransports.delete(transport);
  };
}

export function resetLogger() {
  cachedLogger = null;
  cachedSettings = null;
}
