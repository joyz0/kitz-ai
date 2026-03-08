import { getChildLogger, type Logger } from '../../logger/logger.js';
import type { ToolExecutionResult } from './executor.js';

export interface ProcessedToolResult {
  success: boolean;
  data?: any;
  error?: string;
  toolName: string;
  executionTime: number;
  formattedResult?: string;
  metadata?: Record<string, any>;
}

export class ToolResultProcessor {
  private logger: Logger;

  constructor() {
    this.logger = getChildLogger({ name: 'tool-result-processor' });
  }

  /**
   * 处理工具执行结果
   */
  public process(result: ToolExecutionResult): ProcessedToolResult {
    try {
      const processed: ProcessedToolResult = {
        success: result.success,
        data: result.result,
        error: result.error,
        toolName: result.toolName,
        executionTime: result.executionTime,
        metadata: {
          processedAt: Date.now(),
          toolName: result.toolName,
        },
      };

      // 格式化结果
      if (result.success && result.result !== undefined) {
        processed.formattedResult = this.formatResult(result.result);
      }

      return processed;
    } catch (error) {
      this.logger.error('Error processing tool result', error);
      return {
        success: false,
        error: 'Failed to process tool result',
        toolName: result.toolName,
        executionTime: result.executionTime,
      };
    }
  }

  /**
   * 批量处理工具执行结果
   */
  public processBatch(results: ToolExecutionResult[]): ProcessedToolResult[] {
    return results.map((result) => this.process(result));
  }

  /**
   * 格式化结果
   */
  private formatResult(result: any): string {
    try {
      if (typeof result === 'string') {
        return result;
      } else if (typeof result === 'object' && result !== null) {
        return JSON.stringify(result, null, 2);
      } else {
        return String(result);
      }
    } catch (error) {
      this.logger.error('Error formatting result', error);
      return String(result);
    }
  }

  /**
   * 提取结果中的关键信息
   */
  public extractKeyInfo(result: ProcessedToolResult): Record<string, any> {
    const keyInfo: Record<string, any> = {
      tool: result.toolName,
      success: result.success,
      executionTime: result.executionTime,
    };

    if (result.success && result.data) {
      keyInfo.result = this.simplifyData(result.data);
    } else if (!result.success && result.error) {
      keyInfo.error = result.error;
    }

    return keyInfo;
  }

  /**
   * 简化数据结构
   */
  private simplifyData(data: any): any {
    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        return data.slice(0, 5); // 只返回前5个元素
      } else {
        const simplified: Record<string, any> = {};
        Object.entries(data).forEach(([key, value]) => {
          if (typeof value === 'string' && value.length > 100) {
            simplified[key] = value.substring(0, 100) + '...';
          } else if (typeof value === 'object' && value !== null) {
            simplified[key] = this.simplifyData(value);
          } else {
            simplified[key] = value;
          }
        });
        return simplified;
      }
    }
    return data;
  }

  /**
   * 检查结果是否需要进一步处理
   */
  public needsFurtherProcessing(result: ProcessedToolResult): boolean {
    if (!result.success) {
      return false;
    }

    // 检查结果是否为复杂对象
    if (typeof result.data === 'object' && result.data !== null) {
      const dataStr = JSON.stringify(result.data);
      return dataStr.length > 1000;
    }

    return false;
  }

  /**
   * 生成结果摘要
   */
  public generateSummary(result: ProcessedToolResult): string {
    if (!result.success) {
      return `Tool ${result.toolName} failed: ${result.error}`;
    }

    if (result.formattedResult) {
      const truncated =
        result.formattedResult.length > 200
          ? result.formattedResult.substring(0, 200) + '...'
          : result.formattedResult;
      return `Tool ${result.toolName} executed successfully: ${truncated}`;
    }

    return `Tool ${result.toolName} executed successfully in ${result.executionTime}ms`;
  }
}
