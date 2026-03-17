import * as os from "node:os";
import * as path from "node:path";

/**
 * 解析 OpenClaw 代理目录
 */
export function resolveOpenClawAgentDir(): string {
  // 默认为用户主目录下的 .kitz 目录
  return path.join(os.homedir(), ".kitz");
}

/**
 * 解析特定代理目录
 */
export function resolveAgentDir(agentId: string): string {
  return path.join(resolveOpenClawAgentDir(), "agents", agentId);
}