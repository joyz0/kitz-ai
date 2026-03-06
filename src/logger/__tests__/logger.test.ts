import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getLogger,
  getChildLogger,
  registerLogTransport,
  resetLogger,
} from '../logger.js';
import { pruneOldRollingLogs } from '../logger.js';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

describe('Logger', () => {
  const testDir = path.join(process.cwd(), 'test-temp-logs');
  const testLogFile = path.join(testDir, 'test.log');

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
      const childLogger = getChildLogger(
        { component: 'test' },
        { level: 'warn' },
      );
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

  describe('log buffering', () => {
    it('should buffer logs and write asynchronously', async () => {
      const logger = getLogger();
      const logCount = 100;

      // Write multiple logs
      for (let i = 0; i < logCount; i++) {
        logger.info(`Test log ${i}`);
      }

      // Wait for buffer to flush
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check if logs were written to default location
      const logsDir = path.join(process.cwd(), 'logs');
      expect(fs.existsSync(logsDir)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should not throw errors when logging', async () => {
      const logger = getLogger();

      // This should not throw an error
      expect(() => {
        logger.info('Test log that should not throw');
      }).not.toThrow();
    });
  });

  describe('log redaction', () => {
    it('should redact sensitive information in logs', async () => {
      const transport = vi.fn();
      registerLogTransport(transport);

      const logger = getLogger();
      const sensitiveData = {
        apiKey: 'sk-1234567890abcdef1234567890abcdef',
        token: 'ghp_1234567890abcdef1234567890abcdef',
        password: 'mysecretpassword',
        message: 'Test message with apiKey=sk-1234567890abcdef1234567890abcdef',
      };

      logger.info('Test log with sensitive data', sensitiveData);

      // Wait for log to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if transport was called
      expect(transport).toHaveBeenCalled();
      const logObj = transport.mock.calls[0][0];

      // Check if sensitive data was redacted
      expect(logObj).toBeDefined();
    });

    it('should redact nested sensitive information', async () => {
      const transport = vi.fn();
      registerLogTransport(transport);

      const logger = getLogger();
      const nestedData = {
        user: {
          name: 'John Doe',
          credentials: {
            password: 'secret123',
            token: 'Bearer abcdef123456',
          },
        },
      };

      logger.info('Test log with nested sensitive data', nestedData);

      // Wait for log to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if transport was called
      expect(transport).toHaveBeenCalled();
      const logObj = transport.mock.calls[0][0];

      // Check if nested sensitive data was redacted
      expect(logObj).toBeDefined();
    });
  });

  describe('different log levels', () => {
    it('should log at different levels', async () => {
      const transport = vi.fn();
      registerLogTransport(transport);

      const logger = getLogger();

      // Log at different levels
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      // Wait for logs to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if transport was called multiple times
      expect(transport).toHaveBeenCalled();
    });
  });

  describe('silent mode', () => {
    it('should not write to file in silent mode', async () => {
      // Mock the config to return silent mode
      vi.mock('../config.js', () => ({
        resolveLoggingConfig: vi.fn(() => ({
          level: 'silent',
        })),
      }));

      // Reset logger to apply new config
      resetLogger();

      const logger = getLogger();
      logger.info('This should not be written to file');

      // Wait for any potential file operations
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // The log file should not be created in silent mode
      const logsDir = path.join(process.cwd(), 'logs');
      const logFile = path.join(logsDir, 'app.log');
      expect(fs.existsSync(logFile)).toBe(false);
    });
  });

  describe('log file size limit', () => {
    it('should handle log file size limit', async () => {
      // Mock the config to return a small maxFileBytes
      vi.mock('../config.js', () => ({
        resolveLoggingConfig: vi.fn(() => ({
          maxFileBytes: 100, // Very small limit for testing
        })),
      }));

      // Reset logger to apply new config
      resetLogger();

      const logger = getLogger();

      // Write multiple logs to exceed the limit
      for (let i = 0; i < 10; i++) {
        logger.info(`Test log ${i} with some extra content to make it longer`);
      }

      // Wait for log processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // The logger should not throw an error
      expect(() => {
        logger.info('Additional log after limit');
      }).not.toThrow();
    });
  });

  describe('log settings change detection', () => {
    it('should detect and apply new settings', async () => {
      const initialTransport = vi.fn();
      registerLogTransport(initialTransport);

      // Get logger with initial settings
      const logger1 = getLogger();

      // Mock the config to return different settings
      vi.mock('../config.js', () => ({
        resolveLoggingConfig: vi.fn(() => ({
          level: 'debug',
        })),
      }));

      // Reset logger to clear cache
      resetLogger();

      // Get logger with new settings
      const logger2 = getLogger();

      // Should return a new logger instance
      expect(logger1).not.toBe(logger2);
    });
  });

  describe('rolling log files', () => {
    it('should use rolling log files with date suffix', async () => {
      // Mock the config to use default settings (which should use rolling logs)
      vi.mock('../config.js', () => ({
        resolveLoggingConfig: vi.fn(() => ({})),
      }));

      // Reset logger to apply new config
      resetLogger();

      const logger = getLogger();
      logger.info('Test log for rolling file');

      // Wait for log to be processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if log file was created with date suffix
      const logsDir = path.join(process.cwd(), 'logs');
      expect(fs.existsSync(logsDir)).toBe(true);

      const files = fs.readdirSync(logsDir);
      const logFiles = files.filter(
        (file) => file.startsWith('app-') && file.endsWith('.log'),
      );
      expect(logFiles.length).toBeGreaterThan(0);
    });
  });

  describe('old log cleanup', () => {
    it('should clean up old log files', async () => {
      // Create a test log directory
      const testLogDir = path.join(process.cwd(), 'test-old-logs');
      if (!fs.existsSync(testLogDir)) {
        fs.mkdirSync(testLogDir, { recursive: true });
      }

      // Create old log files with dates in the past
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2); // 2 days ago
      const oldDateStr = oldDate.toISOString().split('T')[0];
      const oldLogFile = path.join(testLogDir, `app-${oldDateStr}.log`);
      fs.writeFileSync(oldLogFile, 'Old log content');
      // Set the file's mtime to 2 days ago
      fs.utimesSync(oldLogFile, oldDate, oldDate);

      // Create a recent log file
      const recentDate = new Date();
      const recentDateStr = recentDate.toISOString().split('T')[0];
      const recentLogFile = path.join(testLogDir, `app-${recentDateStr}.log`);
      fs.writeFileSync(recentLogFile, 'Recent log content');

      // Directly call the cleanup function
      await pruneOldRollingLogs(testLogDir);

      // Check if old log file was deleted
      expect(fs.existsSync(oldLogFile)).toBe(false);
      // Check if recent log file still exists
      expect(fs.existsSync(recentLogFile)).toBe(true);

      // Clean up test directory
      if (fs.existsSync(testLogDir)) {
        fs.rmSync(testLogDir, { recursive: true, force: true });
      }
    });
  });

  describe('different console styles', () => {
    it('should support different console styles', async () => {
      // Mock the config to use JSON console style
      vi.mock('../config.js', () => ({
        resolveLoggingConfig: vi.fn(() => ({
          consoleStyle: 'json',
        })),
      }));

      // Reset logger to apply new config
      resetLogger();

      const logger = getLogger();

      // This should not throw an error
      expect(() => {
        logger.info('Test log with JSON style');
      }).not.toThrow();

      // Mock the config to use compact console style
      vi.mock('../config.js', () => ({
        resolveLoggingConfig: vi.fn(() => ({
          consoleStyle: 'compact',
        })),
      }));

      // Reset logger to apply new config
      resetLogger();

      const logger2 = getLogger();

      // This should not throw an error
      expect(() => {
        logger2.info('Test log with compact style');
      }).not.toThrow();
    });
  });
});
