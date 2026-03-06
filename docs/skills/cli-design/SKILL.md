---
name: cli-design
description: 'This skill should be used when implementing a CLI system for OpenClaw, including command registration, context management, and pre-action hooks. Provides a structured approach to building a consistent and maintainable CLI.'
---

# CLI 系统 Skill

## When to Use

- **Use when** implementing a CLI system for OpenClaw
- **Use when** adding new CLI commands or extending existing ones
- **Use when** integrating CLI functionality with other modules

## When NOT to Use

- **Do NOT use** for web-based interfaces or GUI applications
- **Do NOT use** for non-command-line interactions
- **Do NOT use** when a simple script would suffice

## Input

- `commandName`: string (Name of the command to implement)
- `commandDescription`: string (Description of what the command does)
- `commandOptions`: object (Optional parameters and options for the command)
- `dependencies`: array (List of dependencies required for the command)

## Output

- `commandPath`: string (Path to the implemented command file)
- `commandStructure`: object (Structure of the command and its subcommands)
- `executionResult`: object (Result of running the command)

## Steps

1. **Analyze Command Requirements**
   - Determine the command structure and subcommands
   - Identify required parameters and options
   - Define expected output format

2. **Create Command Structure**
   - Create the command file in the appropriate directory
   - Implement the command registration function
   - Define command options and arguments

3. **Implement Command Logic**
   - Write the core functionality of the command
   - Handle parameters and options
   - Implement error handling

4. **Integrate with CLI System**
   - Register the command with the main program
   - Ensure proper context passing
   - Test the command integration

5. **Validate and Test**
   - Test the command with various inputs
   - Verify error handling
   - Ensure consistent output format

## Failure Strategy

- **Command not found**: Return clear error message with available commands
- **Invalid parameters**: Provide specific error messages and usage examples
- **Dependency failure**: Gracefully handle missing dependencies and provide installation instructions
- **Execution error**: Catch and format errors consistently, providing actionable feedback

## Core Concepts

**命令即 API，一致性优先**

- 基于 Commander.js 构建声明式命令树
- 统一的上下文传递机制
- Pre-action 钩子实现横切关注点
- 支持 RPC 模式供远程调用

## Architecture

```
┌─────────────────────────────────────┐
│         命令注册层 (program.ts)      │
│  - 创建 Commander 实例                 │
│  - 注册所有子命令                    │
│  - 配置帮助信息                      │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│       上下文层 (context.ts)         │
│  - 解析程序版本                      │
│  - 加载配置路径                      │
│  - 初始化日志器                      │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      Pre-action 钩子层 (preaction.ts)│
│  - 版本检查                          │
│  - 配置验证                          │
│  - 诊断模式检测                      │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│        命令实现层 (commands/*.ts)    │
│  - 业务逻辑                          │
│  - 参数解析                          │
│  - 结果输出                          │
└─────────────────────────────────────┘
```

## Key Patterns

### Command Registration Pattern

```typescript
export function buildProgram(): Command {
  const program = new Command();
  const ctx = createProgramContext();

  // 设置程序信息
  program
    .name('openclaw')
    .version(ctx.programVersion)
    .description('OpenClaw AI 网关');

  // 注册 pre-action 钩子
  registerPreActionHooks(program, ctx);

  // 注册子命令
  registerProgramCommands(program, ctx);

  return program;
}
```

### Context Passing Pattern

```typescript
export interface ProgramContext {
  programVersion: string;
  configPath: string;
  logger: ReturnType<typeof createSubsystemLogger>;
  startTime: number;
}

// 通过 Command 的 store 传递上下文
export function setProgramContext(program: any, ctx: ProgramContext): void {
  program.store.set('context', ctx);
}

export function getProgramContext(cmd: any): ProgramContext {
  return cmd.store.get('context');
}
```

### Pre-action Hook Pattern

```typescript
export function registerPreActionHooks(program: Command, ctx: any): void {
  program.hook('preAction', (thisCommand, actionCommand) => {
    const context = getProgramContext(thisCommand);

    // 诊断命令不需要加载配置
    const diagnosticCommands = ['doctor', 'health', 'logs', 'status'];
    if (diagnosticCommands.includes(actionCommand.name())) {
      return;
    }

    // 加载配置
    try {
      const config = loadConfig();
      context.config = config;
    } catch (error) {
      context.logger.error('Failed to load config', { error: error.message });
      process.exit(1);
    }
  });
}
```

## Dependencies

- **依赖模块**：配置系统、日志与可观测性、安全与认证
- **被依赖模块**：插件化架构

## Implementation Template

### Basic File Structure

```
src/
  cli/
    ├── README.md
    ├── index.ts
    ├── program.ts
    ├── context.ts
    ├── preaction.ts
    └── commands/
      ├── index.ts
      ├── doctor.ts
      ├── config.ts
      ├── gateway.ts
      ├── channels.ts
      └── sessions.ts
```

### Core Implementation

See `references/core-implementation.ts` for complete implementation details.

## Configuration

```json5
{
  cli: {
    output: {
      format: 'text', // text | json
      color: true,
    },
    completion: {
      enabled: true,
    },
    history: {
      enabled: true,
      size: 1000,
    },
  },
}
```

## Usage Examples

```bash
# 运行诊断
openclaw doctor

# 查看配置
openclaw config get agents.defaults.model.primary

# 设置配置
openclaw config set agents.defaults.model.primary gpt-4

# 查看通道状态
openclaw channels status

# 启动网关
openclaw gateway run

# 列出会话
openclaw sessions list
```

## Command Categories

1. **诊断命令**：不依赖配置，用于故障排查
   - `doctor`, `health`, `logs`, `status`
2. **配置命令**：读写配置
   - `configure`, `config get/set/unset`
3. **通道命令**：管理消息通道
   - `channels status`, `pairing approve`
4. **会话命令**：管理会话状态
   - `sessions list`, `sessions cleanup`
5. **网关命令**：网关运维
   - `gateway call`, `gateway run`

## Testing Strategy

- **单元测试**：测试命令注册、上下文管理、前置钩子、命令实现
- **集成测试**：测试完整命令流程、命令组合、错误处理、输出格式化
- **端到端测试**：测试 CLI 命令执行、配置管理、网关操作、通道管理

## Best Practices

1. **命令命名一致性**：使用 `noun verb` 格式（如 `sessions list`）
2. **参数验证**：在命令入口处验证所有参数
3. **错误处理**：统一错误格式，提供修复建议
4. **输出格式化**：支持 `--json` 模式供脚本调用
5. **帮助信息**：提供示例和常见问题链接

## Performance Considerations

- **启动时间**：优化启动速度，延迟加载配置和依赖
- **内存使用**：保持轻量，按需加载功能模块

## Security Considerations

- **命令权限**：确保敏感命令需要适当的权限
- **输入验证**：验证所有用户输入
- **敏感信息**：避免在命令输出中显示敏感信息
- **审计日志**：记录重要的 CLI 操作

## Extension Points

- **自定义命令**：支持插件添加自定义命令
- **命令别名**：支持命令别名和快捷方式
- **自动补全**：支持 shell 自动补全
- **命令历史**：支持命令历史记录

## References

- `references/core-implementation.ts` - Complete core implementation
- `references/command-examples/` - Example commands
