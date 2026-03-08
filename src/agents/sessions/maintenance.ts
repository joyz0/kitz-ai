import { getChildLogger, type Logger } from '../../logger/logger.js';
import { SessionStorage, SessionData } from './storage.js';

export class SessionMaintenance {
  private logger: Logger;
  private maintenanceInterval: NodeJS.Timeout | null = null;

  constructor(
    private storage: SessionStorage,
    private maintenanceIntervalMs: number = 600000,
  ) {
    this.logger = getChildLogger({ name: 'session-maintenance' });
  }

  /**
   * 启动维护任务
   */
  public start(): void {
    this.maintenanceInterval = setInterval(() => {
      this.performMaintenance();
    }, this.maintenanceIntervalMs);

    this.logger.info('Session maintenance started');
  }

  /**
   * 停止维护任务
   */
  public stop(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }

    this.logger.info('Session maintenance stopped');
  }

  /**
   * 执行维护任务
   */
  public performMaintenance(): void {
    this.logger.debug('Performing session maintenance');

    try {
      // 清理过期会话
      const expiredCount = this.storage.cleanupExpired();

      // 清理闲置会话（30分钟）
      const idleCount = this.storage.cleanupIdle(30 * 60 * 1000);

      // 压缩会话（如果需要）
      this.compactSessions();

      this.logger.info(
        `Maintenance completed: ${expiredCount} expired, ${idleCount} idle sessions cleaned up`,
      );
    } catch (error) {
      this.logger.error('Error performing session maintenance', error);
    }
  }

  /**
   * 压缩会话
   */
  private compactSessions(): void {
    const sessions = this.storage.getAll();

    sessions.forEach((session) => {
      try {
        const compactedSession = this.compactSession(session);
        if (compactedSession) {
          this.storage.store(compactedSession);
        }
      } catch (error) {
        this.logger.error(`Error compacting session ${session.key.id}`, error);
      }
    });
  }

  /**
   * 压缩单个会话
   */
  private compactSession(session: SessionData): SessionData | null {
    // 只处理消息数量超过100的会话
    if (session.messages.length <= 100) {
      return null;
    }

    // 保留最近的50条消息
    const compactedMessages = session.messages.slice(-50);

    return {
      ...session,
      messages: compactedMessages,
      metadata: {
        ...session.metadata,
        compacted: true,
        originalMessageCount: session.messages.length,
        compactedAt: Date.now(),
      },
    };
  }

  /**
   * 获取会话统计信息
   */
  public getStats(): {
    totalSessions: number;
    maintenanceIntervalMs: number;
  } {
    return {
      totalSessions: this.storage.getCount(),
      maintenanceIntervalMs: this.maintenanceIntervalMs,
    };
  }

  /**
   * 手动触发维护
   */
  public triggerMaintenance(): void {
    this.logger.info('Manual maintenance triggered');
    this.performMaintenance();
  }
}
