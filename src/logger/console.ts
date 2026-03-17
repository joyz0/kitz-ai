import type { LogLevel } from "./levels.js";
import { formatLocalIsoWithOffset } from "./timestamps.js";
import { loggingState } from "./state.js";

export type ConsoleStyle = "pretty" | "compact" | "json";

export type ConsoleSettings = {
  level: LogLevel;
  style: ConsoleStyle;
};

function resolveConsoleLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL;
  if (envLevel) {
    return envLevel as LogLevel;
  }
  return "info";
}

function resolveConsoleStyle(): ConsoleStyle {
  const envStyle = process.env.LOG_STYLE;
  if (envStyle === "pretty" || envStyle === "compact" || envStyle === "json") {
    return envStyle;
  }
  return "pretty";
}

export function getConsoleSettings(): ConsoleSettings {
  if (!loggingState.cachedConsoleSettings) {
    loggingState.cachedConsoleSettings = {
      level: resolveConsoleLevel(),
      style: resolveConsoleStyle(),
    };
  }
  return loggingState.cachedConsoleSettings;
}

export function formatConsoleTimestamp(style: ConsoleStyle): string {
  const date = new Date();
  if (style === "json") {
    return formatLocalIsoWithOffset(date);
  }
  if (style === "compact") {
    return date.toLocaleTimeString();
  }
  return date.toLocaleString();
}

export function shouldLogSubsystemToConsole(subsystem: string): boolean {
  const suppressed = process.env.LOG_SUPPRESS_SUBSYSTEMS;
  if (!suppressed) {
    return true;
  }
  const suppressedList = suppressed.split(",").map((s) => s.trim());
  return !suppressedList.includes(subsystem);
}
