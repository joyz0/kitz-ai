import * as os from "node:os";
import * as path from "node:path";

export function resolveOAuthPath(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, ".openclaw", "oauth.json");
}