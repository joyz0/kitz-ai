import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLogger, getChildLogger, registerLogTransport, resetLogger } from '../logger.js';
import fs from 'node:fs';
import path from 'node:path';

describe('Logger', () => {
  const testDir = path.join(process.cwd(), 'test-temp-logs');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    // Reset logger before each test
    resetLogger();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    resetLogger();
  });

  describe('getLogger', () => {
    it('should return a logger instance', () => {
      const logger = getLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should return the same logger instance on subsequent calls', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });
  });

  describe('getChildLogger', () => {
    it('should return a child logger instance', () => {
      const parentLogger = getLogger();
      const childLogger = getChildLogger({ component: 'test' });
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });

    it('should allow setting a custom log level', () => {
      const childLogger = getChildLogger({ component: 'test' }, { level: 'warn' });
      expect(childLogger).toBeDefined();
    });
  });

  describe('registerLogTransport', () => {
    it('should register an external transport', () => {
      const transport = vi.fn();
      const unregister = registerLogTransport(transport);
      
      const logger = getLogger();
      logger.info('test message');
      
      // The transport should be called
      expect(transport).toHaveBeenCalled();
      
      // Unregister the transport
      unregister();
    });
  });

  describe('resetLogger', () => {
    it('should reset the logger instance', () => {
      const logger1 = getLogger();
      resetLogger();
      const logger2 = getLogger();
      expect(logger1).not.toBe(logger2);
    });
  });
});
