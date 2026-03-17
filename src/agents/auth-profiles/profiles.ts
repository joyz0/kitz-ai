import type { AuthProfileStore } from "./types.js";

export function listProfilesForProvider(store: AuthProfileStore, provider: string): string[] {
  return Object.entries(store.profiles)
    .filter(([, credential]) => credential.provider === provider)
    .map(([profileId]) => profileId);
}

export function dedupeProfileIds(profiles: string[]): string[] {
  const uniqueProfiles = [];
  const seen = new Set();
  for (const profile of profiles) {
    if (!seen.has(profile)) {
      seen.add(profile);
      uniqueProfiles.push(profile);
    }
  }
  return uniqueProfiles;
}
