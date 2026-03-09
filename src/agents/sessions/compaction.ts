import { getChildLogger, type Logger } from '../../logger/logger.js';
import type { SessionData } from './storage.js';

export class SessionCompaction {
  private logger: Logger;

  constructor() {
    this.logger = getChildLogger({ name: 'session-compaction' });
  }

  /**
   * 压缩会话
   */
  public compact(
    session: SessionData,
    options: {
      maxMessages?: number;
      preserveSystemMessages?: boolean;
    } = {},
  ): SessionData {
    const { maxMessages = 50, preserveSystemMessages = true } = options;

    try {
      let messages = [...session.messages];

      // 如果需要保留系统消息，先分离出来
      let systemMessages: typeof messages = [];
      if (preserveSystemMessages) {
        systemMessages = messages.filter((msg) => msg.role === 'system');
        messages = messages.filter((msg) => msg.role !== 'system');
      }

      // 检查是否需要压缩
      const needsCompaction = messages.length > maxMessages;

      // 限制消息数量
      if (needsCompaction) {
        messages = messages.slice(-maxMessages);
      }

      // 重新组合消息
      const compactedMessages = [...systemMessages, ...messages];

      // 如果不需要压缩，直接返回原始会话
      if (!needsCompaction) {
        return session;
      }

      return {
        ...session,
        messages: compactedMessages,
        metadata: {
          ...session.metadata,
          compacted: true,
          originalMessageCount: session.messages.length,
          compactedMessageCount: compactedMessages.length,
          compactedAt: Date.now(),
        },
      };
    } catch (error) {
      this.logger.error('Error compacting session', error);
      return session;
    }
  }

  /**
   * 智能压缩会话
   */
  public smartCompact(session: SessionData): SessionData {
    // 根据会话大小和时间跨度进行智能压缩
    const now = Date.now();
    const sessionAge = now - session.key.createdAt;
    const messageCount = session.messages.length;

    let maxMessages = 50;

    // 对于较老的会话，保留更少的消息
    if (sessionAge > 7 * 24 * 60 * 60 * 1000) {
      // 7天以上
      maxMessages = 20;
    } else if (sessionAge > 24 * 60 * 60 * 1000) {
      // 1天以上
      maxMessages = 30;
    }

    // 对于消息特别多的会话，进一步减少保留数量
    if (messageCount > 500) {
      maxMessages = Math.max(10, maxMessages / 2);
    }

    return this.compact(session, { maxMessages });
  }

  /**
   * 计算会话大小
   */
  public calculateSize(session: SessionData): number {
    try {
      const sessionString = JSON.stringify(session);
      return Buffer.byteLength(sessionString, 'utf8');
    } catch (error) {
      this.logger.error('Error calculating session size', error);
      return 0;
    }
  }

  /**
   * 检查会话是否需要压缩
   */
  public needsCompaction(
    session: SessionData,
    maxSizeBytes: number = 1024 * 1024,
  ): boolean {
    const size = this.calculateSize(session);
    return size > maxSizeBytes || session.messages.length > 100;
  }

  /**
   * 批量压缩会话
   */
  public compactBatch(sessions: SessionData[]): SessionData[] {
    return sessions.map((session) => {
      if (this.needsCompaction(session)) {
        return this.smartCompact(session);
      }
      return session;
    });
  }
}
