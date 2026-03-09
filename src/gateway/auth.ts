import { getChildLogger } from '../logger/logger.js';
import  type { GatewayMessage } from './protocol.js';

export class AuthManager {
  private logger = getChildLogger({ name: 'gateway-auth' });
  private validTokens: Set<string>;

  constructor() {
    this.validTokens = new Set<string>();
    // 初始化默认令牌（实际应用中应该从配置或数据库加载）
    this.validTokens.add('default-token');
  }

  /**
   * 验证消息的认证信息
   */
  public async authenticate(message: GatewayMessage): Promise<boolean> {
    try {
      const token = message.payload?.token;

      if (!token) {
        this.logger.warn('No token provided');
        return false;
      }

      if (!this.validTokens.has(token)) {
        this.logger.warn('Invalid token provided');
        return false;
      }

      this.logger.debug('Authentication successful');
      return true;
    } catch (error) {
      this.logger.error('Error during authentication', error);
      return false;
    }
  }

  /**
   * 添加有效的认证令牌
   */
  public addToken(token: string): void {
    this.validTokens.add(token);
    this.logger.info(`Added new token: ${token}`);
  }

  /**
   * 移除认证令牌
   */
  public removeToken(token: string): void {
    this.validTokens.delete(token);
    this.logger.info(`Removed token: ${token}`);
  }

  /**
   * 检查令牌是否有效
   */
  public isValidToken(token: string): boolean {
    try {
      return this.validTokens.has(token);
    } catch (error) {
      this.logger.error('Error checking token validity', error);
      return false;
    }
  }
}
