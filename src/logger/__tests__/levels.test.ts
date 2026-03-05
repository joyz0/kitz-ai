import { describe, it, expect } from 'vitest';
import { levelToMinLevel, normalizeLogLevel } from '../levels.js';

describe('Logger Levels', () => {
  describe('levelToMinLevel', () => {
    it('should convert log level to minimum level', () => {
      expect(levelToMinLevel('debug')).toBeDefined();
      expect(levelToMinLevel('info')).toBeDefined();
      expect(levelToMinLevel('warn')).toBeDefined();
      expect(levelToMinLevel('error')).toBeDefined();
      expect(levelToMinLevel('silent')).toBeDefined();
    });
  });

  describe('normalizeLogLevel', () => {
    it('should normalize valid log levels', () => {
      expect(normalizeLogLevel('debug', 'info')).toBe('debug');
      expect(normalizeLogLevel('info', 'warn')).toBe('info');
      expect(normalizeLogLevel('warn', 'error')).toBe('warn');
      expect(normalizeLogLevel('error', 'silent')).toBe('error');
      expect(normalizeLogLevel('silent', 'info')).toBe('silent');
    });

    it('should return default level for invalid levels', () => {
      expect(normalizeLogLevel('invalid', 'info')).toBe('info');
      expect(normalizeLogLevel(undefined, 'warn')).toBe('warn');
      expect(normalizeLogLevel(null, 'error')).toBe('error');
    });
  });
});
