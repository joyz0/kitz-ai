import * as fs from "node:fs";
import { ensureDirExists } from "./file-lock.js";

export function loadJsonFile(filePath: string): any {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export function saveJsonFile(filePath: string, data: any): void {
  ensureDirExists(filePath);
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, content, "utf8");
}