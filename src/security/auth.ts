import type { Logger as TsLogger } from 'tslog';

// 定义认证接口
export interface AuthProvider {
  authenticate(credentials: any): Promise<AuthResult>;
  validateToken(token: string): Promise<boolean>;
  generateToken(userId: string): Promise<string>;
  revokeToken(token: string): Promise<void>;
}

// 定义认证结果接口
export interface AuthResult {
  success: boolean;
  token?: string;
  userId?: string;
  error?: string;
}

// 定义认证管理器接口
export interface AuthManager {
  registerProvider(name: string, provider: AuthProvider): void;
  getProvider(name: string): AuthProvider | undefined;
  authenticate(providerName: string, credentials: any): Promise<AuthResult>;
  validateToken(providerName: string, token: string): Promise<boolean>;
  generateToken(providerName: string, userId: string): Promise<string>;
  revokeToken(providerName: string, token: string): Promise<void>;
}

// 认证管理器实现
export class DefaultAuthManager implements AuthManager {
  private providers: Map<string, AuthProvider> = new Map();
  private logger: TsLogger<any>;

  constructor(logger: TsLogger<any>) {
    this.logger = logger;
  }

  // 注册认证提供商
  registerProvider(name: string, provider: AuthProvider): void {
    this.providers.set(name, provider);
    this.logger.info(`Registered auth provider: ${name}`);
  }

  // 获取认证提供商
  getProvider(name: string): AuthProvider | undefined {
    return this.providers.get(name);
  }

  // 认证
  async authenticate(
    providerName: string,
    credentials: any,
  ): Promise<AuthResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      this.logger.error(`Auth provider not found: ${providerName}`);
      return {
        success: false,
        error: `Auth provider not found: ${providerName}`,
      };
    }

    try {
      const result = await provider.authenticate(credentials);
      this.logger.debug(
        `Authentication ${result.success ? 'succeeded' : 'failed'} for provider: ${providerName}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Authentication error for provider ${providerName}:`,
        error,
      );
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // 验证令牌
  async validateToken(providerName: string, token: string): Promise<boolean> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      this.logger.error(`Auth provider not found: ${providerName}`);
      return false;
    }

    try {
      const valid = await provider.validateToken(token);
      this.logger.debug(
        `Token validation ${valid ? 'succeeded' : 'failed'} for provider: ${providerName}`,
      );
      return valid;
    } catch (error) {
      this.logger.error(
        `Token validation error for provider ${providerName}:`,
        error,
      );
      return false;
    }
  }

  // 生成令牌
  async generateToken(providerName: string, userId: string): Promise<string> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      this.logger.error(`Auth provider not found: ${providerName}`);
      throw new Error(`Auth provider not found: ${providerName}`);
    }

    try {
      const token = await provider.generateToken(userId);
      this.logger.debug(
        `Generated token for user ${userId} with provider: ${providerName}`,
      );
      return token;
    } catch (error) {
      this.logger.error(
        `Token generation error for provider ${providerName}:`,
        error,
      );
      throw error;
    }
  }

  // 撤销令牌
  async revokeToken(providerName: string, token: string): Promise<void> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      this.logger.error(`Auth provider not found: ${providerName}`);
      throw new Error(`Auth provider not found: ${providerName}`);
    }

    try {
      await provider.revokeToken(token);
      this.logger.debug(`Revoked token for provider: ${providerName}`);
    } catch (error) {
      this.logger.error(
        `Token revocation error for provider ${providerName}:`,
        error,
      );
      throw error;
    }
  }
}

// 简单的内存认证提供商（用于测试）
export class MemoryAuthProvider implements AuthProvider {
  private tokens: Set<string> = new Set();
  private logger: TsLogger<any>;

  constructor(logger: TsLogger<any>) {
    this.logger = logger;
  }

  // 认证
  async authenticate(credentials: {
    username: string;
    password: string;
  }): Promise<AuthResult> {
    // 简单的认证逻辑（仅用于测试）
    if (
      credentials.username === 'admin' &&
      credentials.password === 'password'
    ) {
      const token = this.generateRandomToken();
      this.tokens.add(token);
      return {
        success: true,
        token,
        userId: credentials.username,
      };
    }
    return {
      success: false,
      error: 'Invalid credentials',
    };
  }

  // 验证令牌
  async validateToken(token: string): Promise<boolean> {
    return this.tokens.has(token);
  }

  // 生成令牌
  async generateToken(userId: string): Promise<string> {
    const token = this.generateRandomToken();
    this.tokens.add(token);
    return token;
  }

  // 撤销令牌
  async revokeToken(token: string): Promise<void> {
    this.tokens.delete(token);
  }

  // 生成随机令牌
  private generateRandomToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}

// 创建认证管理器实例
export function createAuthManager(logger: TsLogger<any>): AuthManager {
  const manager = new DefaultAuthManager(logger);

  // 注册默认的内存认证提供商（用于测试）
  manager.registerProvider('memory', new MemoryAuthProvider(logger));

  return manager;
}
