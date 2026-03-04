// 环境变量替换功能

// 环境变量正则表达式，匹配 ${VAR_NAME} 格式
export const ENV_VAR_RE = /\$\{([A-Z_][A-Z0-9_]*)\}/g;

// 缺少环境变量错误
export class MissingEnvVarError extends Error {
  constructor(public readonly varName: string) {
    super(`Missing environment variable: ${varName}`);
    this.name = 'MissingEnvVarError';
  }
}

// 检查字符串是否包含环境变量引用
export function containsEnvVarReference(value: string): boolean {
  return ENV_VAR_RE.test(value);
}

// 递归替换配置中的环境变量
export function resolveConfigEnvVars(
  config: unknown,
  env: Record<string, string | undefined>,
  missingVars: Set<string> = new Set(),
): unknown {
  if (typeof config === 'string') {
    return config.replace(ENV_VAR_RE, (_, varName) => {
      const value = env[varName];
      if (value === undefined) {
        missingVars.add(varName);
        return `\${${varName}}`;
      }
      return value;
    });
  }

  if (Array.isArray(config)) {
    return config.map((item) => resolveConfigEnvVars(item, env, missingVars));
  }

  if (config !== null && typeof config === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      result[key] = resolveConfigEnvVars(value, env, missingVars);
    }
    return result;
  }

  return config;
}

// 应用配置中的环境变量到 process.env
export function applyConfigEnvVars(config: any, env: NodeJS.ProcessEnv): void {
  if (!config || typeof config !== 'object' || !config.env) {
    return;
  }

  const envConfig = config.env;

  // 处理 vars 对象
  if (envConfig.vars && typeof envConfig.vars === 'object') {
    for (const [key, value] of Object.entries(envConfig.vars)) {
      if (typeof value === 'string' && !(key in env)) {
        env[key] = value;
      }
    }
  }

  // 处理直接在 env 下的字符串值
  for (const [key, value] of Object.entries(envConfig)) {
    if (
      key !== 'shellEnv' &&
      key !== 'vars' &&
      typeof value === 'string' &&
      !(key in env)
    ) {
      env[key] = value;
    }
  }
}
