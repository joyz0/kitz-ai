// 配置文件 IO 操作
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSON5 from 'json5';
import { VERSION } from '../version';
import { applyAllDefaults } from './default-values';
import { applyConfigEnvVars, resolveConfigEnvVars } from './env-substitution';
import type {
  OpenClawConfig,
  ConfigFileSnapshot,
  ConfigValidationIssue,
  LegacyConfigIssue,
} from './types';
import { validateConfigObject } from './schema';

// 配置文件审计日志文件名
const CONFIG_AUDIT_LOG_FILENAME = 'config-audit.jsonl';

// 哈希配置原始内容
function hashConfigRaw(raw: string | null): string {
  return crypto
    .createHash('sha256')
    .update(raw ?? '')
    .digest('hex');
}

// 解析 JSON5 配置文件
export function parseConfigJson5(
  raw: string,
  json5: { parse: (value: string) => unknown } = JSON5,
): { ok: true; parsed: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, parsed: json5.parse(raw) };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// 配置写入选项
export type ConfigWriteOptions = {
  envSnapshotForRestore?: Record<string, string | undefined>;
  expectedConfigPath?: string;
  unsetPaths?: string[][];
};

// 配置 IO 依赖
export type ConfigIoDeps = {
  fs?: typeof fs;
  json5?: typeof JSON5;
  env?: NodeJS.ProcessEnv;
  homedir?: () => string;
  configPath?: string;
  logger?: Pick<typeof console, 'error' | 'warn'>;
};

// 规范化依赖
function normalizeDeps(overrides: ConfigIoDeps = {}): Required<ConfigIoDeps> {
  return {
    fs: overrides.fs ?? fs,
    json5: overrides.json5 ?? JSON5,
    env: overrides.env ?? process.env,
    homedir: overrides.homedir ?? os.homedir,
    configPath:
      overrides.configPath ??
      path.join(os.homedir(), '.kitz-ai', 'config.json5'),
    logger: overrides.logger ?? console,
  };
}

// 解析配置路径
function resolveConfigPath(
  env: NodeJS.ProcessEnv,
  homedir: () => string,
): string {
  if (env.KITZ_CONFIG_PATH) {
    return env.KITZ_CONFIG_PATH;
  }
  // 检查当前目录是否有 example/config/config.json5
  const exampleConfigPath = path.join(
    process.cwd(),
    'example',
    'config',
    'config.json5',
  );
  if (fs.existsSync(exampleConfigPath)) {
    return exampleConfigPath;
  }
  // 默认配置路径
  return path.join(homedir(), '.kitz-ai', 'config.json5');
}

// 戳记配置版本
function stampConfigVersion(cfg: OpenClawConfig): OpenClawConfig {
  const now = new Date().toISOString();
  return {
    ...cfg,
    meta: {
      ...cfg.meta,
      lastTouchedVersion: VERSION,
      lastTouchedAt: now,
    },
  };
}

// 维护配置备份
async function maintainConfigBackups(
  configPath: string,
  fsPromises: typeof fs.promises,
): Promise<void> {
  const backupPath = `${configPath}.bak`;
  if (
    await fsPromises
      .access(backupPath, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false)
  ) {
    await fsPromises
      .rename(backupPath, `${configPath}.bak.old`)
      .catch(() => {});
  }
  await fsPromises.copyFile(configPath, backupPath).catch(() => {});
}

// 创建配置 IO 实例
export function createConfigIO(overrides: ConfigIoDeps = {}) {
  const deps = normalizeDeps(overrides);
  const configPath = resolveConfigPath(deps.env, deps.homedir);

  // 解析 $include 指令
  function resolveConfigIncludes(config: unknown, basePath: string): unknown {
    if (config === null || typeof config !== 'object') {
      return config;
    }

    if (Array.isArray(config)) {
      return config.map((item) => resolveConfigIncludes(item, basePath));
    }

    const configObj = config as Record<string, unknown>;
    const includes = configObj['$include'];

    if (includes) {
      const includePaths = Array.isArray(includes) ? includes : [includes];
      const baseDir = path.dirname(basePath);

      for (const includePath of includePaths) {
        if (typeof includePath !== 'string') continue;

        const resolvedPath = path.resolve(baseDir, includePath);
        if (deps.fs.existsSync(resolvedPath)) {
          try {
            const includeRaw = deps.fs.readFileSync(resolvedPath, 'utf-8');
            const includeParsed = deps.json5.parse(includeRaw);
            const resolvedInclude = resolveConfigIncludes(
              includeParsed,
              resolvedPath,
            );

            // 合并包含的配置
            if (
              resolvedInclude !== null &&
              typeof resolvedInclude === 'object' &&
              !Array.isArray(resolvedInclude)
            ) {
              Object.assign(
                configObj,
                resolvedInclude as Record<string, unknown>,
              );
            }
          } catch (err) {
            deps.logger.error(
              `Failed to include config file ${resolvedPath}:`,
              err,
            );
          }
        } else {
          deps.logger.warn(`Include file not found: ${resolvedPath}`);
        }
      }

      // 移除 $include 字段
      delete configObj['$include'];
    }

    // 递归处理其他字段
    for (const [key, value] of Object.entries(configObj)) {
      configObj[key] = resolveConfigIncludes(value, basePath);
    }

    return configObj;
  }

  // 加载配置
  function loadConfig(): OpenClawConfig {
    try {
      if (!deps.fs.existsSync(configPath)) {
        return applyAllDefaults({});
      }

      const raw = deps.fs.readFileSync(configPath, 'utf-8');
      const parsed = deps.json5.parse(raw);
      const resolvedIncludes = resolveConfigIncludes(parsed, configPath);
      const resolvedConfig = resolveConfigEnvVars(resolvedIncludes, deps.env);

      const validated = validateConfigObject(resolvedConfig);
      if (!validated.valid) {
        deps.logger.error(
          `Invalid config at ${configPath}:\n${validated.errors.map((e) => `- ${e.path}: ${e.message}`).join('\n')}`,
        );
        return applyAllDefaults({});
      }

      applyConfigEnvVars(validated.config, deps.env);
      return applyAllDefaults(validated.config);
    } catch (err) {
      deps.logger.error(`Failed to read config at ${configPath}`, err);
      return applyAllDefaults({});
    }
  }

  // 读取配置文件快照
  async function readConfigFileSnapshot(): Promise<ConfigFileSnapshot> {
    const exists = deps.fs.existsSync(configPath);
    if (!exists) {
      const hash = hashConfigRaw(null);
      const config = applyAllDefaults({});
      return {
        path: configPath,
        exists: false,
        raw: null,
        parsed: {},
        resolved: {},
        valid: true,
        config,
        hash,
        issues: [],
        warnings: [],
        legacyIssues: [],
      };
    }

    try {
      const raw = deps.fs.readFileSync(configPath, 'utf-8');
      const hash = hashConfigRaw(raw);
      const parsedRes = parseConfigJson5(raw, deps.json5);

      if (!parsedRes.ok) {
        return {
          path: configPath,
          exists: true,
          raw,
          parsed: {},
          resolved: {},
          valid: false,
          config: {},
          hash,
          issues: [
            { path: '', message: `JSON5 parse failed: ${parsedRes.error}` },
          ],
          warnings: [],
          legacyIssues: [],
        };
      }

      const resolvedIncludes = resolveConfigIncludes(
        parsedRes.parsed,
        configPath,
      );
      const resolvedConfig = resolveConfigEnvVars(resolvedIncludes, deps.env);
      const validated = validateConfigObject(resolvedConfig);

      if (!validated.valid) {
        return {
          path: configPath,
          exists: true,
          raw,
          parsed: parsedRes.parsed,
          resolved: resolvedConfig as OpenClawConfig,
          valid: false,
          config: resolvedConfig as OpenClawConfig,
          hash,
          issues: validated.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
          warnings: [],
          legacyIssues: [],
        };
      }

      const config = applyAllDefaults(validated.config);
      return {
        path: configPath,
        exists: true,
        raw,
        parsed: parsedRes.parsed,
        resolved: resolvedConfig as OpenClawConfig,
        valid: true,
        config,
        hash,
        issues: [],
        warnings: [],
        legacyIssues: [],
      };
    } catch (err) {
      return {
        path: configPath,
        exists: true,
        raw: null,
        parsed: {},
        resolved: {},
        valid: false,
        config: {},
        hash: hashConfigRaw(null),
        issues: [{ path: '', message: `read failed: ${String(err)}` }],
        warnings: [],
        legacyIssues: [],
      };
    }
  }

  // 写入配置文件
  async function writeConfigFile(
    cfg: OpenClawConfig,
    options: ConfigWriteOptions = {},
  ) {
    const dir = path.dirname(configPath);
    await deps.fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });

    const validated = validateConfigObject(cfg);
    if (!validated.valid) {
      const issue = validated.errors[0];
      const pathLabel = issue?.path.join('.') || '<root>';
      const issueMessage = issue?.message || 'invalid';
      throw new Error(
        `Config validation failed: ${pathLabel}: ${issueMessage}`,
      );
    }

    const stampedOutputConfig = stampConfigVersion(validated.config);
    const json = JSON.stringify(stampedOutputConfig, null, 2)
      .trimEnd()
      .concat('\n');

    const tmp = path.join(
      dir,
      `${path.basename(configPath)}.${process.pid}.${crypto.randomUUID()}.tmp`,
    );

    try {
      await deps.fs.promises.writeFile(tmp, json, {
        encoding: 'utf-8',
        mode: 0o600,
      });

      if (deps.fs.existsSync(configPath)) {
        await maintainConfigBackups(configPath, deps.fs.promises);
      }

      try {
        await deps.fs.promises.rename(tmp, configPath);
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'EPERM' || code === 'EEXIST') {
          await deps.fs.promises.copyFile(tmp, configPath);
          await deps.fs.promises.chmod(configPath, 0o600).catch(() => {});
          await deps.fs.promises.unlink(tmp).catch(() => {});
          return;
        }
        await deps.fs.promises.unlink(tmp).catch(() => {});
        throw err;
      }
    } catch (err) {
      throw err;
    }
  }

  return {
    configPath,
    loadConfig,
    readConfigFileSnapshot,
    writeConfigFile,
  };
}

// 缓存相关
const DEFAULT_CONFIG_CACHE_MS = 200;
let configCache: {
  configPath: string;
  expiresAt: number;
  config: OpenClawConfig;
} | null = null;

// 清除配置缓存
export function clearConfigCache(): void {
  configCache = null;
}

// 解析配置缓存时间
function resolveConfigCacheMs(env: NodeJS.ProcessEnv): number {
  const raw = env.KITZ_CONFIG_CACHE_MS?.trim();
  if (raw === '' || raw === '0') {
    return 0;
  }
  if (!raw) {
    return DEFAULT_CONFIG_CACHE_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_CONFIG_CACHE_MS;
  }
  return Math.max(0, parsed);
}

// 是否使用配置缓存
function shouldUseConfigCache(env: NodeJS.ProcessEnv): boolean {
  if (env.KITZ_DISABLE_CONFIG_CACHE?.trim()) {
    return false;
  }
  return resolveConfigCacheMs(env) > 0;
}

// 加载配置（带缓存）
export function loadConfig(): OpenClawConfig {
  const io = createConfigIO();
  const configPath = io.configPath;
  const now = Date.now();

  if (shouldUseConfigCache(process.env)) {
    const cached = configCache;
    if (cached && cached.configPath === configPath && cached.expiresAt > now) {
      return cached.config;
    }
  }

  const config = io.loadConfig();

  if (shouldUseConfigCache(process.env)) {
    const cacheMs = resolveConfigCacheMs(process.env);
    if (cacheMs > 0) {
      configCache = {
        configPath,
        expiresAt: now + cacheMs,
        config,
      };
    }
  }

  return config;
}

// 读取配置文件快照
export async function readConfigFileSnapshot(): Promise<ConfigFileSnapshot> {
  return await createConfigIO().readConfigFileSnapshot();
}

// 写入配置文件
export async function writeConfigFile(
  cfg: OpenClawConfig,
  options: ConfigWriteOptions = {},
): Promise<void> {
  const io = createConfigIO();
  await io.writeConfigFile(cfg, options);
  clearConfigCache();
}
