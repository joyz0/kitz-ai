import type { RuntimeEnv } from "./logger/subsystem.js";
import { getLogger } from "./logger/logger.js";
import { createSubsystemLogger } from "./logger/subsystem.js";

const subsystemPrefixRe = /^([a-z][a-z0-9-]{1,20}):\s+(.*)$/i;

function splitSubsystem(message: string) {
  const match = message.match(subsystemPrefixRe);
  if (!match) {
    return null;
  }
  const [, subsystem, rest] = match;
  return { subsystem, rest };
}

type LogMethod = "info" | "warn" | "error";
type RuntimeMethod = "log" | "error";

const defaultRuntime: RuntimeEnv = {
  log: (...args: unknown[]) => console.log(...args),
  error: (...args: unknown[]) => console.error(...args),
  exit: (code?: number) => process.exit(code),
};

function logWithSubsystem(params: {
  message: string;
  runtime: RuntimeEnv;
  runtimeMethod: RuntimeMethod;
  loggerMethod: LogMethod;
  subsystemMethod: LogMethod;
}) {
  const parsed = splitSubsystem(params.message);
  if (parsed) {
    createSubsystemLogger(parsed.subsystem)[params.subsystemMethod](parsed.rest);
    return;
  }
  params.runtime[params.runtimeMethod](params.message);
  getLogger()[params.loggerMethod](params.message);
}

export function logInfo(message: string, runtime: RuntimeEnv = defaultRuntime) {
  logWithSubsystem({
    message,
    runtime,
    runtimeMethod: "log",
    loggerMethod: "info",
    subsystemMethod: "info",
  });
}

export function logWarn(message: string, runtime: RuntimeEnv = defaultRuntime) {
  logWithSubsystem({
    message,
    runtime,
    runtimeMethod: "log",
    loggerMethod: "warn",
    subsystemMethod: "warn",
  });
}

export function logSuccess(message: string, runtime: RuntimeEnv = defaultRuntime) {
  logWithSubsystem({
    message,
    runtime,
    runtimeMethod: "log",
    loggerMethod: "info",
    subsystemMethod: "info",
  });
}

export function logError(message: string, runtime: RuntimeEnv = defaultRuntime) {
  logWithSubsystem({
    message,
    runtime,
    runtimeMethod: "error",
    loggerMethod: "error",
    subsystemMethod: "error",
  });
}

export function logDebug(message: string) {
  getLogger().debug(message);
  if (process.env.VERBOSE === "1") {
    console.log(message);
  }
}
