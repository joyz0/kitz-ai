// 默认值应用功能
import type { OpenClawConfig } from "./zod-schema.ts";

// 应用日志默认值
export function applyLoggingDefaults(config: OpenClawConfig): OpenClawConfig {
  const defaultLogging = {
    level: "info" as const,
    consoleLevel: "info" as const,
    consoleStyle: "pretty" as const,
    redactSensitive: "tools" as const,
  };

  return {
    ...config,
    logging: {
      ...defaultLogging,
      ...config.logging,
    },
  };
}

// 应用会话默认值
export function applySessionDefaults(config: OpenClawConfig): OpenClawConfig {
  const defaultSession = {
    scope: "per-sender" as const,
    dmScope: "main" as const,
    idleMinutes: 120,
    reset: {
      mode: "idle" as const,
      idleMinutes: 120,
    },
  };

  return {
    ...config,
    session: {
      ...defaultSession,
      ...config.session,
      reset: {
        ...defaultSession.reset,
        ...config.session?.reset,
      },
    },
  };
}

// 应用模型默认值
export function applyModelDefaults(config: OpenClawConfig): OpenClawConfig {
  const defaultModels = {
    defaults: {
      primary: "gpt-4o",
      fallbacks: ["gpt-3.5-turbo"],
    },
  };

  return {
    ...config,
    models: {
      ...defaultModels,
      ...config.models,
      defaults: {
        ...defaultModels.defaults,
        ...config.models?.defaults,
      },
    },
  };
}

// 应用元数据默认值
export function applyMetaDefaults(config: OpenClawConfig): OpenClawConfig {
  const defaultMeta = {
    version: "1.0.0",
    lastTouchedVersion: "1.0.0",
    lastTouchedAt: new Date().toISOString(),
  };

  return {
    ...config,
    meta: {
      ...defaultMeta,
      ...config.meta,
    },
  };
}

// 应用所有默认值
export function applyAllDefaults(config: OpenClawConfig): OpenClawConfig {
  return applyMetaDefaults(
    applyModelDefaults(applySessionDefaults(applyLoggingDefaults(config)))
  );
}
