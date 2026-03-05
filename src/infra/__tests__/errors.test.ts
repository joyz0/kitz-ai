import { describe, it, expect } from 'vitest';
import { extractErrorCode, readErrorName, collectErrorGraphCandidates, isErrno, hasErrnoCode, formatErrorMessage, formatUncaughtError } from '../errors.js';

describe('Infra Errors', () => {
  describe('extractErrorCode', () => {
    it('should extract error code from error object', () => {
      const error = new Error('Test error');
      (error as any).code = 'TEST_CODE';
      expect(extractErrorCode(error)).toBe('TEST_CODE');
    });

    it('should handle numeric error code', () => {
      const error = new Error('Test error');
      (error as any).code = 123;
      expect(extractErrorCode(error)).toBe('123');
    });

    it('should return undefined for non-error objects', () => {
      expect(extractErrorCode('not an error')).toBeUndefined();
      expect(extractErrorCode(null)).toBeUndefined();
      expect(extractErrorCode(undefined)).toBeUndefined();
    });
  });

  describe('readErrorName', () => {
    it('should read error name from error object', () => {
      const error = new Error('Test error');
      expect(readErrorName(error)).toBe('Error');
    });

    it('should return empty string for non-error objects', () => {
      expect(readErrorName('not an error')).toBe('');
      expect(readErrorName(null)).toBe('');
      expect(readErrorName(undefined)).toBe('');
    });
  });

  describe('collectErrorGraphCandidates', () => {
    it('should collect error graph candidates', () => {
      const error = new Error('Test error');
      const nestedError = new Error('Nested error');
      (error as any).cause = nestedError;

      const candidates = collectErrorGraphCandidates(error, (current) => {
        return current.cause ? [current.cause] : [];
      });

      expect(candidates).toHaveLength(2);
      expect(candidates[0]).toBe(error);
      expect(candidates[1]).toBe(nestedError);
    });
  });

  describe('isErrno', () => {
    it('should return true for errors with code property', () => {
      const error = new Error('Test error');
      (error as any).code = 'TEST_CODE';
      expect(isErrno(error)).toBe(true);
    });

    it('should return false for errors without code property', () => {
      const error = new Error('Test error');
      expect(isErrno(error)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isErrno('not an error')).toBe(false);
      expect(isErrno(null)).toBe(false);
      expect(isErrno(undefined)).toBe(false);
    });
  });

  describe('hasErrnoCode', () => {
    it('should return true for errors with specific code', () => {
      const error = new Error('Test error');
      (error as any).code = 'TEST_CODE';
      expect(hasErrnoCode(error, 'TEST_CODE')).toBe(true);
    });

    it('should return false for errors with different code', () => {
      const error = new Error('Test error');
      (error as any).code = 'TEST_CODE';
      expect(hasErrnoCode(error, 'OTHER_CODE')).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(hasErrnoCode('not an error', 'TEST_CODE')).toBe(false);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message from Error object', () => {
      const error = new Error('Test error message');
      expect(formatErrorMessage(error)).toBe('Test error message');
    });

    it('should format string error', () => {
      expect(formatErrorMessage('Test error string')).toBe('Test error string');
    });

    it('should format numeric error', () => {
      expect(formatErrorMessage(123)).toBe('123');
    });

    it('should format boolean error', () => {
      expect(formatErrorMessage(true)).toBe('true');
    });

    it('should format object error', () => {
      const errorObj = { message: 'Test error' };
      expect(formatErrorMessage(errorObj)).toContain('Test error');
    });
  });

  describe('formatUncaughtError', () => {
    it('should format INVALID_CONFIG error', () => {
      const error = new Error('Invalid config');
      (error as any).code = 'INVALID_CONFIG';
      expect(formatUncaughtError(error)).toBe('Invalid config');
    });

    it('should format error with stack', () => {
      const error = new Error('Test error');
      expect(formatUncaughtError(error)).toContain('Test error');
    });

    it('should format non-Error object', () => {
      expect(formatUncaughtError('Test error')).toBe('Test error');
    });
  });
});
