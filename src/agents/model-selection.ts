export function normalizeProviderId(provider: string): string {
  return provider.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export function normalizeProviderIdForAuth(provider: string): string {
  // Normalize provider ID specifically for authentication purposes
  return normalizeProviderId(provider);
}

export function findNormalizedProviderValue<T>(
  obj: Record<string, T> | undefined,
  providerKey: string
): T | undefined {
  if (!obj) {
    return undefined;
  }
  
  // Direct lookup first
  if (obj.hasOwnProperty(providerKey)) {
    return obj[providerKey];
  }
  
  // Try normalized lookup
  const normalizedEntries = Object.entries(obj).find(([key]) => 
    normalizeProviderId(key) === providerKey
  );
  
  return normalizedEntries ? normalizedEntries[1] : undefined;
}