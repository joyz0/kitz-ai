// 配置文件 IO 操作
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import JSON5 from "json5";
import { VERSION } from "../version.js";
import { applyAllDefaults } from "./default-values.js";
import { applyConfigEnvVars, resolveConfigEnvVars } from "./env-substitution.js";
import type {
  OpenClawConfig,
  ConfigFileSnapshot,
  ConfigValidationIssue,
  LegacyConfigIssue,
} from "./zod-schema.js";
import { validateConfigObjectRaw, validateConfigObjectWithPlugins } from "./validation.js";
import {
  ConfigRuntimeRefreshError,
  getRuntimeConfigSnapshot,
  getRuntimeConfigSourceSnapshot,
  projectConfigOntoRuntimeSourceSnapshot,
  setRuntimeConfigSnapshot,
  setRuntimeConfigSnapshotRefreshHandler,
  getRuntimeConfigSnapshotRefreshHandler,
  clearRuntimeConfigSnapshot,
} from "./runtime-overrides.js";
import { findLegacyConfigIssues } from "./legacy-migrate.js";

// 配置文件审计日志文件名
const CONFIG_AUDIT_LOG_FILENAME = "config-audit.jsonl";

// 哈希配置原始内容
function hashConfigRaw(raw: string | null): string {
  return crypto
    .createHash("sha256")
    .update(raw ?? "")
    .digest("hex");
}

// 解析 JSON5 配置文件
export function parseConfigJson5(
  raw: string,
  json5: { parse: (value: string) => unknown } = JSON5
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
  logger?: Pick<typeof console, "error" | "warn">;
};

// 规范化依赖
function normalizeDeps(overrides: ConfigIoDeps = {}): Required<ConfigIoDeps> {
  const env = overrides.env ?? process.env;
  const homedir = overrides.homedir ?? os.homedir;

  return {
    fs: overrides.fs ?? fs,
    json5: overrides.json5 ?? JSON5,
    env,
    homedir,
    configPath: overrides.configPath ?? resolveConfigPath(env, homedir),
    logger: overrides.logger ?? console,
  };
}

// 解析配置路径
function resolveConfigPath(env: NodeJS.ProcessEnv, homedir: () => string): string {
  if (env.KITZ_CONFIG_PATH) {
    return env.KITZ_CONFIG_PATH;
  }
  // 检查当前项目目录是否存在 .kitz 目录
  const currentDir = process.cwd();
  const projectConfigPath = path.join(currentDir, ".kitz", "config.json5");
  if (fs.existsSync(projectConfigPath)) {
    return projectConfigPath;
  }
  // 默认配置路径
  return path.join(homedir(), ".kitz", "config.json5");
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
  fsPromises: typeof fs.promises
): Promise<void> {
  const backupPath = `${configPath}.bak`;
  if (
    await fsPromises
      .access(backupPath, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false)
  ) {
    await fsPromises.rename(backupPath, `${configPath}.bak.old`).catch(() => {});
  }
  await fsPromises.copyFile(configPath, backupPath).catch(() => {});
}

// 创建配置 IO 实例
export function createConfigIO(overrides: ConfigIoDeps = {}) {
  const deps = normalizeDeps(overrides);
  const configPath = deps.configPath;

  // 解析 $include 指令
  function resolveConfigIncludes(config: unknown, basePath: string): unknown {
    if (config === null || typeof config !== "object") {
      return config;
    }

    if (Array.isArray(config)) {
      return config.map((item) => resolveConfigIncludes(item, basePath));
    }

    const configObj = config as Record<string, unknown>;
    const includes = configObj["$include"];

    if (includes) {
      const includePaths = Array.isArray(includes) ? includes : [includes];
      const baseDir = path.dirname(basePath);

      for (const includePath of includePaths) {
        if (typeof includePath !== "string") continue;

        const resolvedPath = path.resolve(baseDir, includePath);
        if (deps.fs.existsSync(resolvedPath)) {
          try {
            const includeRaw = deps.fs.readFileSync(resolvedPath, "utf-8");
            const includeParsed = deps.json5.parse(includeRaw);
            const resolvedInclude = resolveConfigIncludes(includeParsed, resolvedPath);

            // 合并包含的配置
            if (
              resolvedInclude !== null &&
              typeof resolvedInclude === "object" &&
              !Array.isArray(resolvedInclude)
            ) {
              Object.assign(configObj, resolvedInclude as Record<string, unknown>);
            }
          } catch (err) {
            deps.logger.error(`Failed to include config file ${resolvedPath}:`, err);
          }
        } else {
          deps.logger.warn(`Include file not found: ${resolvedPath}`);
        }
      }

      // 移除 $include 字段
      delete configObj["$include"];
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

      const raw = deps.fs.readFileSync(configPath, "utf-8");
      const parsed = deps.json5.parse(raw);
      const resolvedIncludes = resolveConfigIncludes(parsed, configPath);
      const resolvedConfig = resolveConfigEnvVars(resolvedIncludes, deps.env);

      const validated = validateConfigObjectWithPlugins(resolvedConfig);
      if (!validated.ok) {
        const details = validated.issues.map((iss) => `- ${iss.path}: ${iss.message}`).join("\n");
        deps.logger.error(`Invalid config at ${configPath}:\n${details}`);
        return applyAllDefaults({});
      }

      if (validated.warnings.length > 0) {
        const details = validated.warnings.map((iss) => `- ${iss.path}: ${iss.message}`).join("\n");
        deps.logger.warn(`Config warnings:\n${details}`);
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
      const raw = deps.fs.readFileSync(configPath, "utf-8");
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
          issues: [{ path: "", message: `JSON5 parse failed: ${parsedRes.error}` }],
          warnings: [],
          legacyIssues: [],
        };
      }

      const resolvedIncludes = resolveConfigIncludes(parsedRes.parsed, configPath);
      const resolvedConfig = resolveConfigEnvVars(resolvedIncludes, deps.env);

      // 检测遗留配置问题
      const legacyIssues = findLegacyConfigIssues(resolvedConfig, parsedRes.parsed);

      const validated = validateConfigObjectWithPlugins(resolvedConfig);

      if (!validated.ok) {
        return {
          path: configPath,
          exists: true,
          raw,
          parsed: parsedRes.parsed,
          resolved: resolvedConfig as OpenClawConfig,
          valid: false,
          config: resolvedConfig as OpenClawConfig,
          hash,
          issues: validated.issues,
          warnings: validated.warnings,
          legacyIssues,
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
        warnings: validated.warnings,
        legacyIssues,
      };
    } catch (err) {
      const nodeErr = err as NodeJS.ErrnoException;
      let message: string;
      if (nodeErr?.code === "EACCES") {
        // 权限被拒绝 - 在 Docker/容器部署中常见，配置文件由 root 拥有但网关以非 root 用户运行
        const uid = process.getuid?.();
        const uidHint = typeof uid === "number" ? String(uid) : "$(id -u)";
        message = [
          `read failed: ${String(err)}`,
          "",
          "Config file is not readable by the current process. If running in a container",
          "or 1-click deployment, fix ownership with:",
          `  chown ${uidHint} "${configPath}"`,
          "Then restart the gateway.",
        ].join("\n");
        deps.logger.error(message);
      } else {
        message = `read failed: ${String(err)}`;
      }
      return {
        path: configPath,
        exists: true,
        raw: null,
        parsed: {},
        resolved: {},
        valid: false,
        config: {},
        hash: hashConfigRaw(null),
        issues: [{ path: "", message }],
        warnings: [],
        legacyIssues: [],
      };
    }
  }

  // 写入配置文件
  async function writeConfigFile(cfg: OpenClawConfig, options: ConfigWriteOptions = {}) {
    const dir = path.dirname(configPath);
    await deps.fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });

    // 收紧状态目录权限
    await tightenStateDirPermissionsIfNeeded({
      configPath,
      env: deps.env,
      homedir: deps.homedir,
      fsModule: deps.fs,
    });

    const validated = validateConfigObjectWithPlugins(cfg);
    if (!validated.ok) {
      const issue = validated.issues[0];
      const pathLabel = issue?.path || "<root>";
      const issueMessage = issue?.message || "invalid";
      throw new Error(`Config validation failed: ${pathLabel}: ${issueMessage}`);
    }

    if (validated.warnings.length > 0) {
      const details = validated.warnings
        .map((warning) => `- ${warning.path}: ${warning.message}`)
        .join("\n");
      deps.logger.warn(`Config warnings:\n${details}`);
    }

    const stampedOutputConfig = stampConfigVersion(validated.config);
    const json = JSON.stringify(stampedOutputConfig, null, 2).trimEnd().concat("\n");

    const tmp = path.join(
      dir,
      `${path.basename(configPath)}.${process.pid}.${crypto.randomUUID()}.tmp`
    );

    try {
      await deps.fs.promises.writeFile(tmp, json, {
        encoding: "utf-8",
        mode: 0o600,
      });

      if (deps.fs.existsSync(configPath)) {
        await maintainConfigBackups(configPath, deps.fs.promises);
      }

      try {
        await deps.fs.promises.rename(tmp, configPath);
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "EPERM" || code === "EEXIST") {
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

  // 收紧状态目录权限
  async function tightenStateDirPermissionsIfNeeded(params: {
    configPath: string;
    env: NodeJS.ProcessEnv;
    homedir: () => string;
    fsModule: typeof fs;
  }): Promise<void> {
    if (process.platform === "win32") {
      return;
    }
    const stateDir = path.dirname(params.configPath);
    const configDir = path.dirname(params.configPath);
    if (path.resolve(configDir) !== path.resolve(stateDir)) {
      return;
    }
    try {
      const stat = await params.fsModule.promises.stat(configDir);
      const mode = stat.mode & 0o777;
      if ((mode & 0o077) === 0) {
        return;
      }
      await params.fsModule.promises.chmod(configDir, 0o700);
    } catch {
      // 最佳努力硬化，调用者仍然需要配置写入继续
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
export function resolveConfigCacheMs(env: NodeJS.ProcessEnv): number {
  const raw = env.KITZ_CONFIG_CACHE_MS?.trim();
  if (raw === "" || raw === "0") {
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
export function shouldUseConfigCache(env: NodeJS.ProcessEnv): boolean {
  if (env.KITZ_DISABLE_CONFIG_CACHE?.trim()) {
    return false;
  }
  return resolveConfigCacheMs(env) > 0;
}

// 加载配置（带缓存）
export function loadConfig(): OpenClawConfig {
  const runtimeSnapshot = getRuntimeConfigSnapshot();
  if (runtimeSnapshot) {
    return runtimeSnapshot;
  }

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

// 读取配置文件快照用于写入
export type ReadConfigFileSnapshotForWriteResult = {
  snapshot: ConfigFileSnapshot;
  writeOptions: ConfigWriteOptions;
};

export async function readConfigFileSnapshotForWrite(): Promise<ReadConfigFileSnapshotForWriteResult> {
  const io = createConfigIO();
  const snapshot = await io.readConfigFileSnapshot();
  return {
    snapshot,
    writeOptions: {
      expectedConfigPath: io.configPath,
    },
  };
}

// 解析配置快照哈希
export function resolveConfigSnapshotHash(snapshot: {
  hash?: string;
  raw?: string | null;
}): string | null {
  if (typeof snapshot.hash === "string") {
    const trimmed = snapshot.hash.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  if (typeof snapshot.raw !== "string") {
    return null;
  }
  return hashConfigRaw(snapshot.raw);
}

// 读取最佳配置
export async function readBestEffortConfig(): Promise<OpenClawConfig> {
  const snapshot = await readConfigFileSnapshot();
  return snapshot.valid ? loadConfig() : snapshot.config;
}

// 写入配置文件
export async function writeConfigFile(
  cfg: OpenClawConfig,
  options: ConfigWriteOptions = {}
): Promise<void> {
  const io = createConfigIO();
  let nextCfg = cfg;
  const hadRuntimeSnapshot = Boolean(getRuntimeConfigSnapshot());
  const hadBothSnapshots = Boolean(getRuntimeConfigSnapshot() && getRuntimeConfigSourceSnapshot());

  if (hadBothSnapshots) {
    nextCfg = projectConfigOntoRuntimeSourceSnapshot(cfg);
  }

  const sameConfigPath =
    options.expectedConfigPath === undefined || options.expectedConfigPath === io.configPath;
  await io.writeConfigFile(nextCfg, {
    envSnapshotForRestore: sameConfigPath ? options.envSnapshotForRestore : undefined,
    unsetPaths: options.unsetPaths,
  });

  clearConfigCache();

  // 处理运行时配置快照刷新
  const refreshHandler = getRuntimeConfigSnapshotRefreshHandler();
  if (refreshHandler) {
    try {
      const refreshed = await refreshHandler.refresh({ sourceConfig: nextCfg });
      if (refreshed) {
        return;
      }
    } catch (error) {
      try {
        refreshHandler.clearOnRefreshFailure?.();
      } catch {
        // 保持原始刷新失败作为表面错误
      }
      const detail = error instanceof Error ? error.message : String(error);
      throw new ConfigRuntimeRefreshError(
        `Config was written to ${io.configPath}, but runtime snapshot refresh failed: ${detail}`,
        { cause: error }
      );
    }
  }

  if (hadBothSnapshots) {
    // 从磁盘原子性刷新两个快照，以便后续读取获取标准化配置
    const fresh = io.loadConfig();
    setRuntimeConfigSnapshot(fresh, nextCfg);
    return;
  }

  if (hadRuntimeSnapshot) {
    clearRuntimeConfigSnapshot();
  }
}
