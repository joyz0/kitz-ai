import { describe, it, expect } from 'vitest';
import { migrateLegacyConfig, findLegacyConfigIssues } from '../legacy-migrate.js';
import type { OpenClawConfig, LegacyConfigIssue } from '../zod-schema.js';

describe('Legacy Migrate', () => {
  describe('migrateLegacyConfig', () => {
    it('should return the config as-is when no migration is needed', () => {
      const config: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
      };
      const result = migrateLegacyConfig(config);
      expect(result).toEqual(config);
    });

    it('should handle empty config', () => {
      const config: OpenClawConfig = {};
      const result = migrateLegacyConfig(config);
      expect(result).toEqual({});
    });
  });

  describe('findLegacyConfigIssues', () => {
    it('should return empty array when no legacy issues are found', () => {
      const resolvedConfig: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
      };
      const parsedSource: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
      };

      const issues = findLegacyConfigIssues(resolvedConfig, parsedSource);
      expect(issues).toEqual([]);
    });

    it('should return empty array when resolvedConfig is not an object', () => {
      const resolvedConfig = 'not an object';
      const parsedSource: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
      };

      const issues = findLegacyConfigIssues(resolvedConfig, parsedSource);
      expect(issues).toEqual([]);
    });

    it('should return empty array when parsedSource is not an object', () => {
      const resolvedConfig: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
      };
      const parsedSource = 'not an object';

      const issues = findLegacyConfigIssues(resolvedConfig, parsedSource);
      expect(issues).toEqual([]);
    });
  });
});
