// 先导入 mock-logger，确保在所有其他导入之前
import { getMockLogger, resetMockLogger } from '../../logger/mock-logger.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthManager } from '../auth.js';
import { GatewayMessage } from '../protocol.js';

const mockLogger = getMockLogger();

describe('AuthManager', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    resetMockLogger();

    // Create AuthManager instance
    authManager = new AuthManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default token', () => {
      expect(authManager.isValidToken('default-token')).toBe(true);
    });
  });

  describe('authenticate', () => {
    it('should return false when no token is provided', async () => {
      const message: GatewayMessage = {
        type: 'test',
        payload: {},
      };

      const result = await authManager.authenticate(message);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('No token provided');
    });

    it('should return false when invalid token is provided', async () => {
      const message: GatewayMessage = {
        type: 'test',
        payload: {
          token: 'invalid-token',
        },
      };

      const result = await authManager.authenticate(message);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid token provided',
      );
    });

    it('should return true when valid token is provided', async () => {
      const message: GatewayMessage = {
        type: 'test',
        payload: {
          token: 'default-token',
        },
      };

      const result = await authManager.authenticate(message);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Authentication successful',
      );
    });

    it('should return false when error occurs during authentication', async () => {
      const message: GatewayMessage = {
        type: 'test',
        payload: {
          token: 'default-token',
        },
      };

      // Mock the Set.has method to throw an error
      const originalHas = Set.prototype.has;
      Set.prototype.has = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await authManager.authenticate(message);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during authentication',
        expect.any(Error),
      );

      // Restore original method
      Set.prototype.has = originalHas;
    });
  });

  describe('addToken', () => {
    it('should add a new token', () => {
      const newToken = 'new-token';
      authManager.addToken(newToken);

      expect(authManager.isValidToken(newToken)).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Added new token: ${newToken}`,
      );
    });

    it('should handle adding an existing token', () => {
      const existingToken = 'default-token';
      authManager.addToken(existingToken);

      expect(authManager.isValidToken(existingToken)).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Added new token: ${existingToken}`,
      );
    });
  });

  describe('removeToken', () => {
    it('should remove an existing token', () => {
      const tokenToRemove = 'default-token';
      authManager.removeToken(tokenToRemove);

      expect(authManager.isValidToken(tokenToRemove)).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Removed token: ${tokenToRemove}`,
      );
    });

    it('should handle removing a non-existent token', () => {
      const nonExistentToken = 'non-existent-token';
      authManager.removeToken(nonExistentToken);

      expect(authManager.isValidToken(nonExistentToken)).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Removed token: ${nonExistentToken}`,
      );
    });
  });

  describe('isValidToken', () => {
    it('should return true for valid token', () => {
      expect(authManager.isValidToken('default-token')).toBe(true);
    });

    it('should return false for invalid token', () => {
      expect(authManager.isValidToken('invalid-token')).toBe(false);
    });
  });
});
