import type { OpenClawConfig } from "../../config/config.js";

export type ContextPruningSettings = {
  enabled: boolean;
  maxTokens: number;
  minMessages: number;
  pruneRatio: number;
  keepRecentMessages: number;
  keepImportantMessages: boolean;
  importantMessagePatterns: string[];
};

export function getContextPruningSettings(cfg: OpenClawConfig): ContextPruningSettings {
  const defaultSettings: ContextPruningSettings = {
    enabled: true,
    maxTokens: 10000,
    minMessages: 10,
    pruneRatio: 0.3,
    keepRecentMessages: 5,
    keepImportantMessages: true,
    importantMessagePatterns: [
      "#",
      "!",
      "@",
      "TODO",
      "FIXME",
      "IMPORTANT",
      "NOTE",
    ],
  };
  
  // 从配置中读取设置，如果没有则使用默认值
  const cfgSettings = cfg?.agents?.contextPruning;
  
  return {
    ...defaultSettings,
    ...cfgSettings,
  };
}
