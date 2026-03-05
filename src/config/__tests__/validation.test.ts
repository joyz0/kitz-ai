import { describe, it, expect } from 'vitest';
import { validateConfigObjectRaw, validateConfigObjectWithPlugins } from '../validation.js';

describe('Config Validation', () => {
  describe('validateConfigObjectRaw', () => {
    it('should validate valid config', () => {
      const validConfig = {
        meta: {
          version: '1.0.0'
        }
      };

      const result = validateConfigObjectRaw(validConfig);
      expect(result.ok).toBe(true);
      expect(result.config).toBeDefined();
    });

    it('should handle empty config', () => {
      const result = validateConfigObjectRaw({});
      expect(result.ok).toBe(true);
      expect(result.config).toBeDefined();
    });

    it('should handle invalid config', () => {
      // @ts-expect-error - Intentionally providing invalid config
      const result = validateConfigObjectRaw({ invalid: 'value' });
      expect(result.ok).toBe(false);
      expect(result.issues).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('validateConfigObjectWithPlugins', () => {
    it('should validate config with plugins', () => {
      const validConfig = {
        meta: {
          version: '1.0.0'
        }
      };

      const result = validateConfigObjectWithPlugins(validConfig);
      expect(result.ok).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it('should return warnings for WhatsApp without allowFrom', () => {
      const configWithWhatsapp = {
        meta: {
          version: '1.0.0'
        },
        channels: {
          whatsapp: {
            enabled: true
          }
        }
      };

      const result = validateConfigObjectWithPlugins(configWithWhatsapp);
      expect(result.ok).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should return issues for Telegram without token', () => {
      const configWithTelegram = {
        meta: {
          version: '1.0.0'
        },
        channels: {
          telegram: {
            enabled: true
          }
        }
      };

      const result = validateConfigObjectWithPlugins(configWithTelegram);
      expect(result.ok).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should return warnings for agent avatar with invalid format', () => {
      const configWithAgent = {
        meta: {
          version: '1.0.0'
        },
        agents: {
          list: [
            {
              id: 'test-agent',
              identity: {
                avatar: 'local-file.png'
              }
            }
          ]
        }
      };

      const result = validateConfigObjectWithPlugins(configWithAgent);
      expect(result.ok).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
