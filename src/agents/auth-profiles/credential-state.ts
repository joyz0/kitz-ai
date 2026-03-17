import type { AuthProfileCredential, AuthProfileFailureReason } from "./types.js";

export type TokenExpiryState = "valid" | "expired" | "invalid_expires";

export type AuthCredentialReasonCode =
  | "valid"
  | "expired"
  | "no_credential"
  | "cooldown"
  | "disabled"
  | "provider_denied";

export type AuthCredentialEligibility = {
  eligible: boolean;
  reasonCode: AuthCredentialReasonCode;
};

export function resolveTokenExpiryState(expiresAt?: number): TokenExpiryState {
  if (expiresAt === undefined) {
    return "valid";
  }
  if (typeof expiresAt !== "number" || isNaN(expiresAt) || expiresAt <= 0) {
    return "invalid_expires";
  }
  return Date.now() >= expiresAt ? "expired" : "valid";
}

export function evaluateStoredCredentialEligibility(params: {
  credential: AuthProfileCredential;
  now?: number;
}): AuthCredentialEligibility {
  const now = params.now ?? Date.now();

  // Placeholder implementation
  // In a real implementation, this would evaluate the eligibility of the credential
  return { eligible: true, reasonCode: "valid" };
}
