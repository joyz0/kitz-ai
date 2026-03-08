import { getChildLogger, type Logger } from '../../logger/logger.js';

export interface SessionKey {
  id: string;
  userId: string;
  channel: string;
  createdAt: number;
  expiresAt?: number;
}

export class SessionKeyManager {
  private logger: Logger;

  constructor() {
    this.logger = getChildLogger({ name: 'session-key-manager' });
  }

  /**
   * 生成会话键
   */
  public generate(userId: string, channel: string, ttl?: number): SessionKey {
    const id = this.generateId();
    const createdAt = Date.now();
    const expiresAt = ttl ? createdAt + ttl : undefined;

    return {
      id,
      userId,
      channel,
      createdAt,
      expiresAt,
    };
  }

  /**
   * 验证会话键
   */
  public validate(key: SessionKey): boolean {
    if (!key.id || !key.userId || !key.channel || !key.createdAt) {
      return false;
    }

    if (key.expiresAt && key.expiresAt < Date.now()) {
      return false;
    }

    return true;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * 检查会话是否过期
   */
  public isExpired(key: SessionKey): boolean {
    return key.expiresAt !== undefined && key.expiresAt < Date.now();
  }

  /**
   * 延长会话过期时间
   */
  public extend(key: SessionKey, ttl: number): SessionKey {
    return {
      ...key,
      expiresAt: Date.now() + ttl,
    };
  }

  /**
   * 序列化会话键
   */
  public serialize(key: SessionKey): string {
    return JSON.stringify(key);
  }

  /**
   * 反序列化会话键
   */
  public deserialize(data: string): SessionKey {
    try {
      return JSON.parse(data);
    } catch (error) {
      this.logger.error('Error deserializing session key', error);
      throw new Error('Invalid session key');
    }
  }
}
