import type { OpenClawConfig } from "../../config/zod-schema.js";
import type { AuthProfileStore } from "./types.js";

export function formatAuthDoctorHint(params: {
  cfg?: OpenClawConfig;
  store: AuthProfileStore;
  provider: string;
  profileId: string;
}): string | undefined {
  // Placeholder implementation
  // In a real implementation, this would format an auth doctor hint
  return undefined;
}
