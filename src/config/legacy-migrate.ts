// 遗留配置迁移功能
import type { OpenClawConfig, LegacyConfigIssue } from './zod-schema.js';

/**
 * 迁移遗留配置
 */
export function migrateLegacyConfig(config: OpenClawConfig): OpenClawConfig {
  // 这里可以添加遗留配置迁移逻辑
  return config;
}

/**
 * 查找遗留配置问题
 */
export function findLegacyConfigIssues(
  resolvedConfig: unknown,
  parsedSource: unknown
): LegacyConfigIssue[] {
  const issues: LegacyConfigIssue[] = [];
  
  // 这里可以添加遗留配置问题检测逻辑
  
  return issues;
}
