import { getChildLogger, type Logger } from '../../logger/logger.js';

export interface Tool {
  name: string;
  description: string;
  parameters: Record<
    string,
    {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      required: boolean;
      description: string;
    }
  >;
  execute: (params: Record<string, any>) => Promise<any>;
}

export class ToolRegistry {
  private logger: Logger;
  private tools: Map<string, Tool>;

  constructor() {
    this.logger = getChildLogger({ name: 'tool-registry' });
    this.tools = new Map<string, Tool>();
  }

  /**
   * 注册工具
   */
  public register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Tool ${tool.name} already registered, overwriting`);
    }

    this.tools.set(tool.name, tool);
    this.logger.info(`Registered tool: ${tool.name}`);
  }

  /**
   * 注销工具
   */
  public unregister(toolName: string): boolean {
    const result = this.tools.delete(toolName);
    if (result) {
      this.logger.info(`Unregistered tool: ${toolName}`);
    }
    return result;
  }

  /**
   * 获取工具
   */
  public get(toolName: string): Tool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * 获取所有工具
   */
  public getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 获取工具名称列表
   */
  public getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 检查工具是否存在
   */
  public exists(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * 验证工具参数
   */
  public validateToolParams(
    toolName: string,
    params: Record<string, any>,
  ): {
    valid: boolean;
    errors: string[];
  } {
    const tool = this.get(toolName);
    if (!tool) {
      return {
        valid: false,
        errors: [`Tool ${toolName} not found`],
      };
    }

    const errors: string[] = [];

    // 检查必需参数
    for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
      if (paramDef.required && !(paramName in params)) {
        errors.push(`Required parameter ${paramName} is missing`);
      }
    }

    // 检查参数类型
    for (const [paramName, paramValue] of Object.entries(params)) {
      const paramDef = tool.parameters[paramName];
      if (paramDef) {
        const actualType = Array.isArray(paramValue)
          ? 'array'
          : typeof paramValue;
        if (actualType !== paramDef.type) {
          errors.push(
            `Parameter ${paramName} should be of type ${paramDef.type}, got ${actualType}`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 清空所有工具
   */
  public clear(): void {
    this.tools.clear();
    this.logger.info('Cleared all tools');
  }

  /**
   * 获取工具数量
   */
  public getCount(): number {
    return this.tools.size;
  }
}
