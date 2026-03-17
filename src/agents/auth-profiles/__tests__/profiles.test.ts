import { describe, it, expect } from "vitest";
import { listProfilesForProvider, dedupeProfileIds } from "../profiles.js";
import type { AuthProfileStore, ApiKeyCredential } from "../types.js";

describe("profiles", () => {
  describe("listProfilesForProvider", () => {
    it("should return profiles for the specified provider", () => {
      const credential1: ApiKeyCredential = {
        type: "api_key",
        provider: "openai",
        key: "key1",
      };
      const credential2: ApiKeyCredential = {
        type: "api_key",
        provider: "openai",
        key: "key2",
      };
      const credential3: ApiKeyCredential = {
        type: "api_key",
        provider: "anthropic",
        key: "key3",
      };
      const store: AuthProfileStore = {
        version: 1,
        profiles: {
          profile1: credential1,
          profile2: credential2,
          profile3: credential3,
        },
      };

      const result = listProfilesForProvider(store, "openai");

      expect(result).toContain("profile1");
      expect(result).toContain("profile2");
      expect(result).not.toContain("profile3");
      expect(result).toHaveLength(2);
    });

    it("should return empty array when no profiles match provider", () => {
      const credential1: ApiKeyCredential = {
        type: "api_key",
        provider: "anthropic",
        key: "key1",
      };
      const store: AuthProfileStore = {
        version: 1,
        profiles: {
          profile1: credential1,
        },
      };

      const result = listProfilesForProvider(store, "openai");

      expect(result).toEqual([]);
    });
  });

  describe("dedupeProfileIds", () => {
    it("should remove duplicate profile IDs", () => {
      const profileIds = ["profile1", "profile2", "profile1", "profile3", "profile2"];

      const result = dedupeProfileIds(profileIds);

      expect(result).toEqual(["profile1", "profile2", "profile3"]);
      expect(result).toHaveLength(3);
    });

    it("should return same array when no duplicates exist", () => {
      const profileIds = ["profile1", "profile2", "profile3"];

      const result = dedupeProfileIds(profileIds);

      expect(result).toEqual(["profile1", "profile2", "profile3"]);
    });

    it("should handle empty array", () => {
      const profileIds: string[] = [];

      const result = dedupeProfileIds(profileIds);

      expect(result).toEqual([]);
    });
  });
});
