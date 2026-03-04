import { z } from "zod";
import type { OpenClawConfig, ConfigValidationIssue } from "./types.js";

const OpenClawSchema = z.object({
  meta: z.object({
    lastTouchedVersion: z.string().optional(),
    lastTouchedAt: z.string().optional(),
  }).optional(),
  agents: z.object({
    defaults: z.object({
      workspace: z.string().optional(),
      model: z.object({
        primary: z.string().optional(),
        fallbacks: z.array(z.string()).optional(),
      }).optional(),
    }).optional(),
    list: z.array(z.object({
      id: z.string().optional(),
      identity: z.object({
        name: z.string().optional(),
        avatar: z.string().optional(),
      }).optional(),
    })).optional(),
  }).optional(),
  channels: z.object({
    whatsapp: z.object({
      enabled: z.boolean().optional(),
      allowFrom: z.array(z.string()).optional(),
    }).optional(),
    telegram: z.object({
      enabled: z.boolean().optional(),
      token: z.string().optional(),
    }).optional(),
  }).optional(),
  env: z.record(z.string(), z.string()).optional(),
  $include: z.union([z.string(), z.array(z.string())]).optional(),
  plugins: z.object({
    entries: z.record(z.string(), z.object({
      config: z.record(z.string(), z.unknown()).optional(),
    })).optional(),
    allow: z.array(z.string()).optional(),
    deny: z.array(z.string()).optional(),
  }).optional(),
}).strict();

export function validateConfigObjectRaw(raw: unknown): { ok: true; config: OpenClawConfig } | { ok: false; issues: ConfigValidationIssue[] } {
  const validated = OpenClawSchema.safeParse(raw);
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
    config: validated.data as OpenClawConfig,
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
    if (config.channels.whatsapp?.enabled && !config.channels.whatsapp.allowFrom) {
      warnings.push({
        path: "channels.whatsapp.allowFrom",
        message: "WhatsApp is enabled but allowFrom is not set. This may allow unwanted messages.",
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
      if (agent.identity?.avatar && !agent.identity.avatar.startsWith("http") && !agent.identity.avatar.startsWith("data:")) {
        warnings.push({
          path: `agents.list.${index}.identity.avatar`,
          message: "Avatar should be a URL or data URI.",
        });
      }
    }
  }

  return {
    ok: true,
    config,
    warnings,
  };
}
