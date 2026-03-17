# 对比kitz-ai和openclaw项目的src/agents模块API

## 目录结构对比

### kitz-ai
- **core/**: 核心运行时和上下文管理
  - context.ts: 模型上下文窗口缓存和解析
  - lanes.ts: 命令通道定义
  - runtime.ts: 运行时环境管理
- **errors/**: 错误处理
- **models/**: 模型管理
  - catalog.ts: 模型目录管理
  - auth.ts: 模型认证
  - fallback.ts: 模型 fallback 机制
- **providers/**: 模型提供商实现
  - compat.ts: 兼容性处理
  - gemini.ts: Google Gemini 支持
  - openai.ts: OpenAI 支持
  - registry.ts: 提供商注册表
- **sessions/**: 会话管理
  - compaction.ts: 会话压缩
  - key.ts: 会话密钥管理
  - maintenance.ts: 会话维护
  - storage.ts: 会话存储
- **tools/**: 工具管理
  - executor.ts: 工具执行器
  - registry.ts: 工具注册表
  - result.ts: 工具结果处理

### openclaw
- **auth-profiles/**: 认证配置文件管理
- **cli-runner/**: CLI 运行器
- **pi-embedded-helpers/**: 嵌入式助手
- **pi-embedded-runner/**: 嵌入式运行器
- **pi-extensions/**: 扩展功能
- 核心文件: context.ts, lanes.ts, model-catalog.ts 等

## API暴露对比

### 核心API

#### Context 模块
- **kitz-ai**:
  - `applyDiscoveredContextWindows()`: 应用发现的上下文窗口
  - `applyConfiguredContextWindows()`: 应用配置的上下文窗口
  - `lookupContextTokens()`: 查找模型上下文令牌
  - `resolveContextTokensForModel()`: 解析模型的上下文令牌
  - `ANTHROPIC_CONTEXT_1M_TOKENS`: Anthropic 1M 令牌常量

- **openclaw**:
  - 相同的核心函数，但实现更复杂
  - 额外的 `resolveConfiguredProviderContextWindow()` 函数
  - 额外的 `shouldSkipEagerContextWindowWarmup()` 函数
  - 更丰富的上下文令牌解析逻辑

#### Lanes 模块
- **kitz-ai**:
  - `AGENT_LANE_NESTED`: 嵌套代理通道
  - `AGENT_LANE_SUBAGENT`: 子代理通道

- **openclaw**:
  - 相同的常量
  - 额外的 `resolveNestedAgentLane()` 函数

#### Runtime 模块
- **kitz-ai**:
  - `RuntimeEnv`: 运行时环境类型
  - `defaultRuntime`: 默认运行时
  - `createNonExitingRuntime()`: 创建非退出运行时

- **openclaw**:
  - 没有单独的 runtime.ts 文件，相关功能分散在其他模块

#### Model Catalog 模块
- **kitz-ai**:
  - `ModelInputType`: 模型输入类型
  - `ModelCatalogEntry`: 模型目录条目类型
  - `loadModelCatalog()`: 加载模型目录
  - `modelSupportsVision()`: 检查模型是否支持视觉
  - `modelSupportsDocument()`: 检查模型是否支持文档
  - `findModelInCatalog()`: 在目录中查找模型
  - 测试相关函数: `resetModelCatalogCacheForTest()`, `__setModelCatalogImportForTest()`

- **openclaw**:
  - 类似的功能，但实现更复杂
  - 更多的模型处理逻辑

## 主要区别

1. **目录结构**: openclaw 目录结构更复杂，包含更多子模块
2. **API 功能**: openclaw 的 API 功能更丰富，包含更多的函数和逻辑
3. **实现细节**: kitz-ai 的实现相对简单，而 openclaw 的实现更复杂，包含更多的边界情况处理
4. **模块数量**: openclaw 的模块数量远多于 kitz-ai
5. **功能覆盖**: openclaw 覆盖了更多的功能，如认证配置文件管理、CLI 运行器、嵌入式助手等

## 总结

kitz-ai 的 src/agents 模块是对 openclaw 的简化实现，保留了核心功能但减少了复杂性。openclaw 提供了更全面、更复杂的 API，支持更多的用例和场景。kitz-ai 则专注于核心功能的实现，结构更清晰简洁。