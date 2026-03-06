# Kitz AI 项目架构文档

## 项目概述

Kitz AI 是一个基于 TypeScript 的 OpenClaw 系统示例项目，展示了如何构建一个模块化、可扩展的应用架构。项目采用了现代前端工程实践，包括依赖注入、配置管理、日志系统和错误处理等核心功能。

## 技术栈

- **语言**: TypeScript
- **包管理器**: pnpm
- **构建工具**: TypeScript Compiler (tsc)
- **测试框架**: Vitest
- **核心依赖**:
  - zod: 用于 schema 验证
  - tslog: 用于日志管理
  - json5: 用于配置文件解析
  - zod-to-json-schema: 用于将 zod schema 转换为 JSON schema

## 项目结构

```
├── src/
│   ├── config/         # 配置系统
│   ├── infra/          # 基础设施（依赖注入、错误处理）
│   ├── logger/         # 日志系统
│   ├── index.ts        # 主入口
│   └── version.ts      # 版本信息
├── test/               # 性能测试
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript 配置
└── vitest.config.ts    # Vitest 配置
```

## 核心模块架构

### 1. 依赖注入系统

项目采用了自定义的依赖注入系统，位于 `src/infra/simple-di.ts`。该系统允许：

- 定义依赖类型和默认值
- 创建服务工厂
- 支持依赖注入和替换

**核心实现**:

- `createDefaults`: 创建依赖默认值
- `createFactory`: 创建服务工厂函数

### 2. 配置系统

配置系统位于 `src/config/` 目录，提供了：

- 基于 zod 的 schema 验证
- 环境变量替换
- 默认值管理
- 配置文件 I/O
- 配置 schema 构建和扩展

**核心模块**:

- `zod-schema.ts`: 定义配置 schema
- `schema.ts`: 管理 schema 构建和扩展
- `validation.ts`: 配置验证
- `env-substitution.ts`: 环境变量替换
- `default-values.ts`: 默认值管理
- `io.ts`: 配置文件读写

### 3. 日志系统

日志系统位于 `src/logger/` 目录，基于 tslog 实现，提供了：

- 多级别日志（debug、info、warn、error）
- 日志配置管理
- 敏感信息脱敏

**核心模块**:

- `logger.ts`: 日志实例创建和管理
- `levels.ts`: 日志级别定义
- `config.ts`: 日志配置
- `redact.ts`: 敏感信息脱敏

### 4. 错误处理

错误处理系统位于 `src/infra/` 目录，提供了：

- 未处理拒绝（Unhandled Rejection）处理
- 错误类型定义

**核心模块**:

- `unhandled-rejections.ts`: 未处理拒绝处理器
- `errors.ts`: 错误类型定义

## 应用启动流程

1. **安装未处理拒绝处理器**：`installUnhandledRejectionHandler()`
2. **定义依赖类型**：`AppDeps` 接口
3. **创建依赖默认值**：`createDefaults<AppDeps>()`
4. **创建应用服务工厂**：`createFactory()`
5. **生成服务实例**：`createAppServices()`

## 配置管理流程

1. **加载配置文件**：通过 `io.ts` 中的函数读取配置文件
2. **应用环境变量替换**：通过 `env-substitution.ts` 替换配置中的环境变量
3. **验证配置**：使用 `validation.ts` 中的函数验证配置是否符合 schema
4. **应用默认值**：通过 `default-values.ts` 为缺失的配置项提供默认值
5. **构建配置 schema**：通过 `schema.ts` 中的 `buildConfigSchema()` 构建完整的配置 schema

## 日志流程

1. **创建日志实例**：通过 `loggerModule.getLogger()` 创建日志实例
2. **配置日志级别**：通过配置文件设置日志级别
3. **记录日志**：使用日志实例的方法（debug、info、warn、error）记录日志
4. **敏感信息脱敏**：通过 `redact.ts` 对敏感信息进行脱敏处理

## 依赖注入流程

1. **定义依赖类型**：创建依赖接口（如 `AppDeps`）
2. **创建依赖默认值**：使用 `createDefaults` 创建依赖默认值
3. **创建服务工厂**：使用 `createFactory` 创建服务工厂函数
4. **生成服务实例**：调用服务工厂函数生成服务实例
5. **使用服务**：通过服务实例访问各种功能

## 扩展性设计

### 插件系统

项目支持通过插件扩展配置 schema：

1. **定义插件配置 schema**：插件可以定义自己的配置 schema
2. **注册插件**：通过 `buildConfigSchema()` 的 `extensions` 参数注册插件
3. **应用插件配置**：系统会自动合并插件的配置 schema 和 UI 提示

### 依赖替换

通过依赖注入系统，可以轻松替换默认依赖：

```typescript
const customServices = createAppServices({
  ...appDefaults,
  loggerModule: customLoggerModule,
});
```

## 测试策略

项目采用 Vitest 进行测试，测试文件位于各个模块的 `__tests__` 目录：

- **单元测试**：测试各个模块的核心功能
- **集成测试**：测试模块之间的交互
- **性能测试**：位于 `test/performance-test.ts`

## 构建与部署

### 构建命令

```bash
# 构建项目
pnpm build

# 运行测试
pnpm test

# 运行测试（带覆盖率）
pnpm test:coverage

# 类型检查
pnpm test:typecheck
```

### 部署流程

1. **构建项目**：`pnpm build`
2. **运行测试**：`pnpm test`
3. **部署构建产物**

## 监控与日志

项目使用 `tslog` 进行日志管理，日志文件存储在 `logs/` 目录：

- **日志文件**：`logs/app-YYYY-MM-DD.log`
- **日志级别**：可通过配置文件设置
- **敏感信息**：自动脱敏处理

## 最佳实践

1. **依赖注入**：使用依赖注入模式管理服务依赖
2. **配置管理**：使用 zod 进行配置验证，确保配置的正确性
3. **错误处理**：使用统一的错误处理机制，捕获未处理的拒绝
4. **日志管理**：使用结构化日志，便于分析和监控
5. **测试覆盖**：为核心功能编写单元测试，确保代码质量
