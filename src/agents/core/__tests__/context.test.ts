// 测试 Context 模块的功能

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveContextTokensForModel, shouldSkipEagerContextWindowWarmup } from '../context.js';

describe('Context 模块测试', () => {
  describe('resolveContextTokensForModel', () => {
    it('应该返回 contextTokensOverride（如果提供）', () => {
      const result = resolveContextTokensForModel({
        contextTokensOverride: 4096,
      });
      expect(result).toBe(4096);
    });

    it('应该返回 Anthropic 1M 令牌（如果是 Anthropic 1M 模型）', () => {
      const result = resolveContextTokensForModel({
        provider: 'anthropic',
        model: 'claude-opus-4',
        cfg: {
          agents: {
            defaults: {
              models: {
                'anthropic/claude-opus-4': {
                  params: {
                    context1m: true,
                  },
                },
              },
            },
          },
        } as any,
      });
      expect(result).toBe(1048576);
    });

    it('应该返回 fallbackContextTokens（如果没有其他匹配）', () => {
      const result = resolveContextTokensForModel({
        fallbackContextTokens: 2048,
      });
      expect(result).toBe(2048);
    });
  });

  describe('shouldSkipEagerContextWindowWarmup', () => {
    it('应该跳过指定的命令', () => {
      const result = shouldSkipEagerContextWindowWarmup(['node', 'index.js', 'config']);
      expect(result).toBe(true);
    });

    it('不应该跳过往返指定的命令', () => {
      const result = shouldSkipEagerContextWindowWarmup(['node', 'index.js', 'chat']);
      expect(result).toBe(false);
    });
  });
});
