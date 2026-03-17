import { describe, it, expect } from "vitest";
import { formatAuthDoctorHint } from "../doctor.js";
import type { AuthProfileStore, ApiKeyCredential } from "../types.js";

describe("doctor", () => {
  describe("formatAuthDoctorHint", () => {
    it("should return undefined when no config is provided", () => {
      const mockStore: AuthProfileStore = {
        version: 1,
        profiles: {},
      };

      const result = formatAuthDoctorHint({
        cfg: undefined,
        store: mockStore,
        provider: "openai",
        profileId: "test-profile",
      });

      expect(result).toBeUndefined();
    });

    it("should return undefined for empty store", () => {
      const mockConfig = {};
      const mockStore: AuthProfileStore = {
        version: 1,
        profiles: {},
      };

      const result = formatAuthDoctorHint({
        cfg: mockConfig,
        store: mockStore,
        provider: "openai",
        profileId: "test-profile",
      });

      expect(result).toBeUndefined();
    });

    it("should handle store with profiles", () => {
      const mockConfig = {};
      const mockCredential: ApiKeyCredential = {
        type: "api_key",
        provider: "openai",
        key: "test-key",
      };
      const mockStore: AuthProfileStore = {
        version: 1,
        profiles: {
          "test-profile": mockCredential,
        },
      };

      const result = formatAuthDoctorHint({
        cfg: mockConfig,
        store: mockStore,
        provider: "openai",
        profileId: "test-profile",
      });

      expect(result).toBeUndefined();
    });
  });
});
