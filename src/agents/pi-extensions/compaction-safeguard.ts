import type { OpenClawConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("compaction-safeguard");

export type CompactionSafeguardSettings = {
  enabled: boolean;
  minMessages: number;
  minTokens: number;
  maxCompactionRatio: number;
  cooldownSeconds: number;
};

export function getCompactionSafeguardSettings(cfg: OpenClawConfig): CompactionSafeguardSettings {
  const defaultSettings: CompactionSafeguardSettings = {
    enabled: true,
    minMessages: 5,
    minTokens: 1000,
    maxCompactionRatio: 0.5,
    cooldownSeconds: 60,
  };
  
  // 从配置中读取设置，如果没有则使用默认值
  const cfgSettings = cfg?.agents?.compactionSafeguard;
  
  return {
    ...defaultSettings,
    ...cfgSettings,
  };
}

export function shouldAllowCompaction(params: {
  settings: CompactionSafeguardSettings;
  messageCount: number;
  tokenCount: number;
  lastCompactionTime?: number;
}): { allowed: boolean; reason?: string } {
  const { settings, messageCount, tokenCount, lastCompactionTime } = params;
  
  if (!settings.enabled) {
    return { allowed: true, reason: "Compaction safeguard disabled" };
  }
  
  if (messageCount < settings.minMessages) {
    return {
      allowed: false,
      reason: `Not enough messages (${messageCount} < ${settings.minMessages})`,
    };
  }
  
  if (tokenCount < settings.minTokens) {
    return {
      allowed: false,
      reason: `Not enough tokens (${tokenCount} < ${settings.minTokens})`,
    };
  }
  
  if (lastCompactionTime) {
    const timeSinceLastCompaction = (Date.now() - lastCompactionTime) / 1000;
    if (timeSinceLastCompaction < settings.cooldownSeconds) {
      return {
        allowed: false,
        reason: `Cooldown period active (${Math.round(timeSinceLastCompaction)}s < ${settings.cooldownSeconds}s)`,
      };
    }
  }
  
  return { allowed: true };
}

export function calculateCompactionTarget(params: {
  settings: CompactionSafeguardSettings;
  currentTokens: number;
  contextWindow: number;
}): number {
  const { settings, currentTokens, contextWindow } = params;
  
  // 计算压缩目标，确保不超过最大压缩比例
  const maxCompaction = currentTokens * settings.maxCompactionRatio;
  const contextTarget = contextWindow * 0.8; // 保留20%的缓冲区
  
  return Math.min(maxCompaction, contextTarget);
}
