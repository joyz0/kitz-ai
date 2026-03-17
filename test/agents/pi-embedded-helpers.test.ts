import { isContextOverflowError, isLikelyContextOverflowError, classifyFailoverReason } from "../src/agents/pi-embedded-helpers/errors.js";
import { isRateLimitErrorMessage, isBillingErrorMessage, isAuthErrorMessage } from "../src/agents/pi-embedded-helpers/failover-matches.js";

describe("Pi Embedded Helpers Module", () => {
  describe("Error Handling", () => {
    describe("isContextOverflowError", () => {
      it("should return true for context overflow error messages", () => {
        const errorMessage = "Context length exceeded maximum context length";
        const result = isContextOverflowError(errorMessage);
        expect(result).toBe(true);
      });

      it("should return false for non-context overflow error messages", () => {
        const errorMessage = "Rate limit exceeded";
        const result = isContextOverflowError(errorMessage);
        expect(result).toBe(false);
      });
    });

    describe("isLikelyContextOverflowError", () => {
      it("should return true for likely context overflow error messages", () => {
        const errorMessage = "Prompt is too long";
        const result = isLikelyContextOverflowError(errorMessage);
        expect(result).toBe(true);
      });

      it("should return false for non-context overflow error messages", () => {
        const errorMessage = "Authentication failed";
        const result = isLikelyContextOverflowError(errorMessage);
        expect(result).toBe(false);
      });
    });

    describe("classifyFailoverReason", () => {
      it("should classify rate limit errors", () => {
        const errorMessage = "Rate limit exceeded";
        const result = classifyFailoverReason(errorMessage);
        expect(result).toBe("rate_limit");
      });

      it("should classify billing errors", () => {
        const errorMessage = "Insufficient credits";
        const result = classifyFailoverReason(errorMessage);
        expect(result).toBe("billing");
      });

      it("should classify auth errors", () => {
        const errorMessage = "Invalid API key";
        const result = classifyFailoverReason(errorMessage);
        expect(result).toBe("auth");
      });
    });
  });

  describe("Failover Matches", () => {
    describe("isRateLimitErrorMessage", () => {
      it("should return true for rate limit error messages", () => {
        const errorMessage = "Rate limit exceeded";
        const result = isRateLimitErrorMessage(errorMessage);
        expect(result).toBe(true);
      });

      it("should return false for non-rate limit error messages", () => {
        const errorMessage = "Context overflow";
        const result = isRateLimitErrorMessage(errorMessage);
        expect(result).toBe(false);
      });
    });

    describe("isBillingErrorMessage", () => {
      it("should return true for billing error messages", () => {
        const errorMessage = "Insufficient credits";
        const result = isBillingErrorMessage(errorMessage);
        expect(result).toBe(true);
      });

      it("should return false for non-billing error messages", () => {
        const errorMessage = "Rate limit exceeded";
        const result = isBillingErrorMessage(errorMessage);
        expect(result).toBe(false);
      });
    });

    describe("isAuthErrorMessage", () => {
      it("should return true for auth error messages", () => {
        const errorMessage = "Invalid API key";
        const result = isAuthErrorMessage(errorMessage);
        expect(result).toBe(true);
      });

      it("should return false for non-auth error messages", () => {
        const errorMessage = "Rate limit exceeded";
        const result = isAuthErrorMessage(errorMessage);
        expect(result).toBe(false);
      });
    });
  });
});
