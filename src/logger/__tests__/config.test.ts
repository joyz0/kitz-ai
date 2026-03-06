import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveLoggingConfig } from '../config.js';
import * as configModule from '../../config/index.js';

describe('Logger Config', () => {
  describe('resolveLoggingConfig', () => {
    it('should resolve logging config from global config', () => {
      const loggingConfig = resolveLoggingConfig();
      expect(loggingConfig).toBeDefined();
    });

    it('should return undefined when no logging config is present', () => {
      // Mock loadConfig to return empty config
      const mockLoadConfig = vi
        .spyOn(configModule, 'loadConfig')
        .mockReturnValue({});

      const loggingConfig = resolveLoggingConfig();
      expect(loggingConfig).toBeUndefined();

      // Restore original function
      mockLoadConfig.mockRestore();
    });

    it('should return default config when loadConfig throws error', () => {
      // Mock loadConfig to throw error
      const mockLoadConfig = vi
        .spyOn(configModule, 'loadConfig')
        .mockImplementation(() => {
          throw new Error('Config load error');
        });

      const loggingConfig = resolveLoggingConfig();
      expect(loggingConfig).toBeDefined();
      expect(loggingConfig?.level).toBe('info');
      expect(loggingConfig?.consoleLevel).toBe('info');
      expect(loggingConfig?.consoleStyle).toBe('pretty');
      expect(loggingConfig?.redactSensitive).toBe('tools');

      // Restore original function
      mockLoadConfig.mockRestore();
    });
  });
});
