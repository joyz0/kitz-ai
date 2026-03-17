import { describe, it, expect } from "vitest";
import { evaluateStoredCredentialEligibility } from "../credential-state.js";
import type { ApiKeyCredential } from "../types.js";

describe("credential-state", () => {
  describe("evaluateStoredCredentialEligibility", () => {
    it("should return eligible for valid credential", () => {
      const mockCredential: ApiKeyCredential = {
        type: "api_key",
        provider: "openai",
        key: "test-key",
      };

      const result = evaluateStoredCredentialEligibility({
        credential: mockCredential,
      });

      expect(result).toEqual({ eligible: true, reasonCode: "valid" });
    });

    it("should accept custom now timestamp", () => {
      const mockCredential: ApiKeyCredential = {
        type: "api_key",
        provider: "openai",
        key: "test-key",
      };

      const now = Date.now();
      const result = evaluateStoredCredentialEligibility({
        credential: mockCredential,
        now,
      });

      expect(result).toEqual({ eligible: true, reasonCode: "valid" });
    });
  });
});
