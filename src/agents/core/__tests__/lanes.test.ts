// 测试 Lanes 模块的功能

import { describe, it, expect } from 'vitest';
import { resolveNestedAgentLane, AGENT_LANE_NESTED, AGENT_LANE_SUBAGENT } from '../lanes.js';

describe('Lanes 模块测试', () => {
  describe('resolveNestedAgentLane', () => {
    it('应该返回 AGENT_LANE_NESTED（如果 lane 为 undefined）', () => {
      const result = resolveNestedAgentLane(undefined);
      expect(result).toBe(AGENT_LANE_NESTED);
    });

    it('应该返回 AGENT_LANE_NESTED（如果 lane 为 "cron"）', () => {
      const result = resolveNestedAgentLane('cron');
      expect(result).toBe(AGENT_LANE_NESTED);
    });

    it('应该返回传入的 lane（如果不是 "cron"）', () => {
      const result = resolveNestedAgentLane('test');
      expect(result).toBe('test');
    });

    it('应该返回 AGENT_LANE_NESTED（如果 lane 为空字符串）', () => {
      const result = resolveNestedAgentLane('');
      expect(result).toBe(AGENT_LANE_NESTED);
    });

    it('应该返回 AGENT_LANE_NESTED（如果 lane 为空格）', () => {
      const result = resolveNestedAgentLane('   ');
      expect(result).toBe(AGENT_LANE_NESTED);
    });
  });

  describe('常量测试', () => {
    it('AGENT_LANE_NESTED 应该存在', () => {
      expect(AGENT_LANE_NESTED).toBeDefined();
    });

    it('AGENT_LANE_SUBAGENT 应该存在', () => {
      expect(AGENT_LANE_SUBAGENT).toBeDefined();
    });
  });
});
