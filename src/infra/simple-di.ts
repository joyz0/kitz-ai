// 简单函数参数式依赖注入工具

/**
 * 依赖注入配置接口
 * 用于定义模块的依赖项和默认值
 */
export interface DependencyConfig<T extends Record<string, any>> {
  /**
   * 依赖项的默认值
   */
  defaults: T;
  /**
   * 验证依赖项的函数
   */
  validate?: (deps: T) => boolean;
}

/**
 * 规范化依赖项
 * @param overrides 覆盖的依赖项
 * @param config 依赖配置
 * @returns 规范化后的依赖项
 */
export function normalizeDependencies<T extends Record<string, any>>(
  overrides: Partial<T> = {},
  config: DependencyConfig<T>
): T {
  const normalized = {
    ...config.defaults,
    ...overrides,
  };

  // 验证依赖项
  if (config.validate && !config.validate(normalized)) {
    throw new Error('依赖项验证失败');
  }

  return normalized;
}

/**
 * 创建依赖注入工厂函数
 * @param factory 工厂函数
 * @param config 依赖配置
 * @returns 带有依赖注入的工厂函数
 */
export function createFactory<T extends Record<string, any>, R>(
  factory: (deps: T) => R,
  config: DependencyConfig<T>
) {
  return (overrides: Partial<T> = {}) => {
    const deps = normalizeDependencies(overrides, config);
    return factory(deps);
  };
}

/**
 * 依赖注入装饰器
 * 用于类的构造函数依赖注入
 */
export function Injectable<T extends new (...args: any[]) => any>(constructor: T): T {
  return constructor;
}

/**
 * 依赖项类型工具
 * 用于从工厂函数中提取依赖类型
 */
export type ExtractDeps<F> = F extends (deps: infer D) => any ? D : never;

/**
 * 依赖项默认值工具
 * 用于创建依赖项默认值对象
 */
export function createDefaults<T extends Record<string, any>>(defaults: T): DependencyConfig<T> {
  return {
    defaults,
  };
}
