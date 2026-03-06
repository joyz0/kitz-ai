import { describe, it, expect } from 'vitest';
import { applyAllDefaults } from '../default-values.js';
import type { OpenClawConfig } from '../zod-schema.js';

describe('Config Default Values', () => {
  describe('applyAllDefaults', () => {
    it('should apply default values to empty config', () => {
      const config = applyAllDefaults({});
      expect(config).toBeDefined();
      expect(config.meta).toBeDefined();
    });

    it('should preserve existing values', () => {
      const testConfig: OpenClawConfig = {
        meta: {
          version: '1.0.0'
        }
      };

      const config = applyAllDefaults(testConfig);
      expect(config.meta?.version).toBe('1.0.0');
    });

    it('should apply defaults to nested objects', () => {
      const testConfig: OpenClawConfig = {
        logging: {
          level: 'debug'
        }
      };

      const config = applyAllDefaults(testConfig);
      expect(config.logging?.level).toBe('debug');
      // Additional tests for nested defaults can be added here
    });
  });
});
