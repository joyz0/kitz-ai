# 大模型交互逻辑预期目录结构

## 现有目录结构

```
/Users/pl/Codes/kitz/kitz-ai/
├── .github/
├── .trae/
├── .vscode/
├── docs/
├── logs/
├── src/
│   ├── config/
│   │   ├── __tests__/
│   │   ├── default-values.ts
│   │   ├── env-substitution.ts
│   │   ├── index.ts
│   │   ├── io.ts
│   │   ├── schema.ts
│   │   ├── validation.ts
│   │   └── zod-schema.ts
│   ├── infra/
│   │   ├── __tests__/
│   │   ├── errors.ts
│   │   ├── simple-di.ts
│   │   └── unhandled-rejections.ts
│   ├── logger/
│   │   ├── __tests__/
│   │   ├── config.ts
│   │   ├── index.ts
│   │   ├── levels.ts
│   │   ├── logger.ts
│   │   └── redact.ts
│   ├── index.ts
│   └── version.ts
├── test/
├── .gitignore
├── .npmrc
├── .nvmrc
├── CHANGELOG.md
├── README.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vitest.config.ts
└── vitest.unit.config.ts
```

## 新增目录结构

### 1. 核心 LLM 模块

**新增目录：`src/llm/`**

```
src/llm/
├── __tests__/           # 测试文件
│   ├── index.test.ts     # 核心逻辑测试
│   ├── openai.test.ts    # OpenAI 提供商测试
│   ├── claude.test.ts    # Claude 提供商测试
│   └── qwen.test.ts      # Qwen 提供商测试
├── index.ts             # 核心逻辑，包含 provider 工厂和创建逻辑
├── types.ts             # 类型定义，包含 ModelConfig 和 LLMProvider 接口
├── openai.ts            # OpenAI 提供商实现
├── claude.ts            # Claude 提供商实现
└── qwen.ts              # Qwen 提供商实现
```

### 2. 配置系统修改

**修改现有文件：**

1. **`src/config/schema.ts`**

   * 添加 `llm` 配置项，包含 `providers` 和 `defaultProvider`

   * 定义 `providerSchema` 和 `modelConfigSchema`

2. **`src/config/default-values.ts`**

   * 添加大模型配置的默认值，包括默认提供商和模型

3. **`src/config/validation.ts`**

   * 添加大模型配置的校验逻辑，确保配置的有效性

### 3. 可选：CLI 扩展

**如果需要添加 CLI 支持，新增目录：`src/cli/`**

```
src/cli/
├── __tests__/
├── program.ts           # 命令注册
├── context.ts           # 上下文管理
├── preaction.ts         # 前置钩子
└── commands/
    ├── llm.ts           # LLM 相关命令
    └── index.ts         # 命令索引
```

### 4. 可选：网关扩展

**如果需要添加网关支持，新增目录：`src/gateway/`**

```
src/gateway/
├── __tests__/
├── server.ts            # 网关服务器
├── client.ts            # 网关客户端
├── api.ts               # API 接口
└── llm.ts               # LLM 相关接口
```

## 依赖项新增

**在 package.json 中添加以下依赖：**

* `openai`：OpenAI SDK

* `@anthropic-ai/sdk`：Claude SDK（可选）

* 其他大模型提供商的 SDK（如 Qwen 相关 SDK，可选）

## 预期文件结构说明

1. **核心 LLM 模块**：实现与大模型的交互逻辑，支持多种提供商
2. **配置系统**：管理大模型的配置，包括提供商设置和模型参数
3. **CLI 扩展**：提供命令行工具，用于管理和调用大模型
4. **网关扩展**：提供 HTTP 接口，用于远程调用大模型

## 关键文件功能

* **`src/llm/types.ts`**：定义统一的接口和类型

* **`src/llm/index.ts`**：实现核心逻辑和 provider 工厂

* **`src/llm/openai.ts`**：实现 OpenAI 提供商集成

* **`src/config/schema.ts`**：定义大模型配置 schema

* **`src/config/default-values.ts`**：提供默认配置

* **`src/config/validation.ts`**：校验配置有效性

## 实施步骤

1. 创建 `src/llm/` 目录和相关文件
2. 修改配置系统文件，添加大模型配置支持
3. 实现核心 LLM 逻辑和提供商集成
4. 可选：实现 CLI 和网关扩展
5. 添加必要的依赖项
6. 编写测试用例
7. 验证功能完整性

