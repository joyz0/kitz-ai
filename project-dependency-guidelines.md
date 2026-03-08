# 项目依赖使用规范 (Project Dependency Guidelines)

## 核心原则

在编写代码时，**必须优先使用**本项目 `package.json` 中已安装的第三方库来解决常见问题。**严禁重复造轮子**（Reinventing the wheel）。如果以下列表中存在能解决当前需求的库，必须使用该库，除非有极特殊的性能或兼容性理由（需在代码注释中说明）。

## 必选依赖库清单

以下是本项目已安装的核心库及其推荐用途，请在对应场景下优先调用：

### 1. 验证与类型安全 (Validation & Types)

- **数据验证/Schema**: 优先使用 `zod` (运行时验证) 和 `@sinclair/typebox`。
- **JSON 处理**: 使用 `json5` 处理非标准 JSON，使用 `yaml` 处理 YAML 文件。
- **类型定义**: 严格使用 TypeScript (`typescript`, `@types/node`)。

### 2. 网络与 HTTP 请求 (Networking)

- **HTTP 客户端**: 优先使用 `undici` (Node.js 内置基础) 或 `gaxios`。
- **代理支持**: 涉及代理时，必须配合 `https-proxy-agent`。
- **WebSocket**: 使用 `ws`。
- **IP 地址处理**: 使用 `ipaddr.js`。

### 3. 命令行交互与 UI (CLI & TUI)

- **交互式提示**: 必须使用 `@clack/prompts` 替代原生 `readline` 或 `prompt`。
- **命令行参数解析**: 使用 `commander`。
- **日志输出**: 使用 `tslog` 进行结构化日志记录。
- **终端样式**: 使用 `chalk` 进行着色，`strip-ansi` 清理 ANSI 码。
- **进度条**: 使用 `osc-progress`。
- **二维码**: 使用 `qrcode-terminal`。
- **伪终端**: 涉及 shell 交互时使用 `@lydell/node-pty`。
- **代码高亮**: 使用 `cli-highlight`。

### 4. 文件与数据处理 (File & Data)

- **文件监听**: 使用 `chokidar` 替代 `fs.watch`。
- **图像处理的**: 使用 `sharp` (调整大小、格式转换等)。
- **压缩/归档**: 使用 `tar` 处理 tarball，`jszip` 处理 zip。
- **文件类型检测**: 使用 `file-type`。
- **PDF 处理**: 使用 `pdfjs-dist`。
- **HTML 解析**: 使用 `linkedom` (轻量级 DOM) 或 `@mozilla/readability` (提取正文)。
- **Markdown**: 使用 `markdown-it`。

### 5. 机器人集成与通信 (Bots & Messaging)

- **Discord**: 语音用 `@discordjs/voice`，类型用 `discord-api-types`。
- **Telegram**: 核心框架用 `grammy`，高级功能用 `@grammyjs/runner` 和 `@grammyjs/transformer-throttler`。
- **Slack**: 使用 `@slack/bolt` (框架) 和 `@slack/web-api`。
- **WhatsApp**: 使用 `@whiskeysockets/baileys`。
- **LINE**: 使用 `@line/bot-sdk`。
- **飞书 (Lark)**: 使用 `@larksuiteoapi/node-sdk`。
- **HomeKit**: 使用 `@homebridge/ciao`。

### 6. AI 与 Agent 核心 (AI & Agent Core)

- **核心 Agent 逻辑**: 必须基于 `@mariozechner/pi-agent-core`, `@mariozehner/pi-ai`, `@mariozehner/pi-coding-agent`, `@mariozehner/pi-tui` 构建。
- **Bedrock (AWS)**: 使用 `@aws-sdk/client-bedrock`。
- **Agent 协议**: 遵循 `@agentclientprotocol/sdk`。
- **TTS (语音合成)**: 使用 `node-edge-tts` 和 `opusscript` (音频编码)。

### 7. 工具与实用程序 (Utilities)

- **环境变量**: 使用 `dotenv`。
- **定时任务**: 使用 `croner`。
- **数据库 (向量)**: 使用 `sqlite-vec`。
- **动态导入/ESM**: 使用 `jiti` 或 `tsx` (运行时)。
- **长整数处理**: 使用 `long`。
- **DOM Exception**: 使用 `node-domexception`。

### 8. 开发测试 (Dev & Testing)

- **测试框架**: 使用 `vitest`。
- **Linting**: 使用 `oxlint`, `oxfmt`。
- **构建**: 使用 `tsdown`。
- **Web 前端组件**: 使用 `lit`, `@lit-labs/signals`, `@lit/context`。
- **浏览器自动化**: 使用 `playwright-core`。

## 执行策略

1. **检查现有依赖**: 在编写任何功能函数前，先检索上述列表是否已有对应库。
2. **禁止原生实现**: 例如，不要手动解析 YAML，不要手动写 HTTP 重试逻辑（除非库不支持），不要手动解析命令行参数。
3. **版本一致性**: 确保导入的 API 与 `package.json` 中指定的版本（如 `zod ^4.3.6`, `express ^5.2.1`）兼容。注意 `express v5` 和 `zod v4` 可能有新的 API 特性。
4. **特殊包说明**:
   - `node-domexception` 是通过 npm alias 引入的，导入时请使用 `import DOMException from 'node-domexception'` (具体视包导出而定)。
   - `@buape/carbon` 是 beta 版本，使用时需注意其 API 稳定性。

## 示例

❌ **错误做法**:

```typescript
// 手动解析 YAML
function parseYaml(str: string) { ...复杂正则... }
```
