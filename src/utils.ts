import * as os from "node:os";
import * as path from "node:path";

/**
 * 解析用户路径
 */
export function resolveUserPath(inputPath: string): string {
  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

/**
 * 检查路径是否存在
 */
export function pathExists(inputPath: string): boolean {
  try {
    return require("node:fs").existsSync(inputPath);
  } catch {
    return false;
  }
}

/**
 * 确保目录存在
 */
export function ensureDir(inputPath: string): void {
  try {
    require("node:fs").mkdirSync(inputPath, { recursive: true });
  } catch {}
}