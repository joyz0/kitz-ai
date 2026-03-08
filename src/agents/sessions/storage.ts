import { getChildLogger, type Logger } from '../../logger/logger.js';
import { SessionKey } from './key.js';

export interface SessionData {
  key: SessionKey;
  context: any;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
  }>;
  metadata: Record<string, any>;
  lastAccessed: number;
}

export class SessionStorage {
  private logger: Logger;
  private sessions: Map<string, SessionData>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private cleanupIntervalMs: number = 3600000) {
    this.logger = getChildLogger({ name: 'session-storage' });
    this.sessions = new Map<string, SessionData>();
    this.startCleanupInterval();
  }

  /**
   * 存储会话
   */
  public store(session: SessionData): void {
    this.sessions.set(session.key.id, session);
    this.logger.debug(`Stored session: ${session.key.id}`);
  }

  /**
   * 获取会话
   */
  public get(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccessed = Date.now();
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  /**
   * 删除会话
   */
  public delete(sessionId: string): boolean {
    const result = this.sessions.delete(sessionId);
    if (result) {
      this.logger.debug(`Deleted session: ${sessionId}`);
    }
    return result;
  }

  /**
   * 更新会话
   */
  public update(
    sessionId: string,
    updater: (session: SessionData) => SessionData,
  ): SessionData | undefined {
    try {
      const session = this.sessions.get(sessionId);
      if (session) {
        const updatedSession = updater(session);
        // 确保lastAccessed时间比原来的大
        updatedSession.lastAccessed = Date.now() + 1;
        this.sessions.set(sessionId, updatedSession);
        return updatedSession;
      }
      return undefined;
    } catch (error) {
      this.logger.error('Error updating session', error);
      return undefined;
    }
  }

  /**
   * 添加消息到会话
   */
  public addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
  ): SessionData | undefined {
    return this.update(sessionId, (session) => ({
      ...session,
      messages: [
        ...session.messages,
        {
          role,
          content,
          timestamp: Date.now(),
        },
      ],
    }));
  }

  /**
   * 更新会话上下文
   */
  public updateContext(
    sessionId: string,
    context: any,
  ): SessionData | undefined {
    return this.update(sessionId, (session) => ({
      ...session,
      context,
    }));
  }

  /**
   * 获取所有会话
   */
  public getAll(): SessionData[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 获取会话数量
   */
  public getCount(): number {
    return this.sessions.size;
  }

  /**
   * 清理过期会话
   */
  public cleanupExpired(): number {
    const now = Date.now();
    let deleted = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.key.expiresAt && session.key.expiresAt < now) {
        this.sessions.delete(sessionId);
        deleted++;
      }
    }

    if (deleted > 0) {
      this.logger.info(`Cleaned up ${deleted} expired sessions`);
    }

    return deleted;
  }

  /**
   * 清理闲置会话
   */
  public cleanupIdle(idleTimeoutMs: number): number {
    const now = Date.now();
    let deleted = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccessed > idleTimeoutMs) {
        this.sessions.delete(sessionId);
        deleted++;
      }
    }

    if (deleted > 0) {
      this.logger.info(`Cleaned up ${deleted} idle sessions`);
    }

    return deleted;
  }

  /**
   * 启动清理间隔
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, this.cleanupIntervalMs);
  }

  /**
   * 停止清理间隔
   */
  public stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 关闭存储
   */
  public close(): void {
    this.stopCleanupInterval();
    this.sessions.clear();
  }
}
