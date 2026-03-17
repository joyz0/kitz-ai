import { describe, it, expect } from "vitest";
import { 
  clearExpiredCooldowns, 
  isProfileInCooldown, 
  resolveProfileUnusableUntil 
} from "../usage.js";
import type { AuthProfileStore } from "../types.js";

describe("usage", () => {
  describe("clearExpiredCooldowns", () => {
    it("should not modify store if usageStats is undefined", () => {
      const store: AuthProfileStore = {
        version: 1,
        profiles: {},
        usageStats: undefined
      };
      
      clearExpiredCooldowns(store, Date.now());
      
      expect(store).toEqual({
        version: 1,
        profiles: {},
        usageStats: undefined
      });
    });

    it("should clear expired cooldowns", () => {
      const now = Date.now();
      const pastTime = now - 10000; // 10 seconds ago
      
      const store: AuthProfileStore = {
        version: 1,
        profiles: {},
        usageStats: {
          "profile1": {
            cooldownUntil: pastTime
          },
          "profile2": {
            cooldownUntil: now + 10000 // 10 seconds in future
          }
        }
      };
      
      clearExpiredCooldowns(store, now);
      
      expect(store.usageStats).toEqual({
        "profile1": {}, // cooldown cleared
        "profile2": {
          cooldownUntil: now + 10000
        }
      });
    });

    it("should not clear non-expired cooldowns", () => {
      const now = Date.now();
      const futureTime = now + 10000; // 10 seconds in future
      
      const store: AuthProfileStore = {
        version: 1,
        profiles: {},
        usageStats: {
          "profile1": {
            cooldownUntil: futureTime
          }
        }
      };
      
      clearExpiredCooldowns(store, now);
      
      expect(store.usageStats).toEqual({
        "profile1": {
          cooldownUntil: futureTime
        }
      });
    });
  });

  describe("isProfileInCooldown", () => {
    it("should return false if profile has no stats", () => {
      const store: AuthProfileStore = {
        version: 1,
        profiles: {},
        usageStats: {}
      };
      
      const result = isProfileInCooldown(store, "nonexistent-profile");
      
      expect(result).toBe(false);
    });

    it("should return false if profile has no cooldown", () => {
      const store: AuthProfileStore = {
        version: 1,
        profiles: {},
        usageStats: {
          "profile1": {}
        }
      };
      
      const result = isProfileInCooldown(store, "profile1");
      
      expect(result).toBe(false);
    });

    it("should return false if cooldown has expired", () => {
      const now = Date.now();
      const pastTime = now - 1000; // 1 second ago
      
      const store: AuthProfileStore = {
        version: 1,
        profiles: {},
        usageStats: {
          "profile1": {
            cooldownUntil: pastTime
          }
        }
      };
      
      const result = isProfileInCooldown(store, "profile1");
      
      expect(result).toBe(false);
    });

    it("should return true if cooldown has not expired", () => {
      const now = Date.now();
      const futureTime = now + 10000; // 10 seconds in future
      
      const store: AuthProfileStore = {
        version: 1,
        profiles: {},
        usageStats: {
          "profile1": {
            cooldownUntil: futureTime
          }
        }
      };
      
      const result = isProfileInCooldown(store, "profile1");
      
      expect(result).toBe(true);
    });
  });

  describe("resolveProfileUnusableUntil", () => {
    it("should return cooldownUntil if defined", () => {
      const stats = {
        cooldownUntil: 1234567890
      };
      
      const result = resolveProfileUnusableUntil(stats);
      
      expect(result).toBe(1234567890);
    });

    it("should return disabledUntil if cooldownUntil is undefined", () => {
      const stats = {
        disabledUntil: 9876543210
      };
      
      const result = resolveProfileUnusableUntil(stats);
      
      expect(result).toBe(9876543210);
    });

    it("should return cooldownUntil if both are defined", () => {
      const stats = {
        cooldownUntil: 1234567890,
        disabledUntil: 9876543210
      };
      
      const result = resolveProfileUnusableUntil(stats);
      
      expect(result).toBe(1234567890);
    });

    it("should return undefined if neither is defined", () => {
      const stats = {};
      
      const result = resolveProfileUnusableUntil(stats);
      
      expect(result).toBeUndefined();
    });
  });
});