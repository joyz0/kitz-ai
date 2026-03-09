import { getChildLogger, type Logger } from "../../logger/logger.js";
import type { ToolRegistry, Tool } from "./registry.js";

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  toolName: string;
  executionTime: number;
}

export class ToolExecutor {
  private logger: Logger;
  private registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this.logger = getChildLogger({ name: "tool-executor" });
    this.registry = registry;
  }

  /**
   * 执行工具
   */
  public async execute(
    toolName: string,
    params: Record<string, any>
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      // 验证工具是否存在
      const tool = this.registry.get(toolName);
      if (!tool) {
        return {
          success: false,
          error: `Tool ${toolName} not found`,
          toolName,
          executionTime: Date.now() - startTime,
        };
      }

      // 验证参数
      const validation = this.registry.validateToolParams(toolName, params);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(", "),
          toolName,
          executionTime: Date.now() - startTime,
        };
      }

      // 执行工具
      this.logger.debug(`Executing tool ${toolName} with params:`, params);
      const result = await tool.execute(params);

      this.logger.debug(`Tool ${toolName} executed successfully`);
      return {
        success: true,
        result,
        toolName,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error executing tool ${toolName}:`, error);
      return {
        success: false,
        error: errorMessage,
        toolName,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 批量执行工具
   */
  public async executeBatch(
    executions: Array<{
      toolName: string;
      params: Record<string, any>;
    }>
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];

    for (const execution of executions) {
      const result = await this.execute(execution.toolName, execution.params);
      results.push(result);
    }

    return results;
  }

  /**
   * 安全执行工具（带超时）
   */
  public async executeWithTimeout(
    toolName: string,
    params: Record<string, any>,
    timeoutMs: number = 30000
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    const timeoutPromise = new Promise<ToolExecutionResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([this.execute(toolName, params), timeoutPromise]);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        toolName,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 获取工具信息
   */
  public getToolInfo(toolName: string): Omit<Tool, "execute"> | undefined {
    const tool = this.registry.get(toolName);
    if (!tool) {
      return undefined;
    }

    const { execute, ...info } = tool;
    return info;
  }

  /**
   * 获取所有工具信息
   */
  public getAllToolInfo(): Array<Omit<Tool, "execute">> {
    return this.registry.getAll().map(({ execute, ...info }) => info);
  }
}
