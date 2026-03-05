# Kitz AI 项目测试方案

## 1. 项目分析

### 1.1 项目结构
- **src/config/**: 配置系统，支持 JSON5 格式、环境变量替换、配置包含、验证等
- **src/infra/**: 基础设施，包括依赖注入系统
- **src/logger/**: 日志系统，支持文件日志、控制台日志、日志轮转、敏感信息脱敏等
- **src/index.ts**: 主入口
- **src/version.ts**: 版本信息

### 1.2 核心功能
1. **配置系统**
   - 配置文件读写
   - JSON5 解析
   - 环境变量替换
   - 配置包含（$include 指令）
   - 配置验证（基于 Zod）
   - 配置缓存

2. **依赖注入系统**
   - 函数参数式依赖注入
   - 依赖默认值
   - 依赖验证

3. **日志系统**
   - 多级别日志（info, warn, error 等）
   - 文件日志和控制台日志
   - 日志轮转
   - 敏感信息脱敏
   - 外部传输支持

### 1.3 技术栈
- TypeScript
- json5
- tslog
- zod
- zod-to-json-schema

## 2. 测试方案

### 2.1 测试框架选择
- **测试框架**: Vitest（现代化、快速、TypeScript 友好）
- **断言库**: Vitest 内置断言
- **测试覆盖率工具**: Vitest 内置覆盖率报告

### 2.2 测试目录结构
```
src/
  ├── config/
  │   ├── __tests__/
  │   │   ├── io.test.ts
  │   │   ├── validation.test.ts
  │   │   ├── env-substitution.test.ts
  │   │   └── default-values.test.ts
  ├── infra/
  │   ├── __tests__/
  │   │   └── simple-di.test.ts
  ├── logger/
  │   ├── __tests__/
  │   │   ├── logger.test.ts
  │   │   ├── redact.test.ts
  │   │   ├── levels.test.ts
  │   │   └── config.test.ts
  └── __tests__/
      ├── index.test.ts
      └── version.test.ts
```

### 2.3 测试类型和覆盖范围

#### 2.3.1 单元测试
- **配置系统**: 各个模块的独立功能测试
- **依赖注入系统**: 依赖注入功能测试
- **日志系统**: 日志功能测试
- **核心模块**: 主入口和版本模块测试

#### 2.3.2 集成测试
- **配置系统集成**: 完整配置加载流程测试
- **日志系统集成**: 日志系统与配置系统的集成测试
- **依赖注入与其他模块集成**: 依赖注入在实际使用场景中的测试

### 2.4 测试脚本配置

#### 2.4.1 package.json 脚本
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:fast": "vitest run --config vitest.unit.config.ts",
    "test:typecheck": "tsc --noEmit"
  }
}
```

#### 2.4.2 Vitest 配置
- **vitest.config.ts**: 主配置文件
- **vitest.unit.config.ts**: 单元测试配置

### 2.5 测试覆盖率要求
- **行覆盖率**: ≥ 80%
- **函数覆盖率**: ≥ 80%
- **分支覆盖率**: ≥ 70%
- **语句覆盖率**: ≥ 80%

## 3. 具体测试用例设计

### 3.1 配置系统测试

#### 3.1.1 io.test.ts
- 测试配置文件读写
- 测试配置路径解析
- 测试配置包含功能
- 测试配置缓存机制
- 测试配置备份功能

#### 3.1.2 validation.test.ts
- 测试配置验证功能
- 测试无效配置处理
- 测试默认值应用

#### 3.1.3 env-substitution.test.ts
- 测试环境变量替换
- 测试嵌套环境变量
- 测试未定义环境变量处理

#### 3.1.4 default-values.test.ts
- 测试默认值应用
- 测试嵌套默认值
- 测试部分配置的默认值处理

### 3.2 依赖注入系统测试

#### 3.2.1 simple-di.test.ts
- 测试依赖注入工厂创建
- 测试依赖默认值
- 测试依赖验证
- 测试依赖覆盖

### 3.3 日志系统测试

#### 3.3.1 logger.test.ts
- 测试日志创建
- 测试日志级别
- 测试日志文件写入
- 测试日志轮转
- 测试外部传输

#### 3.3.2 redact.test.ts
- 测试敏感信息脱敏
- 测试不同类型数据的脱敏

#### 3.3.3 levels.test.ts
- 测试日志级别转换
- 测试日志级别验证

#### 3.3.4 config.test.ts
- 测试日志配置解析
- 测试默认日志配置

### 3.4 核心模块测试

#### 3.4.1 index.test.ts
- 测试主入口导出
- 测试模块集成

#### 3.4.2 version.test.ts
- 测试版本信息导出

## 4. 测试环境配置

### 4.1 测试依赖
```json
{
  "devDependencies": {
    "vitest": "^4.0.0",
    "@vitest/coverage-v8": "^4.0.0",
    "tsx": "^4.7.1",
    "typescript": "^5.4.2",
    "@types/node": "^25.3.3"
  }
}
```

### 4.2 Vitest 配置文件
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      include: ['./src/**/*.ts'],
      exclude: [
        'src/**/__tests__/**',
        'src/index.ts',
        'src/version.ts'
      ]
    }
  }
});
```

## 5. 测试执行策略

### 5.1 本地开发
- 使用 `pnpm test:watch` 进行实时测试
- 使用 `pnpm test:fast` 快速运行单元测试
- 使用 `pnpm test:coverage` 检查覆盖率

### 5.2 CI/CD 集成
- 在 CI 环境中运行完整测试套件
- 检查测试覆盖率是否达到要求
- 确保所有测试通过后才能部署

## 6. 测试最佳实践

1. **隔离测试环境**：使用依赖注入模拟外部依赖
2. **测试边界情况**：测试无效输入、边界值等
3. **测试错误处理**：确保错误情况被正确处理
4. **测试性能**：对于配置缓存等性能关键功能进行性能测试
5. **测试可维护性**：保持测试代码清晰、简洁、易于维护

## 7. 结论

本测试方案基于 Kitz AI 项目的结构和功能，设计了全面的测试覆盖策略。通过使用 Vitest 作为测试框架，我们可以实现快速、可靠的测试流程，确保项目的质量和稳定性。测试方案涵盖了单元测试和集成测试，重点关注核心功能模块，并设置了合理的覆盖率要求，以确保代码质量。