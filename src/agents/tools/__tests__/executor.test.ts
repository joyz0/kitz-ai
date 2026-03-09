import { describe, it, expect, vi, beforeEach } from "vitest";
// 导入 mock-logger 以确保 logger 模块被正确模拟
import { getMockLogger } from "../../../logger/mock-logger.js";
import { ToolExecutor, type ToolExecutionResult } from "../executor.js";
import { ToolRegistry, type Tool } from "../registry.js";

// 获取 mock logger 实例（确保 mock 生效）
const mockLogger = getMockLogger();

describe("ToolExecutor", () => {
  let executor: ToolExecutor;
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
    executor = new ToolExecutor(registry);
  });

  describe("execute", () => {
    it("should execute a tool successfully", async () => {
      const tool: Tool = {
        name: "test-tool",
        description: "A test tool",
        parameters: {
          input: {
            type: "string",
            required: true,
            description: "Input parameter",
          },
        },
        execute: async (params) => `Result: ${params.input}`,
      };

      registry.register(tool);

      const result = await executor.execute("test-tool", { input: "test" });
      expect(result.success).toBe(true);
      expect(result.result).toBe("Result: test");
      expect(result.toolName).toBe("test-tool");
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it("should return error for non-existent tool", async () => {
      const result = await executor.execute("non-existent", {});
      expect(result.success).toBe(false);
      expect(result.error).toBe("Tool non-existent not found");
      expect(result.toolName).toBe("non-existent");
    });

    it("should return error for invalid parameters", async () => {
      const tool: Tool = {
        name: "test-tool",
        description: "A test tool",
        parameters: {
          input: {
            type: "string",
            required: true,
            description: "Input parameter",
          },
        },
        execute: async () => "result",
      };

      registry.register(tool);

      const result = await executor.execute("test-tool", {});
      expect(result.success).toBe(false);
      expect(result.error).toContain("Required parameter input is missing");
      expect(result.toolName).toBe("test-tool");
    });

    it("should return error when tool execution fails", async () => {
      const tool: Tool = {
        name: "test-tool",
        description: "A test tool",
        parameters: {},
        execute: async () => {
          throw new Error("Tool execution failed");
        },
      };

      registry.register(tool);

      const result = await executor.execute("test-tool", {});
      expect(result.success).toBe(false);
      expect(result.error).toBe("Tool execution failed");
      expect(result.toolName).toBe("test-tool");
    });
  });

  describe("executeBatch", () => {
    it("should execute multiple tools", async () => {
      const tool1: Tool = {
        name: "tool1",
        description: "Tool 1",
        parameters: {},
        execute: async () => "result 1",
      };

      const tool2: Tool = {
        name: "tool2",
        description: "Tool 2",
        parameters: {},
        execute: async () => "result 2",
      };

      registry.register(tool1);
      registry.register(tool2);

      const results = await executor.executeBatch([
        { toolName: "tool1", params: {} },
        { toolName: "tool2", params: {} },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe("result 1");
      expect(results[1].success).toBe(true);
      expect(results[1].result).toBe("result 2");
    });
  });

  describe("executeWithTimeout", () => {
    it("should execute tool with timeout", async () => {
      const tool: Tool = {
        name: "test-tool",
        description: "A test tool",
        parameters: {},
        execute: async () => "result",
      };

      registry.register(tool);

      const result = await executor.executeWithTimeout("test-tool", {}, 1000);
      expect(result.success).toBe(true);
      expect(result.result).toBe("result");
    });

    it("should return error when tool execution times out", async () => {
      const tool: Tool = {
        name: "test-tool",
        description: "A test tool",
        parameters: {},
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return "result";
        },
      };

      registry.register(tool);

      const result = await executor.executeWithTimeout("test-tool", {}, 500);
      expect(result.success).toBe(false);
      expect(result.error).toContain("timed out");
      expect(result.toolName).toBe("test-tool");
    });
  });

  describe("getToolInfo", () => {
    it("should return tool info", () => {
      const tool: Tool = {
        name: "test-tool",
        description: "A test tool",
        parameters: {
          input: {
            type: "string",
            required: true,
            description: "Input parameter",
          },
        },
        execute: async () => "result",
      };

      registry.register(tool);

      const info = executor.getToolInfo("test-tool");
      expect(info).toEqual({
        name: "test-tool",
        description: "A test tool",
        parameters: {
          input: {
            type: "string",
            required: true,
            description: "Input parameter",
          },
        },
      });
    });

    it("should return undefined for non-existent tool", () => {
      expect(executor.getToolInfo("non-existent")).toBeUndefined();
    });
  });

  describe("getAllToolInfo", () => {
    it("should return info for all tools", () => {
      const tool1: Tool = {
        name: "tool1",
        description: "Tool 1",
        parameters: {},
        execute: async () => "result 1",
      };

      const tool2: Tool = {
        name: "tool2",
        description: "Tool 2",
        parameters: {},
        execute: async () => "result 2",
      };

      registry.register(tool1);
      registry.register(tool2);

      const infos = executor.getAllToolInfo();
      expect(infos).toHaveLength(2);
      expect(infos.find((info) => info.name === "tool1")).toBeDefined();
      expect(infos.find((info) => info.name === "tool2")).toBeDefined();
    });
  });
});
