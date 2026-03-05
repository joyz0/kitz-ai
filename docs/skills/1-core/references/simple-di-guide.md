# 简单依赖注入使用指南

## 1. 概述

本指南介绍如何使用本项目提供的简单函数参数式依赖注入方式，帮助开发者快速上手并迁移现有的依赖注入代码。

## 2. 核心概念

### 2.1 依赖类型定义

使用 TypeScript 接口定义模块的依赖项，明确指定每个依赖的类型。

```typescript
interface LoggerDeps {
  console: Pick<typeof console, 'log' | 'error' | 'warn'>;
  prefix?: string;
}
```

### 2.2 依赖默认值

为依赖项提供默认值，简化使用过程。

```typescript
const loggerDefaults = createDefaults<LoggerDeps>({
  console,
  prefix: '[APP]',
});
```

### 2.3 工厂函数

通过工厂函数创建服务实例，传入依赖项。

```typescript
const createLogger = createFactory(
  (deps: LoggerDeps) => {
    return {
      info: (message: string, context?: any) => {
        deps.console.log(`${deps.prefix} [INFO] ${message}`, context);
      },
      error: (message: string, context?: any) => {
        deps.console.error(`${deps.prefix} [ERROR] ${message}`, context);
      },
    };
  },
  loggerDefaults
);
```

## 3. 基本使用

### 3.1 创建服务

```typescript
// 使用默认依赖
const logger = createLogger();

// 自定义依赖
const customLogger = createLogger({
  prefix: '[CUSTOM]',
  console: customConsole,
});
```

### 3.2 依赖传递

```typescript
// 定义配置依赖类型
interface ConfigDeps {
  env: NodeJS.ProcessEnv;
  logger: ReturnType<typeof createLogger>;
}

// 创建配置默认值
const configDefaults = createDefaults<ConfigDeps>({
  env: process.env,
  logger: createLogger(),
});

// 创建配置服务工厂
const createConfig = createFactory(
  (deps: ConfigDeps) => {
    return {
      port: parseInt(deps.env.PORT || '3000', 10),
      host: deps.env.HOST || 'localhost',
    };
  },
  configDefaults
);
```

## 4. 从传统容器迁移

### 4.1 步骤

1. **识别依赖**：分析现有代码，识别模块的依赖项
2. **定义依赖类型**：为每个模块创建依赖类型接口
3. **创建工厂函数**：使用 `createFactory` 创建服务工厂
4. **更新使用方式**：将容器解析改为直接调用工厂函数
5. **保持兼容性**：对于需要保持兼容的代码，继续使用传统容器

### 4.2 示例：从容器迁移

**传统方式：**

```typescript
// 注册依赖
defaultContainer.register('logger', () => new Logger(), {
  lifecycle: Lifecycle.SINGLETON,
});

// 使用依赖
const logger = defaultContainer.resolve('logger');
```

**新方式：**

```typescript
// 定义依赖类型
interface LoggerDeps {
  console: Pick<typeof console, 'log' | 'error' | 'warn'>;
}

// 创建依赖默认值
const loggerDefaults = createDefaults<LoggerDeps>({
  console,
});

// 创建服务工厂
const createLogger = createFactory(
  (deps: LoggerDeps) => new Logger(deps),
  loggerDefaults
);

// 使用依赖
const logger = createLogger();
```

## 5. 最佳实践

### 5.1 依赖管理

- **明确依赖**：为每个模块定义清晰的依赖类型接口
- **合理默认值**：为依赖项提供合理的默认值，简化使用
- **依赖传递**：通过函数参数传递依赖，避免隐式依赖
- **依赖验证**：对于重要的依赖，使用验证函数确保正确性

### 5.2 代码组织

- **按功能组织**：将相关的服务和依赖定义放在一起
- **模块化**：每个模块独立管理自己的依赖
- **类型安全**：充分利用 TypeScript 的类型系统
- **测试友好**：设计便于测试的依赖注入方式

### 5.3 性能考量

- **依赖缓存**：对于频繁使用的服务，可以缓存实例
- **延迟加载**：只在需要时创建服务实例
- **避免过度依赖**：每个模块的依赖应该精简，避免过度依赖

## 6. 常见问题

### 6.1 循环依赖

**问题**：模块 A 依赖模块 B，模块 B 又依赖模块 A

**解决方案**：
- 重构代码，提取公共依赖到新模块
- 使用函数参数传递，避免通过容器解析
- 考虑使用事件驱动或消息传递模式

### 6.2 依赖过多

**问题**：一个模块依赖过多其他模块

**解决方案**：
- 重构模块，拆分为多个小模块
- 提取公共依赖到更高层次的模块
- 考虑使用组合模式，减少直接依赖

### 6.3 测试困难

**问题**：难以模拟依赖进行测试

**解决方案**：
- 使用函数参数式依赖注入，方便模拟依赖
- 为每个依赖提供默认值，简化测试
- 设计接口而非具体实现，提高可测试性

## 7. 示例项目

### 7.1 完整示例

查看 `src/dependency-injection/simple-di-example.ts` 文件，了解完整的使用示例。

### 7.2 集成示例

查看 `src/integration-example.ts` 文件，了解如何在实际项目中集成新的依赖注入方式。

## 8. 结论

简单函数参数式依赖注入是一种轻量级、易于使用的依赖管理方式，特别适合中小型项目和独立组件。通过合理使用这种方式，可以提高代码的可读性、可测试性和可维护性，同时减少系统的复杂性。

对于大型项目，可以结合传统的中心化容器方式和新的函数参数式方式，根据具体场景选择合适的依赖注入策略。