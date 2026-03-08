import { describe, it, expect, vi, beforeEach } from 'vitest';
// 导入 mock-logger 以确保 logger 模块被正确模拟
import { getMockLogger } from '../../../logger/mock-logger.js';
import { ToolRegistry, Tool } from '../registry.js';

// 获取 mock logger 实例（确保 mock 生效）
const mockLogger = getMockLogger();

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('register', () => {
    it('should register a tool', () => {
      const tool: Tool = {
        name: 'test-tool',
        description: 'A test tool',
        parameters: {
          input: {
            type: 'string',
            required: true,
            description: 'Input parameter'
          }
        },
        execute: async () => 'test result'
      };

      registry.register(tool);
      expect(registry.exists('test-tool')).toBe(true);
      expect(registry.get('test-tool')).toEqual(tool);
    });

    it('should overwrite an existing tool', () => {
      const tool1: Tool = {
        name: 'test-tool',
        description: 'A test tool',
        parameters: {},
        execute: async () => 'result 1'
      };

      const tool2: Tool = {
        name: 'test-tool',
        description: 'An updated test tool',
        parameters: {},
        execute: async () => 'result 2'
      };

      registry.register(tool1);
      registry.register(tool2);
      const retrieved = registry.get('test-tool');
      expect(retrieved?.description).toBe('An updated test tool');
    });
  });

  describe('unregister', () => {
    it('should unregister a tool', () => {
      const tool: Tool = {
        name: 'test-tool',
        description: 'A test tool',
        parameters: {},
        execute: async () => 'test result'
      };

      registry.register(tool);
      const result = registry.unregister('test-tool');
      expect(result).toBe(true);
      expect(registry.exists('test-tool')).toBe(false);
    });

    it('should return false when unregistering non-existent tool', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('should return the tool for existing tool', () => {
      const tool: Tool = {
        name: 'test-tool',
        description: 'A test tool',
        parameters: {},
        execute: async () => 'test result'
      };

      registry.register(tool);
      const retrieved = registry.get('test-tool');
      expect(retrieved).toEqual(tool);
    });

    it('should return undefined for non-existent tool', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered tools', () => {
      const tool1: Tool = {
        name: 'tool1',
        description: 'Tool 1',
        parameters: {},
        execute: async () => 'result 1'
      };

      const tool2: Tool = {
        name: 'tool2',
        description: 'Tool 2',
        parameters: {},
        execute: async () => 'result 2'
      };

      registry.register(tool1);
      registry.register(tool2);
      const tools = registry.getAll();
      expect(tools).toHaveLength(2);
      expect(tools.find(t => t.name === 'tool1')).toBeDefined();
      expect(tools.find(t => t.name === 'tool2')).toBeDefined();
    });
  });

  describe('getToolNames', () => {
    it('should return all tool names', () => {
      const tool1: Tool = {
        name: 'tool1',
        description: 'Tool 1',
        parameters: {},
        execute: async () => 'result 1'
      };

      const tool2: Tool = {
        name: 'tool2',
        description: 'Tool 2',
        parameters: {},
        execute: async () => 'result 2'
      };

      registry.register(tool1);
      registry.register(tool2);
      const names = registry.getToolNames();
      expect(names).toEqual(['tool1', 'tool2']);
    });
  });

  describe('exists', () => {
    it('should return true for existing tool', () => {
      const tool: Tool = {
        name: 'test-tool',
        description: 'A test tool',
        parameters: {},
        execute: async () => 'test result'
      };

      registry.register(tool);
      expect(registry.exists('test-tool')).toBe(true);
    });

    it('should return false for non-existent tool', () => {
      expect(registry.exists('non-existent')).toBe(false);
    });
  });

  describe('validateToolParams', () => {
    it('should validate parameters correctly', () => {
      const tool: Tool = {
        name: 'test-tool',
        description: 'A test tool',
        parameters: {
          input: {
            type: 'string',
            required: true,
            description: 'Input parameter'
          },
          count: {
            type: 'number',
            required: false,
            description: 'Count parameter'
          }
        },
        execute: async () => 'test result'
      };

      registry.register(tool);

      // Valid parameters
      const validResult = registry.validateToolParams('test-tool', { input: 'test' });
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Missing required parameter
      const missingResult = registry.validateToolParams('test-tool', {});
      expect(missingResult.valid).toBe(false);
      expect(missingResult.errors).toContain('Required parameter input is missing');

      // Wrong parameter type
      const typeResult = registry.validateToolParams('test-tool', { input: 123 });
      expect(typeResult.valid).toBe(false);
      expect(typeResult.errors).toContain('Parameter input should be of type string, got number');

      // Non-existent tool
      const nonExistentResult = registry.validateToolParams('non-existent', {});
      expect(nonExistentResult.valid).toBe(false);
      expect(nonExistentResult.errors).toContain('Tool non-existent not found');
    });
  });

  describe('clear', () => {
    it('should clear all tools', () => {
      const tool: Tool = {
        name: 'test-tool',
        description: 'A test tool',
        parameters: {},
        execute: async () => 'test result'
      };

      registry.register(tool);
      registry.clear();
      expect(registry.getCount()).toBe(0);
      expect(registry.exists('test-tool')).toBe(false);
    });
  });

  describe('getCount', () => {
    it('should return the number of registered tools', () => {
      const tool1: Tool = {
        name: 'tool1',
        description: 'Tool 1',
        parameters: {},
        execute: async () => 'result 1'
      };

      const tool2: Tool = {
        name: 'tool2',
        description: 'Tool 2',
        parameters: {},
        execute: async () => 'result 2'
      };

      expect(registry.getCount()).toBe(0);
      registry.register(tool1);
      expect(registry.getCount()).toBe(1);
      registry.register(tool2);
      expect(registry.getCount()).toBe(2);
    });
  });
});
