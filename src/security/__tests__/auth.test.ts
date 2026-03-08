import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AuthManager,
  createAuthManager,
  AuthProvider,
  AuthResult,
  MemoryAuthProvider,
} from '../auth.js';
import { getMockLogger, resetMockLogger } from '../../logger/mock-logger.js';

// 模拟日志记录器
const mockLogger = getMockLogger();

describe('AuthManager', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    authManager = createAuthManager(mockLogger);
    // 重置模拟
    vi.clearAllMocks();
    resetMockLogger();
  });

  it('should create auth manager successfully', () => {
    expect(authManager).toBeDefined();
  });

  it('should register provider successfully', () => {
    const mockProvider: AuthProvider = {
      authenticate: vi.fn().mockResolvedValue({ success: true }),
      validateToken: vi.fn().mockResolvedValue(true),
      generateToken: vi.fn().mockResolvedValue('token'),
      revokeToken: vi.fn().mockResolvedValue(undefined),
    };

    authManager.registerProvider('test', mockProvider);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Registered auth provider: test',
    );
  });

  it('should get provider by name', () => {
    const mockProvider: AuthProvider = {
      authenticate: vi.fn().mockResolvedValue({ success: true }),
      validateToken: vi.fn().mockResolvedValue(true),
      generateToken: vi.fn().mockResolvedValue('token'),
      revokeToken: vi.fn().mockResolvedValue(undefined),
    };

    authManager.registerProvider('test', mockProvider);
    const provider = authManager.getProvider('test');
    expect(provider).toBeDefined();
  });

  it('should return undefined for non-existent provider', () => {
    const provider = authManager.getProvider('non-existent');
    expect(provider).toBeUndefined();
  });

  it('should authenticate with existing provider', async () => {
    const mockProvider: AuthProvider = {
      authenticate: vi.fn().mockResolvedValue({
        success: true,
        token: 'test-token',
        userId: 'test-user',
      }),
      validateToken: vi.fn().mockResolvedValue(true),
      generateToken: vi.fn().mockResolvedValue('token'),
      revokeToken: vi.fn().mockResolvedValue(undefined),
    };

    authManager.registerProvider('test', mockProvider);
    const result = await authManager.authenticate('test', {
      username: 'user',
      password: 'pass',
    });

    expect(result).toEqual({
      success: true,
      token: 'test-token',
      userId: 'test-user',
    });
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Authentication succeeded for provider: test',
    );
  });

  it('should handle authentication failure', async () => {
    const mockProvider: AuthProvider = {
      authenticate: vi
        .fn()
        .mockResolvedValue({ success: false, error: 'Invalid credentials' }),
      validateToken: vi.fn().mockResolvedValue(true),
      generateToken: vi.fn().mockResolvedValue('token'),
      revokeToken: vi.fn().mockResolvedValue(undefined),
    };

    authManager.registerProvider('test', mockProvider);
    const result = await authManager.authenticate('test', {
      username: 'user',
      password: 'pass',
    });

    expect(result).toEqual({ success: false, error: 'Invalid credentials' });
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Authentication failed for provider: test',
    );
  });

  it('should handle non-existent provider during authentication', async () => {
    const result = await authManager.authenticate('non-existent', {
      username: 'user',
      password: 'pass',
    });
    expect(result).toEqual({
      success: false,
      error: 'Auth provider not found: non-existent',
    });
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Auth provider not found: non-existent',
    );
  });

  it('should validate token with existing provider', async () => {
    const mockProvider: AuthProvider = {
      authenticate: vi.fn().mockResolvedValue({ success: true }),
      validateToken: vi.fn().mockResolvedValue(true),
      generateToken: vi.fn().mockResolvedValue('token'),
      revokeToken: vi.fn().mockResolvedValue(undefined),
    };

    authManager.registerProvider('test', mockProvider);
    const result = await authManager.validateToken('test', 'test-token');

    expect(result).toBe(true);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Token validation succeeded for provider: test',
    );
  });

  it('should handle token validation failure', async () => {
    const mockProvider: AuthProvider = {
      authenticate: vi.fn().mockResolvedValue({ success: true }),
      validateToken: vi.fn().mockResolvedValue(false),
      generateToken: vi.fn().mockResolvedValue('token'),
      revokeToken: vi.fn().mockResolvedValue(undefined),
    };

    authManager.registerProvider('test', mockProvider);
    const result = await authManager.validateToken('test', 'invalid-token');

    expect(result).toBe(false);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Token validation failed for provider: test',
    );
  });

  it('should generate token with existing provider', async () => {
    const mockProvider: AuthProvider = {
      authenticate: vi.fn().mockResolvedValue({ success: true }),
      validateToken: vi.fn().mockResolvedValue(true),
      generateToken: vi.fn().mockResolvedValue('test-token'),
      revokeToken: vi.fn().mockResolvedValue(undefined),
    };

    authManager.registerProvider('test', mockProvider);
    const token = await authManager.generateToken('test', 'test-user');

    expect(token).toBe('test-token');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Generated token for user test-user with provider: test',
    );
  });

  it('should revoke token with existing provider', async () => {
    const mockProvider: AuthProvider = {
      authenticate: vi.fn().mockResolvedValue({ success: true }),
      validateToken: vi.fn().mockResolvedValue(true),
      generateToken: vi.fn().mockResolvedValue('token'),
      revokeToken: vi.fn().mockResolvedValue(undefined),
    };

    authManager.registerProvider('test', mockProvider);
    await authManager.revokeToken('test', 'test-token');

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Revoked token for provider: test',
    );
  });
});

describe('MemoryAuthProvider', () => {
  let authProvider: AuthProvider;

  beforeEach(() => {
    authProvider = new MemoryAuthProvider(mockLogger);
  });

  it('should create memory auth provider successfully', () => {
    expect(authProvider).toBeInstanceOf(MemoryAuthProvider);
  });

  it('should authenticate with valid credentials', async () => {
    const result = await authProvider.authenticate({
      username: 'admin',
      password: 'password',
    });
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.userId).toBe('admin');
  });

  it('should fail authentication with invalid credentials', async () => {
    const result = await authProvider.authenticate({
      username: 'admin',
      password: 'wrong',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
  });

  it('should validate valid token', async () => {
    const authResult = await authProvider.authenticate({
      username: 'admin',
      password: 'password',
    });
    const token = authResult.token!;
    const result = await authProvider.validateToken(token);
    expect(result).toBe(true);
  });

  it('should invalidate invalid token', async () => {
    const result = await authProvider.validateToken('invalid-token');
    expect(result).toBe(false);
  });

  it('should generate token', async () => {
    const token = await authProvider.generateToken('test-user');
    expect(token).toBeDefined();
    const result = await authProvider.validateToken(token);
    expect(result).toBe(true);
  });

  it('should revoke token', async () => {
    const authResult = await authProvider.authenticate({
      username: 'admin',
      password: 'password',
    });
    const token = authResult.token!;
    await authProvider.revokeToken(token);
    const result = await authProvider.validateToken(token);
    expect(result).toBe(false);
  });
});
