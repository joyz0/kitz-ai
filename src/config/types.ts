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

// 日志配置类型
export type LoggingConfig = {
  level?: 'silent' | 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  file?: string;
  maxFileBytes?: number;
  consoleLevel?:
    | 'silent'
    | 'fatal'
    | 'error'
    | 'warn'
    | 'info'
    | 'debug'
    | 'trace';
  consoleStyle?: 'pretty' | 'compact' | 'json';
  redactSensitive?: 'off' | 'tools';
  redactPatterns?: string[];
};

// 会话配置类型
export type SessionConfig = {
  scope?: 'per-sender' | 'global';
  dmScope?: 'main' | 'per-peer' | 'per-channel-peer';
  identityLinks?: Record<string, string[]>;
  idleMinutes?: number;
  reset?: {
    mode?: 'daily' | 'idle';
    atHour?: number;
    idleMinutes?: number;
  };
};

// 模型配置类型
export type ModelsConfig = {
  defaults?: {
    primary?: string;
    fallbacks?: string[];
  };
  providers?: Record<string, any>;
};

// 智能体配置类型
export type AgentIdentity = {
  name?: string;
  avatar?: string;
};

export type AgentModelConfig = {
  primary?: string;
  fallbacks?: string[];
};

export type AgentDefaults = {
  workspace?: string;
  model?: AgentModelConfig;
};

export type Agent = {
  id: string;
  identity?: AgentIdentity;
  model?: AgentModelConfig;
  workspace?: string;
};

export type AgentsConfig = {
  defaults?: AgentDefaults;
  list?: Agent[];
};

// 通道配置类型
export type ChannelsConfig = {
  whatsapp?: {
    enabled?: boolean;
    allowFrom?: string[];
  };
  telegram?: {
    enabled?: boolean;
    token?: string;
  };
};

// 主配置类型
export type OpenClawConfig = {
  $include?: string | string[];
  meta?: {
    lastTouchedVersion?: string;
    lastTouchedAt?: string;
  };
  env?: {
    shellEnv?: {
      enabled?: boolean;
      timeoutMs?: number;
    };
    vars?: Record<string, string>;
    [key: string]:
      | string
      | Record<string, string>
      | { enabled?: boolean; timeoutMs?: number }
      | undefined;
  };
  logging?: LoggingConfig;
  session?: SessionConfig;
  models?: ModelsConfig;
  agents?: AgentsConfig;
  channels?: ChannelsConfig;
  // 可以根据需要添加更多配置模块
};
