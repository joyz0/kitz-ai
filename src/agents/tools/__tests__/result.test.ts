import { describe, it, expect, vi, beforeEach } from "vitest";
// 导入 mock-logger 以确保 logger 模块被正确模拟
import { getMockLogger } from "../../../logger/mock-logger.js";
import { ToolResultProcessor, type ProcessedToolResult } from "../result.js";
import type { ToolExecutionResult } from "../executor.js";

// 获取 mock logger 实例（确保 mock 生效）
const mockLogger = getMockLogger();

describe("ToolResultProcessor", () => {
  let processor: ToolResultProcessor;

  beforeEach(() => {
    processor = new ToolResultProcessor();
  });

  describe("process", () => {
    it("should process a successful tool execution result", () => {
      const executionResult: ToolExecutionResult = {
        success: true,
        result: "Test result",
        toolName: "test-tool",
        executionTime: 100,
      };

      const processed = processor.process(executionResult);
      expect(processed.success).toBe(true);
      expect(processed.data).toBe("Test result");
      expect(processed.toolName).toBe("test-tool");
      expect(processed.executionTime).toBe(100);
      expect(processed.formattedResult).toBe("Test result");
      expect(processed.metadata).toBeDefined();
    });

    it("should process an unsuccessful tool execution result", () => {
      const executionResult: ToolExecutionResult = {
        success: false,
        error: "Execution failed",
        toolName: "test-tool",
        executionTime: 50,
      };

      const processed = processor.process(executionResult);
      expect(processed.success).toBe(false);
      expect(processed.error).toBe("Execution failed");
      expect(processed.toolName).toBe("test-tool");
      expect(processed.executionTime).toBe(50);
      expect(processed.formattedResult).toBeUndefined();
    });

    it("should handle complex result objects", () => {
      const executionResult: ToolExecutionResult = {
        success: true,
        result: { foo: "bar", nested: { value: 42 } },
        toolName: "test-tool",
        executionTime: 150,
      };

      const processed = processor.process(executionResult);
      expect(processed.success).toBe(true);
      expect(processed.data).toEqual({ foo: "bar", nested: { value: 42 } });
      expect(processed.formattedResult).toContain("foo");
      expect(processed.formattedResult).toContain("bar");
      expect(processed.formattedResult).toContain("nested");
      expect(processed.formattedResult).toContain("42");
    });
  });

  describe("processBatch", () => {
    it("should process multiple tool execution results", () => {
      const executionResults: ToolExecutionResult[] = [
        {
          success: true,
          result: "Result 1",
          toolName: "tool1",
          executionTime: 100,
        },
        {
          success: false,
          error: "Failed",
          toolName: "tool2",
          executionTime: 50,
        },
      ];

      const processed = processor.processBatch(executionResults);
      expect(processed).toHaveLength(2);
      expect(processed[0].success).toBe(true);
      expect(processed[0].data).toBe("Result 1");
      expect(processed[1].success).toBe(false);
      expect(processed[1].error).toBe("Failed");
    });
  });

  describe("extractKeyInfo", () => {
    it("should extract key info from a successful result", () => {
      const processedResult: ProcessedToolResult = {
        success: true,
        data: { foo: "bar", nested: { value: 42 } },
        toolName: "test-tool",
        executionTime: 100,
      };

      const keyInfo = processor.extractKeyInfo(processedResult);
      expect(keyInfo.tool).toBe("test-tool");
      expect(keyInfo.success).toBe(true);
      expect(keyInfo.executionTime).toBe(100);
      expect(keyInfo.result).toEqual({ foo: "bar", nested: { value: 42 } });
    });

    it("should extract key info from an unsuccessful result", () => {
      const processedResult: ProcessedToolResult = {
        success: false,
        error: "Execution failed",
        toolName: "test-tool",
        executionTime: 50,
      };

      const keyInfo = processor.extractKeyInfo(processedResult);
      expect(keyInfo.tool).toBe("test-tool");
      expect(keyInfo.success).toBe(false);
      expect(keyInfo.executionTime).toBe(50);
      expect(keyInfo.error).toBe("Execution failed");
    });
  });

  describe("needsFurtherProcessing", () => {
    it("should return true for complex results", () => {
      const processedResult: ProcessedToolResult = {
        success: true,
        data: {
          // Create a large object that will exceed the size threshold
          largeField: "x".repeat(1001),
        },
        toolName: "test-tool",
        executionTime: 100,
      };

      expect(processor.needsFurtherProcessing(processedResult)).toBe(true);
    });

    it("should return false for simple results", () => {
      const processedResult: ProcessedToolResult = {
        success: true,
        data: "Simple result",
        toolName: "test-tool",
        executionTime: 100,
      };

      expect(processor.needsFurtherProcessing(processedResult)).toBe(false);
    });

    it("should return false for unsuccessful results", () => {
      const processedResult: ProcessedToolResult = {
        success: false,
        error: "Execution failed",
        toolName: "test-tool",
        executionTime: 50,
      };

      expect(processor.needsFurtherProcessing(processedResult)).toBe(false);
    });
  });

  describe("generateSummary", () => {
    it("should generate a summary for a successful result", () => {
      const processedResult: ProcessedToolResult = {
        success: true,
        data: "Test result",
        toolName: "test-tool",
        executionTime: 100,
        formattedResult: "Test result",
      };

      const summary = processor.generateSummary(processedResult);
      expect(summary).toContain("test-tool");
      expect(summary).toContain("executed successfully");
      expect(summary).toContain("Test result");
    });

    it("should generate a summary for an unsuccessful result", () => {
      const processedResult: ProcessedToolResult = {
        success: false,
        error: "Execution failed",
        toolName: "test-tool",
        executionTime: 50,
      };

      const summary = processor.generateSummary(processedResult);
      expect(summary).toContain("test-tool");
      expect(summary).toContain("failed");
      expect(summary).toContain("Execution failed");
    });

    it("should generate a summary for a result without formatted result", () => {
      const processedResult: ProcessedToolResult = {
        success: true,
        data: "Test result",
        toolName: "test-tool",
        executionTime: 100,
      };

      const summary = processor.generateSummary(processedResult);
      expect(summary).toContain("test-tool");
      expect(summary).toContain("executed successfully");
      expect(summary).toContain("100ms");
    });
  });
});
