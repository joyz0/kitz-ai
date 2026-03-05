import { z } from 'zod';
import type { OpenClawConfig } from './types.js';

// 日志配置 Schema
const LoggingSchema = z.object({
  level: z
    .enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .optional(),
  file: z.string().optional(),
  maxFileBytes: z.number().optional(),
  consoleLevel: z
    .enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .optional(),
  consoleStyle: z.enum(['pretty', 'compact', 'json']).optional(),
  redactSensitive: z.enum(['off', 'tools']).optional(),
  redactPatterns: z.array(z.string()).optional(),
});

// 会话重置配置 Schema
const SessionResetSchema = z.object({
  mode: z.enum(['daily', 'idle']).optional(),
  atHour: z.number().min(0).max(23).optional(),
  idleMinutes: z.number().min(0).optional(),
});

// 会话配置 Schema
const SessionSchema = z.object({
  scope: z.enum(['per-sender', 'global']).optional(),
  dmScope: z.enum(['main', 'per-peer', 'per-channel-peer']).optional(),
  identityLinks: z.record(z.array(z.string())).optional(),
  idleMinutes: z.number().min(0).optional(),
  reset: SessionResetSchema.optional(),
});

// 模型配置 Schema
const ModelsSchema = z.object({
  defaults: z
    .object({
      primary: z.string().optional(),
      fallbacks: z.array(z.string()).optional(),
    })
    .optional(),
  providers: z.record(z.any()).optional(),
});

// 环境配置 Schema
const EnvSchema = z
  .object({
    shellEnv: z
      .object({
        enabled: z.boolean().optional(),
        timeoutMs: z.number().min(1000).optional(),
      })
      .optional(),
    vars: z.record(z.string()).optional(),
  })
  .catchall(z.string());

// 元数据配置 Schema
const MetaSchema = z.object({
  lastTouchedVersion: z.string().optional(),
  lastTouchedAt: z.string().optional(),
});

// 智能体身份配置 Schema
const AgentIdentitySchema = z.object({
  name: z.string().optional(),
  avatar: z.string().optional(),
});

// 智能体模型配置 Schema
const AgentModelSchema = z.object({
  primary: z.string().optional(),
  fallbacks: z.array(z.string()).optional(),
});

// 智能体默认配置 Schema
const AgentDefaultsSchema = z.object({
  workspace: z.string().optional(),
  model: AgentModelSchema.optional(),
});

// 智能体配置 Schema
const AgentSchema = z.object({
  id: z.string(),
  identity: AgentIdentitySchema.optional(),
  model: AgentModelSchema.optional(),
  workspace: z.string().optional(),
});

// 通道配置 Schema
const ChannelsSchema = z.object({
  whatsapp: z
    .object({
      enabled: z.boolean().optional(),
      allowFrom: z.array(z.string()).optional(),
    })
    .optional(),
  telegram: z
    .object({
      enabled: z.boolean().optional(),
      token: z.string().optional(),
    })
    .optional(),
});

// 智能体列表配置 Schema
const AgentsSchema = z.object({
  defaults: AgentDefaultsSchema.optional(),
  list: z.array(AgentSchema).optional(),
});

// 主配置 Schema
export const OpenClawConfigSchema = z
  .object({
    $include: z.union([z.string(), z.array(z.string())]).optional(),
    meta: MetaSchema.optional(),
    env: EnvSchema.optional(),
    logging: LoggingSchema.optional(),
    session: SessionSchema.optional(),
    models: ModelsSchema.optional(),
    agents: AgentsSchema.optional(),
    channels: ChannelsSchema.optional(),
  })
  .strict();

// 验证配置对象
export function validateConfigObject(
  config: unknown,
):
  | { valid: true; config: OpenClawConfig }
  | { valid: false; errors: z.ZodError['errors'] } {
  const result = OpenClawConfigSchema.safeParse(config);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors,
    };
  }

  return {
    valid: true,
    config: result.data,
  };
}

// 从 Schema 推断类型
export type OpenClawConfigFromSchema = z.infer<typeof OpenClawConfigSchema>;
