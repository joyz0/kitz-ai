// 注意：此文件必须在所有导入之前导入
import { vi } from 'vitest';

// 全局的 mock logger 对象
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  getSubLogger: vi.fn(() => mockLogger),
  // 额外的 Logger 接口属性
  log: vi.fn(),
  silly: vi.fn(),
  stackDepthLevel: 0,
  runtime: {},
  setLevel: vi.fn(),
  setLogLevel: vi.fn(),
  getLevel: vi.fn(),
  getLogLevel: vi.fn(),
  isLevelEnabled: vi.fn(),
  child: vi.fn(() => mockLogger),
  addContext: vi.fn(() => mockLogger),
  removeContext: vi.fn(() => mockLogger),
  clearContext: vi.fn(() => mockLogger),
  hasContext: vi.fn(),
  getContext: vi.fn(),
  setContext: vi.fn(() => mockLogger),
  defaults: {},
  formatters: {},
  filters: [],
  hooks: {},
  transports: [],
  // 缺失的属性
  settings: {},
  maxErrorCauseDepth: 0,
  captureStackForMeta: false,
  attachTransport: vi.fn(),
  detachTransport: vi.fn(),
  attachFileTransport: vi.fn(),
  attachConsoleTransport: vi.fn(),
  setSettings: vi.fn(),
  getSettings: vi.fn(),
  getSubLoggerWithOptions: vi.fn(() => mockLogger),
  getName: vi.fn(),
  getMinLevel: vi.fn(),
  setMinLevel: vi.fn(),
  getPrefix: vi.fn(),
  setPrefix: vi.fn(),
  getMergedMetadata: vi.fn(),
  getErrorStack: vi.fn(),
  getLogObject: vi.fn(),
  getJSONString: vi.fn(),
};

// 模拟 logger 模块
vi.mock('./logger.js', () => {
  // 模拟 Logger 构造函数
  const MockLogger = function (name: string) {
    return mockLogger;
  };

  return {
    Logger: MockLogger,
    getLogger: vi.fn(() => mockLogger),
    getChildLogger: vi.fn(() => mockLogger),
    registerLogTransport: vi.fn(),
    resetLogger: vi.fn(),
  };
});

// 类型定义
export type MockLogger = {
  debug: any;
  info: any;
  warn: any;
  error: any;
  trace: any;
  fatal: any;
  getSubLogger: any;
  // 额外的 Logger 接口属性
  log: any;
  silly: any;
  stackDepthLevel: number;
  runtime: any;
  setLevel: any;
  setLogLevel: any;
  getLevel: any;
  getLogLevel: any;
  isLevelEnabled: any;
  child: any;
  addContext: any;
  removeContext: any;
  clearContext: any;
  hasContext: any;
  getContext: any;
  setContext: any;
  defaults: any;
  formatters: any;
  filters: any[];
  hooks: any;
  transports: any[];
  // 缺失的属性
  settings: any;
  maxErrorCauseDepth: number;
  captureStackForMeta: boolean;
  attachTransport: any;
  detachTransport: any;
  attachFileTransport: any;
  attachConsoleTransport: any;
  setSettings: any;
  getSettings: any;
  getSubLoggerWithOptions: any;
  getName: any;
  getMinLevel: any;
  setMinLevel: any;
  getPrefix: any;
  setPrefix: any;
  getMergedMetadata: any;
  getErrorStack: any;
  getLogObject: any;
  getJSONString: any;
};

// 获取模拟的 logger 实例
export function getMockLogger(): any {
  return mockLogger;
}

// 重置所有 logger 方法的调用记录
export function resetMockLogger() {
  mockLogger.debug.mockClear();
  mockLogger.info.mockClear();
  mockLogger.warn.mockClear();
  mockLogger.error.mockClear();
  mockLogger.trace.mockClear();
  mockLogger.fatal.mockClear();
  mockLogger.getSubLogger.mockClear();
  // 重置额外的 Logger 接口方法
  mockLogger.log.mockClear();
  mockLogger.silly.mockClear();
  mockLogger.setLevel.mockClear();
  mockLogger.setLogLevel.mockClear();
  mockLogger.getLevel.mockClear();
  mockLogger.getLogLevel.mockClear();
  mockLogger.isLevelEnabled.mockClear();
  mockLogger.child.mockClear();
  mockLogger.addContext.mockClear();
  mockLogger.removeContext.mockClear();
  mockLogger.clearContext.mockClear();
  mockLogger.hasContext.mockClear();
  mockLogger.getContext.mockClear();
  mockLogger.setContext.mockClear();
  // 重置新添加的方法
  mockLogger.attachTransport.mockClear();
  mockLogger.detachTransport.mockClear();
  mockLogger.attachFileTransport.mockClear();
  mockLogger.attachConsoleTransport.mockClear();
  mockLogger.setSettings.mockClear();
  mockLogger.getSettings.mockClear();
  mockLogger.getSubLoggerWithOptions.mockClear();
  mockLogger.getName.mockClear();
  mockLogger.getMinLevel.mockClear();
  mockLogger.setMinLevel.mockClear();
  mockLogger.getPrefix.mockClear();
  mockLogger.setPrefix.mockClear();
  mockLogger.getMergedMetadata.mockClear();
  mockLogger.getErrorStack.mockClear();
  mockLogger.getLogObject.mockClear();
  mockLogger.getJSONString.mockClear();
}
