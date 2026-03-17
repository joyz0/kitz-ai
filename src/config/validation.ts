import { OpenClawConfigSchema } from "./zod-schema.js";
import type { OpenClawConfig, ConfigValidationIssue } from "./zod-schema.js";

export function validateConfigObjectRaw(
  raw: unknown
): { ok: true; config: OpenClawConfig } | { ok: false; issues: ConfigValidationIssue[] } {
  const validated = OpenClawConfigSchema.safeParse(raw);
  if (!validated.success) {
    return {
      ok: false,
      issues: validated.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }
  return {
    ok: true,
    config: validated.data,
  };
}

export function validateConfigObject(
  raw: unknown
): { ok: true; config: OpenClawConfig } | { ok: false; issues: ConfigValidationIssue[] } {
  return validateConfigObjectRaw(raw);
}

export function validateConfigObjectRawWithPlugins(raw: unknown):
  | {
      ok: true;
      config: OpenClawConfig;
      warnings: ConfigValidationIssue[];
    }
  | {
      ok: false;
      issues: ConfigValidationIssue[];
      warnings: ConfigValidationIssue[];
    } {
  return validateConfigObjectWithPlugins(raw);
}

export function validateConfigObjectWithPlugins(raw: unknown):
  | {
      ok: true;
      config: OpenClawConfig;
      warnings: ConfigValidationIssue[];
    }
  | {
      ok: false;
      issues: ConfigValidationIssue[];
      warnings: ConfigValidationIssue[];
    } {
  const base = validateConfigObjectRaw(raw);
  if (!base.ok) {
    return { ok: false, issues: (base as any).issues || [], warnings: [] };
  }

  const config = base.config;
  const issues: ConfigValidationIssue[] = [];
  const warnings: ConfigValidationIssue[] = [];

  // 验证通道配置
  if (config.channels) {
    // WhatsApp 验证
    if (config.channels.whatsapp?.enabled && !config.channels.whatsapp.allowFrom) {
      warnings.push({
        path: "channels.whatsapp.allowFrom",
        message: "WhatsApp is enabled but allowFrom is not set. This may allow unwanted messages.",
      });
    }

    // Telegram 验证
    if (config.channels.telegram?.enabled && !config.channels.telegram.token) {
      issues.push({
        path: "channels.telegram.token",
        message: "Telegram is enabled but token is not set.",
      });
    }
  }

  // 验证智能体配置
  if (config.agents?.list) {
    for (const [index, agent] of Array.from(config.agents.list.entries())) {
      // 验证头像
      if (
        agent.identity?.avatar &&
        !agent.identity.avatar.startsWith("http") &&
        !agent.identity.avatar.startsWith("data:")
      ) {
        warnings.push({
          path: `agents.list.${index}.identity.avatar`,
          message: "Avatar should be a URL or data URI.",
        });
      }

      // 验证模型配置
      if (agent.model?.primary && agent.model.fallbacks?.length === 0) {
        warnings.push({
          path: `agents.list.${index}.model.fallbacks`,
          message: `Agent has primary model ${agent.model.primary} but no fallbacks specified.`,
        });
      }
    }
  }

  // 验证模型配置
  if (config.models?.providers) {
    for (const [provider, providerConfig] of Object.entries(config.models.providers)) {
      if (typeof providerConfig === "object" && providerConfig !== null) {
        const configObj = providerConfig as Record<string, unknown>;
        if (configObj.apiKey === "") {
          warnings.push({
            path: `models.providers.${provider}.apiKey`,
            message: `API key for ${provider} is empty.`,
          });
        }
      }
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
      warnings,
    };
  }

  return {
    ok: true,
    config,
    warnings,
  };
}
