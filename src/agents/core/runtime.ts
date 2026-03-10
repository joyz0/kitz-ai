// 参考 openclaw 的 runtime.ts 实现
import { getChildLogger, type Logger } from '../../logger/logger.js';

// 定义运行时环境接口
export type RuntimeEnv = {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  exit: (code: number) => void;
};

function shouldEmitRuntimeLog(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VITEST !== "true") {
    return true;
  }
  if (env.OPENCLAW_TEST_RUNTIME_LOG === "1") {
    return true;
  }
  const maybeMockedLog = console.log as unknown as { mock?: unknown };
  return typeof maybeMockedLog.mock === "object";
}

function createRuntimeIo(): Pick<RuntimeEnv, "log" | "error"> {
  const logger = getChildLogger({ name: 'runtime' });
  return {
    log: (...args: Parameters<typeof console.log>) => {
      if (!shouldEmitRuntimeLog()) {
        return;
      }
      logger.info(...args);
    },
    error: (...args: Parameters<typeof console.error>) => {
      if (!shouldEmitRuntimeLog()) {
        return;
      }
      logger.error(...args);
    },
  };
}

export const defaultRuntime: RuntimeEnv = {
  ...createRuntimeIo(),
  exit: (code) => {
    process.exit(code);
    throw new Error("unreachable"); // satisfies tests when mocked
  },
};

export function createNonExitingRuntime(): RuntimeEnv {
  return {
    ...createRuntimeIo(),
    exit: (code: number) => {
      throw new Error(`exit ${code}`);
    },
  };
}
