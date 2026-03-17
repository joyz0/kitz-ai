export type SecretRef = string;

export function coerceSecretRef(value: unknown, defaults: any): SecretRef | null {
  if (typeof value === "string" && value.startsWith("secret:")) {
    return value;
  }
  return null;
}