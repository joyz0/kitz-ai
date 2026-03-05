import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isAbortError, isTransientNetworkError, registerUnhandledRejectionHandler, isUnhandledRejectionHandled, installUnhandledRejectionHandler, isFatalError, isConfigError } from '../unhandled-rejections.js';

describe('Unhandled Rejections', () => {
  describe('isAbortError', () => {
    it('should return true for AbortError', () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      expect(isAbortError(error)).toBe(true);
    });

    it('should return true for undici AbortError message', () => {
      const error = new Error('This operation was aborted');
      expect(isAbortError(error)).toBe(true);
    });

    it('should return false for non-AbortError', () => {
      const error = new Error('Test error');
      expect(isAbortError(error)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isAbortError('not an error')).toBe(false);
      expect(isAbortError(null)).toBe(false);
      expect(isAbortError(undefined)).toBe(false);
    });
  });

  describe('isTransientNetworkError', () => {
    it('should return true for transient network error codes', () => {
      const error = new Error('Network error');
      (error as any).code = 'ECONNRESET';
      expect(isTransientNetworkError(error)).toBe(true);
    });

    it('should return true for transient network error names', () => {
      const error = new Error('Timeout');
      error.name = 'TimeoutError';
      expect(isTransientNetworkError(error)).toBe(true);
    });

    it('should return true for fetch failed TypeError', () => {
      const error = new TypeError('fetch failed');
      expect(isTransientNetworkError(error)).toBe(true);
    });

    it('should return true for transient network error messages', () => {
      const error = new Error('socket hang up');
      expect(isTransientNetworkError(error)).toBe(true);
    });

    it('should return false for non-transient errors', () => {
      const error = new Error('Test error');
      expect(isTransientNetworkError(error)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isTransientNetworkError('not an error')).toBe(false);
      expect(isTransientNetworkError(null)).toBe(false);
      expect(isTransientNetworkError(undefined)).toBe(false);
    });
  });

  describe('isFatalError', () => {
    it('should return true for fatal error codes', () => {
      const error = new Error('Out of memory');
      (error as any).code = 'ERR_OUT_OF_MEMORY';
      expect(isFatalError(error)).toBe(true);
    });

    it('should return true for fatal error codes in cause', () => {
      const cause = new Error('Out of memory');
      (cause as any).code = 'ERR_OUT_OF_MEMORY';
      const error = new Error('Wrapper error');
      (error as any).cause = cause;
      expect(isFatalError(error)).toBe(true);
    });

    it('should return false for non-fatal error codes', () => {
      const error = new Error('Network error');
      (error as any).code = 'ECONNRESET';
      expect(isFatalError(error)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isFatalError('not an error')).toBe(false);
      expect(isFatalError(null)).toBe(false);
      expect(isFatalError(undefined)).toBe(false);
    });
  });

  describe('isConfigError', () => {
    it('should return true for config error codes', () => {
      const error = new Error('Invalid config');
      (error as any).code = 'INVALID_CONFIG';
      expect(isConfigError(error)).toBe(true);
    });

    it('should return true for config error codes in cause', () => {
      const cause = new Error('Missing API key');
      (cause as any).code = 'MISSING_API_KEY';
      const error = new Error('Wrapper error');
      (error as any).cause = cause;
      expect(isConfigError(error)).toBe(true);
    });

    it('should return false for non-config error codes', () => {
      const error = new Error('Network error');
      (error as any).code = 'ECONNRESET';
      expect(isConfigError(error)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isConfigError('not an error')).toBe(false);
      expect(isConfigError(null)).toBe(false);
      expect(isConfigError(undefined)).toBe(false);
    });
  });

  describe('registerUnhandledRejectionHandler', () => {
    it('should register and unregister handler', () => {
      const handler = vi.fn().mockReturnValue(false);
      const unregister = registerUnhandledRejectionHandler(handler);
      
      // Test that handler is registered
      expect(isUnhandledRejectionHandled('test')).toBe(false);
      
      // Unregister handler
      unregister();
      
      // Test that handler is no longer registered
      expect(isUnhandledRejectionHandled('test')).toBe(false);
    });

    it('should return true when handler handles rejection', () => {
      const handler = vi.fn().mockReturnValue(true);
      const unregister = registerUnhandledRejectionHandler(handler);
      
      expect(isUnhandledRejectionHandled('test')).toBe(true);
      
      unregister();
    });

    it('should handle handler errors gracefully', () => {
      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const unregister = registerUnhandledRejectionHandler(handler);
      
      // Should not throw
      expect(isUnhandledRejectionHandled('test')).toBe(false);
      
      unregister();
    });
  });

  describe('installUnhandledRejectionHandler', () => {
    it('should install handler without throwing', () => {
      expect(() => installUnhandledRejectionHandler()).not.toThrow();
    });
  });

  describe('isTransientNetworkError', () => {
    it('should handle errors array in candidate', () => {
      const error = new Error('Test error');
      const networkError = new Error('Network error');
      (networkError as any).code = 'ECONNRESET';
      (error as any).errors = [networkError];
      expect(isTransientNetworkError(error)).toBe(true);
    });

    it('should handle empty message', () => {
      const error = new Error('');
      expect(isTransientNetworkError(error)).toBe(false);
    });

    it('should handle fetch failed message', () => {
      const error = new Error('fetch failed');
      expect(isTransientNetworkError(error)).toBe(true);
    });
  });

  describe('installUnhandledRejectionHandler branches', () => {
    it('should handle already handled rejections', () => {
      // Register a handler that handles the rejection
      const handler = vi.fn().mockReturnValue(true);
      const unregister = registerUnhandledRejectionHandler(handler);

      // Mock process.exit to avoid actual exit
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('Exit called'); });
      const error = new Error('Test error');

      // Install handler
      installUnhandledRejectionHandler();

      // Emit unhandled rejection
      process.emit('unhandledRejection', error, Promise.resolve());

      // Restore
      unregister();
      exitSpy.mockRestore();
    });

    it('should handle AbortError', () => {
      // Mock console.warn
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Mock process.exit to avoid actual exit
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('Exit called'); });

      // Create AbortError
      const error = new Error('Aborted');
      error.name = 'AbortError';

      // Install handler
      installUnhandledRejectionHandler();

      // Emit unhandled rejection
      process.emit('unhandledRejection', error, Promise.resolve());

      // Verify
      expect(warnSpy).toHaveBeenCalled();

      // Restore
      warnSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should handle fatal errors', () => {
      // Mock console.error
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      // Mock process.exit to avoid actual exit
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('Exit called'); });

      // Create fatal error
      const error = new Error('Out of memory');
      (error as any).code = 'ERR_OUT_OF_MEMORY';

      // Install handler
      installUnhandledRejectionHandler();

      // Emit unhandled rejection
      expect(() => {
        process.emit('unhandledRejection', error, Promise.resolve());
      }).toThrow('Exit called');

      // Verify
      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Restore
      errorSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should handle config errors', () => {
      // Mock console.error
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      // Mock process.exit to avoid actual exit
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('Exit called'); });

      // Create config error
      const error = new Error('Invalid config');
      (error as any).code = 'INVALID_CONFIG';

      // Install handler
      installUnhandledRejectionHandler();

      // Emit unhandled rejection
      expect(() => {
        process.emit('unhandledRejection', error, Promise.resolve());
      }).toThrow('Exit called');

      // Verify
      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Restore
      errorSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should handle transient network errors', () => {
      // Mock console.warn
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Mock process.exit to avoid actual exit
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('Exit called'); });

      // Create transient network error
      const error = new Error('Network error');
      (error as any).code = 'ECONNRESET';

      // Install handler
      installUnhandledRejectionHandler();

      // Emit unhandled rejection
      process.emit('unhandledRejection', error, Promise.resolve());

      // Verify
      expect(warnSpy).toHaveBeenCalled();

      // Restore
      warnSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should handle other unhandled rejections', () => {
      // Mock console.error
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      // Mock process.exit to avoid actual exit
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('Exit called'); });

      // Create generic error
      const error = new Error('Test error');

      // Install handler
      installUnhandledRejectionHandler();

      // Emit unhandled rejection
      expect(() => {
        process.emit('unhandledRejection', error, Promise.resolve());
      }).toThrow('Exit called');

      // Verify
      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Restore
      errorSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });
});
