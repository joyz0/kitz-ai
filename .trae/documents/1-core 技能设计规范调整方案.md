# 1-core 技能结构调整方案

## 需求分析

用户要求：
1. **SKILL.md 做主要纲领**：作为核心文档，表述对 examples 和 references 的引用
2. **references 目录**：只做子模块的设计说明
3. **examples 目录**：统一存放代码示例

## 现状分析

当前 `skills/1-core/SKILL.md` 存在以下问题：
1. 包含过多技术实现细节和代码示例
2. 元数据结构与 OpenClaw 项目规范不一致
3. 没有清晰地引用 examples 和 references 目录

## 调整方案

### 1. 调整 SKILL.md 文件

**修改后结构**：
```yaml
name: 1-core
description: "核心基础设施层，提供配置、日志、错误处理等基础功能"
homepage: https://github.com/kitzai/kitz-ai
metadata:
  openclaw:
    emoji: "🔧"
    requires: {}
---

# 核心基础设施层

## 概述

核心基础设施层提供配置管理、日志记录、错误处理、依赖注入、类型安全和内存管理等基础功能，为上层应用提供稳定可靠的基础设施服务。

## 主要功能模块

- **配置系统**：支持 JSON5 配置文件、环境变量替换、热重载
- **日志系统**：结构化日志、敏感信息脱敏、多级别日志
- **错误处理**：统一错误类型、智能错误分类、自动恢复机制
- **依赖注入**：接口基于通信、工厂模式、单例管理
- **类型安全**：使用 TypeBox 和 Zod 进行 Schema 定义和验证
- **内存管理**：缓存策略、内存监控、资源回收

## 使用场景

### 何时使用
- 需要使用配置管理、日志记录、错误处理等基础功能
- 构建底层服务或框架组件
- 需要确保系统的可靠性和可维护性

### 何时不使用
- 作为业务逻辑的直接实现
- 替代特定领域的专业解决方案
- 当需要高度定制化的基础设施时（应基于核心层扩展）

## 代码示例

完整的代码示例请参考 `examples` 目录：
- `examples/config-example.ts` - 配置系统使用示例
- `examples/di-example.ts` - 依赖注入使用示例
- `examples/logger-example.ts` - 日志系统使用示例

## 设计文档

详细的设计说明请参考 `references` 目录：
- `references/architecture.md` - 核心层架构文档
- `references/config-system-design.md` - 配置系统设计
- `references/logger-design.md` - 日志系统设计
- `references/error-handling.md` - 错误处理设计
- `references/dependency-injection-design.md` - 依赖注入设计
- `references/type-safety-design.md` - 类型安全设计
- `references/memory-management-design.md` - 内存管理设计
- `references/best-practices.md` - 最佳实践指南
- `references/dependency-flow.md` - 依赖流程图

## 依赖关系

核心层模块之间可能存在相互依赖，但设计为自洽的系统，尽量减少外部依赖，确保核心层的稳定性。

## 测试策略

- **单元测试**：测试每个核心模块的独立功能
- **集成测试**：测试核心模块之间的协作
- **性能测试**：测试核心模块的性能和资源使用
- **可靠性测试**：测试核心模块在各种场景下的可靠性
```

### 2. 确保 references 目录内容

确保 `references` 目录中的文件只包含子模块的设计说明，不包含代码示例。

### 3. 确保 examples 目录内容

确保 `examples` 目录中的文件只包含代码示例，不包含设计说明。

## 预期结果

调整后，1-core 技能将：
1. 符合 OpenClaw 项目的技能设计规范
2. SKILL.md 作为主要纲领，清晰引用 examples 和 references 目录
3. references 目录专注于子模块的设计说明
4. examples 目录统一存放代码示例
5. 保持核心功能的完整性和一致性