export function applyMergePatch(base: unknown, patch: unknown): unknown {
  if (patch === null) {
    return undefined;
  }

  if (typeof base !== 'object' || base === null) {
    return patch;
  }

  if (typeof patch !== 'object' || patch === null) {
    return patch;
  }

  if (Array.isArray(base) && Array.isArray(patch)) {
    return patch;
  }

  if (Array.isArray(base) || Array.isArray(patch)) {
    return patch;
  }

  const result = { ...(base as Record<string, unknown>) };
  
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value === null) {
      delete result[key];
    } else if (typeof value === 'object' && value !== null && typeof result[key] === 'object' && result[key] !== null) {
      result[key] = applyMergePatch(result[key], value);
    } else {
      result[key] = value;
    }
  }

  return result;
}
