import type { AuthProfileStore, ProfileUsageStats } from "./types.js";

export function clearExpiredCooldowns(store: AuthProfileStore, now: number): void {
  if (!store.usageStats) {
    return;
  }
  
  for (const [profileId, stats] of Object.entries(store.usageStats)) {
    if (stats.cooldownUntil && stats.cooldownUntil < now) {
      const updatedStats = { ...stats };
      delete updatedStats.cooldownUntil;
      store.usageStats[profileId] = updatedStats;
    }
  }
}

export function isProfileInCooldown(store: AuthProfileStore, profileId: string): boolean {
  const stats = store.usageStats?.[profileId];
  if (!stats) {
    return false;
  }
  return stats.cooldownUntil !== undefined && stats.cooldownUntil > Date.now();
}

export function resolveProfileUnusableUntil(stats: ProfileUsageStats): number | undefined {
  return stats.cooldownUntil || stats.disabledUntil;
}
