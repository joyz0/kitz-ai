import type { LoggerSettings } from "./config.js";
import type { ConsoleSettings } from "./console.js";
import type { LoggerResolvedSettings } from "./logger.js";

export interface LoggingState {
  cachedLogger: any | null;
  cachedSettings: LoggerResolvedSettings | null;
  cachedConsoleSettings: ConsoleSettings | null;
  overrideSettings: LoggerSettings | null;
  rawConsole: Console | null;
  forceConsoleToStderr: boolean;
  consoleTimestampPrefix: boolean;
}

export const loggingState: LoggingState = {
  cachedLogger: null,
  cachedSettings: null,
  cachedConsoleSettings: null,
  overrideSettings: null,
  rawConsole: null,
  forceConsoleToStderr: false,
  consoleTimestampPrefix: true,
};
