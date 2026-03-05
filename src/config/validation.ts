import { OpenClawConfigSchema } from "./zod-schema.js";
import type { OpenClawConfig, ConfigValidationIssue } from "./zod-schema.js";

export function validateConfigObjectRaw(
  raw: unknown
):
  | { ok: true; config: OpenClawConfig }
  | { ok: false; issues: ConfigValidationIssue[] } {
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
    return { ok: false, issues: base.issues, warnings: [] };
  }

  const config = base.config;
  const issues: ConfigValidationIssue[] = [];
  const warnings: ConfigValidationIssue[] = [];

  // 验证通道配置
  if (config.channels) {
    if (
      config.channels.whatsapp?.enabled &&
      !config.channels.whatsapp.allowFrom
    ) {
      warnings.push({
        path: "channels.whatsapp.allowFrom",
        message:
          "WhatsApp is enabled but allowFrom is not set. This may allow unwanted messages.",
      });
    }

    if (config.channels.telegram?.enabled && !config.channels.telegram.token) {
      issues.push({
        path: "channels.telegram.token",
        message: "Telegram is enabled but token is not set.",
      });
    }
  }

  // 验证智能体配置
  if (config.agents?.list) {
    for (const [index, agent] of config.agents.list.entries()) {
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
