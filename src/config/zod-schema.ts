import { z } from "zod";

// 日志配置 Schema
export const LoggingSchema = z
  .object({
    level: z
      .enum(["silent", "fatal", "error", "warn", "info", "debug", "trace"])
      .optional(),
    file: z.string().optional(),
    maxFileBytes: z.number().int().positive().optional(),
    consoleLevel: z
      .enum(["silent", "fatal", "error", "warn", "info", "debug", "trace"])
      .optional(),
    consoleStyle: z.enum(["pretty", "compact", "json"]).optional(),
    redactSensitive: z.enum(["off", "tools"]).optional(),
    redactPatterns: z.array(z.string()).optional(),
  })
  .strict();

// 会话重置配置 Schema
export const SessionResetSchema = z
  .object({
    mode: z.enum(["daily", "idle"]).optional(),
    atHour: z.number().min(0).max(23).optional(),
    idleMinutes: z.number().min(0).optional(),
  })
  .strict();

// 会话配置 Schema
export const SessionSchema = z
  .object({
    scope: z.enum(["per-sender", "global"]).optional(),
    dmScope: z.enum(["main", "per-peer", "per-channel-peer"]).optional(),
    identityLinks: z.record(z.array(z.string())).optional(),
    idleMinutes: z.number().min(0).optional(),
    reset: SessionResetSchema.optional(),
  })
  .strict();

// 模型配置 Schema
export const ModelsSchema = z
  .object({
    defaults: z
      .object({
        primary: z.string().optional(),
        fallbacks: z.array(z.string()).optional(),
      })
      .optional(),
    providers: z.record(z.unknown()).optional(),
  })
  .strict();

// 环境配置 Schema
export const EnvSchema = z
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
export const MetaSchema = z
  .object({
    version: z.string().optional(),
    lastTouchedVersion: z.string().optional(),
    lastTouchedAt: z.string().optional(),
  })
  .strict();

// 智能体身份配置 Schema
export const AgentIdentitySchema = z
  .object({
    name: z.string().optional(),
    avatar: z.string().optional(),
  })
  .strict();

// 智能体模型配置 Schema
export const AgentModelSchema = z
  .object({
    primary: z.string().optional(),
    fallbacks: z.array(z.string()).optional(),
  })
  .strict();

// 智能体默认配置 Schema
export const AgentDefaultsSchema = z
  .object({
    workspace: z.string().optional(),
    model: AgentModelSchema.optional(),
  })
  .strict();

// 智能体配置 Schema
export const AgentSchema = z
  .object({
    id: z.string(),
    identity: AgentIdentitySchema.optional(),
    model: AgentModelSchema.optional(),
    workspace: z.string().optional(),
  })
  .strict();

// 通道配置 Schema
export const ChannelsSchema = z
  .object({
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
  })
  .strict();

// 智能体列表配置 Schema
export const AgentsSchema = z
  .object({
    defaults: AgentDefaultsSchema.optional(),
    list: z.array(AgentSchema).optional(),
  })
  .strict();

// 插件配置 Schema
export const PluginEntrySchema = z
  .object({
    enabled: z.boolean().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const PluginsSchema = z
  .object({
    enabled: z.boolean().optional(),
    allow: z.array(z.string()).optional(),
    deny: z.array(z.string()).optional(),
    entries: z.record(z.string(), PluginEntrySchema).optional(),
  })
  .strict();

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
    plugins: PluginsSchema.optional(),
  })
  .strict();

// 从 Schema 推断类型
export type LoggingConfig = z.infer<typeof LoggingSchema>;
export type SessionConfig = z.infer<typeof SessionSchema>;
export type ModelsConfig = z.infer<typeof ModelsSchema>;
export type EnvConfig = z.infer<typeof EnvSchema>;
export type MetaConfig = z.infer<typeof MetaSchema>;
export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;
export type AgentModel = z.infer<typeof AgentModelSchema>;
export type AgentDefaults = z.infer<typeof AgentDefaultsSchema>;
export type Agent = z.infer<typeof AgentSchema>;
export type ChannelsConfig = z.infer<typeof ChannelsSchema>;
export type AgentsConfig = z.infer<typeof AgentsSchema>;
export type PluginEntry = z.infer<typeof PluginEntrySchema>;
export type PluginsConfig = z.infer<typeof PluginsSchema>;
export type OpenClawConfig = z.infer<typeof OpenClawConfigSchema>;

// 配置系统的核心类型定义

// 配置文件快照类型
export type ConfigFileSnapshot = {
  path: string;
  exists: boolean;
  raw: string | null;
  parsed: unknown;
  resolved: OpenClawConfig;
  valid: boolean;
  config: OpenClawConfig;
  hash?: string;
  issues: ConfigValidationIssue[];
  warnings: ConfigValidationIssue[];
  legacyIssues: LegacyConfigIssue[];
};

// 配置验证问题类型
export type ConfigValidationIssue = {
  path: string;
  message: string;
  allowedValues?: string[];
  allowedValuesHiddenCount?: number;
};

// 旧配置问题类型
export type LegacyConfigIssue = {
  path: string;
  message: string;
};
