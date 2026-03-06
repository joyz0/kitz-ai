import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyConfigEnvVars, resolveConfigEnvVars, MissingEnvVarError, containsEnvVarReference } from '../env-substitution.js';

describe('Config Env Substitution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear environment variables for testing
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('resolveConfigEnvVars', () => {
    it('should substitute environment variables in config', () => {
      process.env.TEST_VAR = 'test-value';
      
      const config = {
        test: '${TEST_VAR}',
        nested: {
          value: 'prefix-${TEST_VAR}-suffix'
        }
      };

      const resolved = resolveConfigEnvVars(config, process.env) as typeof config;
      expect(resolved.test).toBe('test-value');
      expect(resolved.nested.value).toBe('prefix-test-value-suffix');
    });

    it('should handle undefined environment variables', () => {
      const config = {
        test: '${NON_EXISTENT_VAR}'
      };

      const resolved = resolveConfigEnvVars(config, process.env) as typeof config;
      expect(resolved.test).toBe('${NON_EXISTENT_VAR}');
    });

    it('should handle nested objects and arrays', () => {
      process.env.TEST_VAR = 'test-value';
      
      const config = {
        array: ['${TEST_VAR}', 'static'],
        nested: {
          value: '${TEST_VAR}',
          array: ['${TEST_VAR}']
        }
      };

      const resolved = resolveConfigEnvVars(config, process.env) as typeof config;
      expect(resolved.array[0]).toBe('test-value');
      expect(resolved.array[1]).toBe('static');
      expect(resolved.nested.value).toBe('test-value');
      expect(resolved.nested.array[0]).toBe('test-value');
    });

    it('should handle primitive values other than string', () => {
      const config = {
        number: 123,
        boolean: true,
        nullValue: null,
        undefinedValue: undefined
      };

      const resolved = resolveConfigEnvVars(config, process.env) as typeof config;
      expect(resolved.number).toBe(123);
      expect(resolved.boolean).toBe(true);
      expect(resolved.nullValue).toBe(null);
      expect(resolved.undefinedValue).toBe(undefined);
    });

    it('should collect missing variables', () => {
      const missingVars = new Set<string>();
      const config = {
        test: '${NON_EXISTENT_VAR}'
      };

      resolveConfigEnvVars(config, process.env, missingVars);
      expect(missingVars.has('NON_EXISTENT_VAR')).toBe(true);
    });
  });

  describe('containsEnvVarReference', () => {
    it('should return true for strings with env var references', () => {
      expect(containsEnvVarReference('${TEST_VAR}')).toBe(true);
      expect(containsEnvVarReference('prefix-${TEST_VAR}-suffix')).toBe(true);
    });

    it('should return false for strings without env var references', () => {
      expect(containsEnvVarReference('plain string')).toBe(false);
      expect(containsEnvVarReference('')).toBe(false);
    });
  });

  describe('MissingEnvVarError', () => {
    it('should create error with correct message', () => {
      const error = new MissingEnvVarError('TEST_VAR');
      expect(error.message).toBe('Missing environment variable: TEST_VAR');
      expect(error.name).toBe('MissingEnvVarError');
      expect(error.varName).toBe('TEST_VAR');
    });
  });

  describe('applyConfigEnvVars', () => {
    it('should apply environment variables from config to process.env', () => {
      // Clear existing TEST_VAR if it exists
      delete process.env.TEST_VAR;
      
      const config = {
        env: {
          TEST_VAR: 'test-value'
        }
      };

      applyConfigEnvVars(config, process.env);
      expect(process.env.TEST_VAR).toBe('test-value');
    });

    it('should handle env.vars object', () => {
      // Clear existing TEST_VAR if it exists
      delete process.env.TEST_VAR;
      
      const config = {
        env: {
          vars: {
            TEST_VAR: 'test-value'
          }
        }
      };

      applyConfigEnvVars(config, process.env);
      expect(process.env.TEST_VAR).toBe('test-value');
    });
  });
});
