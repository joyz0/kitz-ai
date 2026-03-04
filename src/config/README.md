# 配置系统使用说明

## 简介

本配置系统是基于 OpenClaw 项目的配置系统设计原则实现的，提供了一个灵活、安全、可扩展的配置管理解决方案。

## 核心功能

1. **类型安全**：使用 TypeScript 类型定义和 Zod Schema 验证，确保配置的类型正确性
2. **环境变量替换**：支持 `${VAR_NAME}` 语法的环境变量替换
3. **默认值应用**：自动应用合理的默认值，简化配置文件
4. **配置验证**：使用 Zod 进行严格的配置验证，确保配置的有效性
5. **配置缓存**：支持配置缓存，提高性能
6. **配置备份**：在写入配置时自动创建备份，防止配置丢失

## 目录结构

```
src/config/
├── index.ts          # 配置系统入口，导出所有模块
├── types.ts          # 类型定义
├── schema.ts         # Zod Schema 定义
├── io.ts             # 配置文件 IO 操作
├── defaults.ts       # 默认值应用
├── env-substitution.ts # 环境变量替换
├── example-config.json5 # 示例配置文件
├── example-usage.ts  # 使用示例
└── README.md         # 本文档
```

## 安装依赖

```bash
npm install
```

## 基本使用

### 1. 加载配置

```typescript
import { loadConfig } from './config';

// 加载配置（自动应用默认值）
const config = loadConfig();

console.log('日志级别:', config.logging?.level);
console.log('默认模型:', config.models?.defaults?.primary);
console.log('会话超时:', config.session?.idleMinutes);
```

### 2. 修改并保存配置

```typescript
import { loadConfig, writeConfigFile, OpenClawConfig } from './config';

// 加载当前配置
const config = loadConfig();

// 修改配置
const updatedConfig: OpenClawConfig = {
  ...config,
  logging: {
    ...config.logging,
    level: 'debug', // 更改日志级别
  },
  models: {
    ...config.models,
    defaults: {
      ...config.models?.defaults,
      primary: 'gpt-4o', // 更改默认模型
    },
  },
};

// 保存配置
await writeConfigFile(updatedConfig);
```

### 3. 环境变量替换

在配置文件中使用 `${VAR_NAME}` 语法引用环境变量：

```json5
{
  env: {
    OPENAI_API_KEY: "${OPENAI_API_KEY}",
    vars: {
      ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY}"
    }
  }
}
```

### 4. 配置文件格式

配置文件使用 JSON5 格式，支持注释和 trailing commas：

```json5
// 示例配置文件
{
  // 元数据
  meta: {
    lastTouchedVersion: "1.0.0",
    lastTouchedAt: "2026-03-04T10:00:00.000Z"
  },
  
  // 日志配置
  logging: {
    level: "info",
    consoleLevel: "info",
    consoleStyle: "pretty"
  },
  
  // 会话配置
  session: {
    scope: "per-sender",
    dmScope: "main",
    idleMinutes: 120
  },
  
  // 模型配置
  models: {
    defaults: {
      primary: "gpt-4o",
      fallbacks: ["gpt-3.5-turbo"]
    }
  }
}
```

## 配置路径

默认配置文件路径：
- macOS/Linux: `~/.kitz-ai/config.json5`
- Windows: `%USERPROFILE%\.kitz-ai\config.json5`

可以通过设置 `KITZ_CONFIG_PATH` 环境变量来自定义配置文件路径。

## 运行示例

```bash
# 运行配置系统示例
npm run example:config
```

## 配置验证

配置系统使用 Zod 进行严格的验证，确保配置的有效性。如果配置无效，系统会记录错误并使用默认配置。

## 性能优化

1. **配置缓存**：默认启用配置缓存，缓存时间为 200ms
2. **环境变量替换**：只在加载配置时进行一次环境变量替换
3. **文件操作**：使用临时文件和原子操作确保配置写入的安全性

## 最佳实践

1. **使用环境变量**：对于敏感信息（如 API 密钥），使用环境变量而非硬编码
2. **保持配置简洁**：只配置需要自定义的选项，其他使用默认值
3. **定期备份**：系统会自动创建备份，但建议定期手动备份重要配置
4. **使用 JSON5**：充分利用 JSON5 的注释和格式化功能，提高配置的可读性

## 故障排除

### 配置文件无法读取
- 检查文件权限：确保配置文件对当前用户可读写
- 检查文件格式：确保配置文件是有效的 JSON5 格式
- 检查环境变量：确保所有引用的环境变量都已设置

### 配置验证失败
- 检查配置格式：确保配置符合 Zod Schema 定义
- 检查类型：确保配置值的类型正确
- 检查必填项：确保所有必填配置项都已提供

## 扩展配置系统

要扩展配置系统，您可以：

1. **添加新的配置模块**：在 `types.ts` 中添加新的类型定义，在 `schema.ts` 中添加对应的 Zod Schema
2. **添加新的默认值**：在 `defaults.ts` 中添加新的默认值应用函数
3. **添加新的功能**：如配置热重载、配置加密等

## 总结

本配置系统提供了一个完整的配置管理解决方案，具有类型安全、环境变量支持、默认值应用等功能，可满足各种应用场景的配置需求。通过遵循最佳实践，您可以创建清晰、安全、可维护的配置文件。
