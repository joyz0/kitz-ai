import type { OpenClawConfig } from "../../config/index.js";
import { normalizeProviderId } from "../model-selection.js";
import type { AuthProfileStore } from "./types.js";

export function suggestOAuthProfileIdForLegacyDefault(params: {
  cfg?: OpenClawConfig;
  store: AuthProfileStore;
  provider: string;
  legacyProfileId: string;
}): string | undefined {
  // If this isn't a legacy default profile ID, no suggestion needed
  if (!params.legacyProfileId.endsWith(":default")) {
    return undefined;
  }

  // Check if there's a profile with the provider name only (without :default suffix)
  const providerOnlyId = params.legacyProfileId.replace(/:default$/, "");
  if (params.store.profiles[providerOnlyId]) {
    return providerOnlyId;
  }

  // Check if there's a profile with the normalized provider name
  const normalizedProvider = normalizeProviderId(params.provider);
  if (params.store.profiles[normalizedProvider]) {
    return normalizedProvider;
  }

  return undefined;
}

export function repairOAuthProfileIdMismatch(params: {
  cfg?: OpenClawConfig;
  store: AuthProfileStore;
  provider: string;
  profileId: string;
}): { repaired: boolean; oldProfileId?: string; newProfileId?: string } {
  // Check if the profile exists with the given ID
  const profile = params.store.profiles[params.profileId];
  if (!profile) {
    // Profile doesn't exist, try to find one that matches the provider
    const matchingProfileId = Object.keys(params.store.profiles).find((id) => {
      const p = params.store.profiles[id];
      return p.provider === params.provider;
    });

    if (matchingProfileId) {
      // We found a profile with matching provider but different ID
      return {
        repaired: true,
        oldProfileId: matchingProfileId,
        newProfileId: params.profileId,
      };
    }
  }

  // Profile exists and matches, no repair needed
  return { repaired: false };
}
