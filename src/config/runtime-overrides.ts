// 配置运行时覆盖功能
import type { OpenClawConfig } from "./zod-schema.js";

/**
 * 配置运行时刷新错误
 */
export class ConfigRuntimeRefreshError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    if (options?.cause) {
      (this as any).cause = options.cause;
    }
    this.name = "ConfigRuntimeRefreshError";
  }
}

/**
 * 运行时配置快照刷新参数
 */
export type RuntimeConfigSnapshotRefreshParams = {
  sourceConfig: OpenClawConfig;
};

/**
 * 运行时配置快照刷新处理器
 */
export type RuntimeConfigSnapshotRefreshHandler = {
  refresh: (params: RuntimeConfigSnapshotRefreshParams) => boolean | Promise<boolean>;
  clearOnRefreshFailure?: () => void;
};

// 运行时配置快照
let runtimeConfigSnapshot: OpenClawConfig | null = null;
let runtimeConfigSourceSnapshot: OpenClawConfig | null = null;
let runtimeConfigSnapshotRefreshHandler: RuntimeConfigSnapshotRefreshHandler | null = null;

/**
 * 应用配置运行时覆盖
 */
export function applyConfigOverrides(config: OpenClawConfig): OpenClawConfig {
  // 这里可以添加运行时覆盖逻辑
  return config;
}

/**
 * 设置运行时配置快照
 */
export function setRuntimeConfigSnapshot(
  config: OpenClawConfig,
  sourceConfig?: OpenClawConfig
): void {
  runtimeConfigSnapshot = config;
  runtimeConfigSourceSnapshot = sourceConfig ?? null;
}

/**
 * 清除运行时配置快照
 */
export function clearRuntimeConfigSnapshot(): void {
  runtimeConfigSnapshot = null;
  runtimeConfigSourceSnapshot = null;
}

/**
 * 获取运行时配置快照
 */
export function getRuntimeConfigSnapshot(): OpenClawConfig | null {
  return runtimeConfigSnapshot;
}

/**
 * 获取运行时配置源快照
 */
export function getRuntimeConfigSourceSnapshot(): OpenClawConfig | null {
  return runtimeConfigSourceSnapshot;
}

/**
 * 检查配置是否与运行时快照结构兼容
 */
function isCompatibleTopLevelRuntimeProjectionShape(params: {
  runtimeSnapshot: OpenClawConfig;
  candidate: OpenClawConfig;
}): boolean {
  const runtime = params.runtimeSnapshot as Record<string, unknown>;
  const candidate = params.candidate as Record<string, unknown>;
  for (const key of Object.keys(runtime)) {
    if (!Object.prototype.hasOwnProperty.call(candidate, key)) {
      return false;
    }
    const runtimeValue = runtime[key];
    const candidateValue = candidate[key];
    const runtimeType = Array.isArray(runtimeValue)
      ? "array"
      : runtimeValue === null
        ? "null"
        : typeof runtimeValue;
    const candidateType = Array.isArray(candidateValue)
      ? "array"
      : candidateValue === null
        ? "null"
        : typeof candidateValue;
    if (runtimeType !== candidateType) {
      return false;
    }
  }
  return true;
}

/**
 * 将配置投影到运行时源快照
 */
export function projectConfigOntoRuntimeSourceSnapshot(config: OpenClawConfig): OpenClawConfig {
  if (!runtimeConfigSnapshot || !runtimeConfigSourceSnapshot) {
    return config;
  }
  if (config === runtimeConfigSnapshot) {
    return runtimeConfigSourceSnapshot;
  }
  if (
    !isCompatibleTopLevelRuntimeProjectionShape({
      runtimeSnapshot: runtimeConfigSnapshot,
      candidate: config,
    })
  ) {
    return config;
  }
  const runtimePatch = createMergePatch(runtimeConfigSnapshot, config);
  return applyMergePatch(runtimeConfigSourceSnapshot, runtimePatch) as OpenClawConfig;
}

/**
 * 设置运行时配置快照刷新处理器
 */
export function setRuntimeConfigSnapshotRefreshHandler(
  refreshHandler: RuntimeConfigSnapshotRefreshHandler | null
): RuntimeConfigSnapshotRefreshHandler | null {
  const oldHandler = runtimeConfigSnapshotRefreshHandler;
  runtimeConfigSnapshotRefreshHandler = refreshHandler;
  return oldHandler;
}

/**
 * 获取运行时配置快照刷新处理器
 */
export function getRuntimeConfigSnapshotRefreshHandler(): RuntimeConfigSnapshotRefreshHandler | null {
  return runtimeConfigSnapshotRefreshHandler;
}

/**
 * 创建合并补丁
 */
function createMergePatch(base: unknown, target: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(target)) {
    return structuredClone(target);
  }

  const patch: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(target)]);
  for (const key of Array.from(keys)) {
    const hasBase = key in base;
    const hasTarget = key in target;
    if (!hasTarget) {
      patch[key] = null;
      continue;
    }
    const targetValue = target[key];
    if (!hasBase) {
      patch[key] = structuredClone(targetValue);
      continue;
    }
    const baseValue = base[key];
    if (isPlainObject(baseValue) && isPlainObject(targetValue)) {
      const childPatch = createMergePatch(baseValue, targetValue);
      if (isPlainObject(childPatch) && Object.keys(childPatch).length === 0) {
        continue;
      }
      patch[key] = childPatch;
      continue;
    }
    if (!isDeepStrictEqual(baseValue, targetValue)) {
      patch[key] = structuredClone(targetValue);
    }
  }
  return patch;
}

/**
 * 应用合并补丁
 */
function applyMergePatch(base: unknown, patch: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return patch;
  }

  const result = structuredClone(base) as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = applyMergePatch(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * 检查是否为普通对象
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 深度严格相等比较
 */
function isDeepStrictEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
