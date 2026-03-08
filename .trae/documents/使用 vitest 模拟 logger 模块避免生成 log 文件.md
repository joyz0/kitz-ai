# 将 mock-logger.ts 文件放在 src/logger/mock-logger.ts

## 调整方案

### 1. 创建测试工具文件
创建 `src/logger/mock-logger.ts` 文件，封装 logger 模拟功能：

```typescript
import { vi } from 'vitest';

// 模拟 logger 模块（必须放在 import 之前）
vi.mock('./logger.js', () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    getSubLogger: vi.fn(() => mockLogger)
  };
  
  return {
    getLogger: vi.fn(() => mockLogger),
    getChildLogger: vi.fn(() => mockLogger),
    registerLogTransport: vi.fn(),
    resetLogger: vi.fn()
  };
});

// 导入模拟后的模块
import * as loggerModule from './logger.js';

// 类型定义
export type MockLogger = ReturnType<typeof loggerModule.getLogger>;

// 获取模拟的 logger 实例
export function getMockLogger(): MockLogger {
  return loggerModule.getLogger();
}

// 重置所有 logger 方法的调用记录
export function resetMockLogger() {
  const logger = getMockLogger();
  if (typeof logger.debug === 'function') logger.debug.mockClear();
  if (typeof logger.info === 'function') logger.info.mockClear();
  if (typeof logger.warn === 'function') logger.warn.mockClear();
  if (typeof logger.error === 'function') logger.error.mockClear();
  if (typeof logger.trace === 'function') logger.trace.mockClear();
  if (typeof logger.fatal === 'function') logger.fatal.mockClear();
  if (typeof logger.getSubLogger === 'function') logger.getSubLogger.mockClear();
}
```

### 2. 在测试文件中使用
更新 `src/retry/__tests__/fault-tolerance.test.ts` 文件：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FaultToleranceHandler,
  createFaultToleranceHandler,
  RetryOptions,
  retry,
} from '../fault-tolerance.js';
import { getMockLogger, resetMockLogger } from '../../logger/mock-logger.js';

// 获取模拟的 logger 实例
const mockLogger = getMockLogger();

// 模拟延迟函数
vi.useFakeTimers();

describe('FaultToleranceHandler', () => {
  let faultToleranceHandler: FaultToleranceHandler;

  beforeEach(() => {
    faultToleranceHandler = createFaultToleranceHandler(mockLogger);
    // 重置模拟
    vi.clearAllMocks();
    resetMockLogger();
    vi.clearAllTimers();
  });

  // 测试用例保持不变...
});
```

### 3. 在其他测试文件中使用
对于其他需要使用 logger 的测试文件，例如 `src/agents/core/__tests__/runtime.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Runtime, createRuntime } from '../runtime.js';
import { getMockLogger, resetMockLogger } from '../../../logger/mock-logger.js';
import { OpenClawConfigSchema } from '../../../config/index.js';

// 获取模拟的 logger 实例
const mockLogger = getMockLogger();

// 模拟配置
const mockConfig = OpenClawConfigSchema.parse({});

describe('Runtime', () => {
  let runtime: Runtime;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();
    resetMockLogger();
    runtime = createRuntime({ config: mockConfig, logger: mockLogger });
  });

  // 测试用例保持不变...
});
```

## 方案优势

1. **完全避免生成日志文件**：通过模块级 mock，完全替换掉真实的 logger 实现，不会执行任何文件系统操作。

2. **代码复用**：所有测试文件共享同一套 logger 模拟逻辑，减少代码重复。

3. **一致性**：确保所有测试文件使用相同的 logger 模拟方式，避免不一致的实现。

4. **维护性**：只需要修改一个文件就能更新所有测试的 logger 模拟逻辑。

5. **性能提升**：避免了文件系统操作，测试运行更快。

6. **完整性**：包含了所有必要的 logger 方法，确保测试不会因缺少方法而失败。

7. **位置合理**：将 mock 工具放在 logger 目录下，与实际 logger 模块放在一起，便于管理和维护。

## 注意事项

- 确保 `mock-logger.ts` 文件中的 `vi.mock('./logger.js')` 调用路径正确。
- 验证所有测试文件都能正确导入和使用封装的模拟。
- 定期检查 logger 模块的更新，确保模拟代码与实际 API 保持一致。

通过这个方案，你可以在所有测试文件中统一使用 logger 模拟，避免生成不必要的日志文件，同时保持测试代码的简洁和可维护性。