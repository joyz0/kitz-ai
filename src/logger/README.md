# 日志系统

提供全面的日志和可观测性系统，支持结构化日志、子系统隔离、敏感信息过滤和诊断上下文。

## 功能特性

- **结构化日志**：JSON 格式的日志，便于解析和分析
- **多级别日志**：支持 silent、fatal、error、warn、info、debug、trace 级别
- **多输出方式**：支持控制台和文件输出
- **子系统隔离**：每个模块都有清晰的子系统标识
- **敏感信息过滤**：自动过滤 API 密钥、令牌和个人信息
- **诊断上下文**：丰富的上下文信息，包括请求 ID、会话信息和性能指标
- **可观测性集成**：支持指标收集
- **性能优化**：异步日志和批处理

## 安装

```bash
# 安装依赖
pnpm install
```

## 使用方法

### 基本使用

```typescript
import { getLogger } from './logger';

// 获取根日志器
const logger = getLogger();

// 记录不同级别的日志
logger.fatal('致命错误');
logger.error('错误信息');
logger.warn('警告信息');
logger.info('信息日志');
logger.debug('调试信息');
logger.trace('跟踪信息');

// 带上下文的日志
logger.info('用户登录', {
  userId: '12345',
  ip: '192.168.1.1',
  timestamp: new Date().toISOString()
});
```

### 子系统日志器

```typescript
// 获取子系统日志器
const authLogger = getLogger('auth');
const dbLogger = getLogger('database');

// 记录子系统日志
authLogger.info('用户认证成功', { userId: '12345' });
dbLogger.debug('数据库查询', { query: 'SELECT * FROM users' });
```

### 配置

日志系统会自动从配置文件中读取日志配置：

```json5
{
  "logging": {
    "level": "info",
    "file": "/path/to/logs/app.log",
    "maxFileBytes": 10485760, // 10MB
    "consoleLevel": "info",
    "consoleStyle": "pretty", // pretty, compact, json
    "redactSensitive": "tools", // off, tools
    "redactPatterns": []
  }
}
```

## API 参考

### getLogger(subsystem?: string): Logger

获取日志器实例。

- `subsystem`: 子系统名称，默认为 'root'
- 返回: Logger 实例

### Logger 接口

```typescript
interface Logger {
  fatal(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  trace(message: string, context?: LogContext): void;
  getSubsystemLogger(subsystem: string): Logger;
  close(): void;
}
```

## 性能考虑

- **异步日志**：日志写入是异步的，不会阻塞主线程
- **文件轮转**：支持日志文件自动轮转，避免文件过大
- **缓存**：日志系统会缓存配置，提高性能

## 安全考虑

- **敏感信息过滤**：自动过滤 API 密钥、令牌和个人信息
- **权限控制**：日志文件权限设置为 0o600，确保只有所有者可读写

## 测试

```bash
# 运行测试
pnpm test
```
