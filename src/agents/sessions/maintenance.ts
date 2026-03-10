import { getChildLogger, type Logger } from "../../logger/logger.js";
import type { SessionStorage, SessionData } from "./storage.js";
import { SessionCompaction } from "./compaction.js";

export class SessionMaintenance {
  private logger: Logger;
  private maintenanceInterval: NodeJS.Timeout | null = null;
  private compaction: SessionCompaction;

  constructor(private storage: SessionStorage, private maintenanceIntervalMs: number = 600000) {
    this.logger = getChildLogger({ name: "session-maintenance" });
    this.compaction = new SessionCompaction();
  }

  /**
   * 启动维护任务
   */
  public start(): void {
    this.maintenanceInterval = setInterval(() => {
      this.performMaintenance();
    }, this.maintenanceIntervalMs);

    this.logger.info("Session maintenance started");
  }

  /**
   * 停止维护任务
   */
  public stop(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }

    this.logger.info("Session maintenance stopped");
  }

  /**
   * 执行维护任务
   */
  public async performMaintenance(): Promise<void> {
    this.logger.debug("Performing session maintenance");

    try {
      // 清理过期会话
      const expiredCount = await this.storage.cleanupExpired();

      // 清理闲置会话（30分钟）
      const idleCount = await this.storage.cleanupIdle(30 * 60 * 1000);

      // 压缩会话（如果需要）
      const compactedCount = await this.compactSessions();

      // 执行存储维护
      await this.storage.maintenance();

      this.logger.info(
        `Maintenance completed: ${expiredCount} expired, ${idleCount} idle sessions cleaned up, ${compactedCount} sessions compacted`
      );
    } catch (error) {
      this.logger.error("Error performing session maintenance", error);
    }
  }

  /**
   * 压缩会话
   */
  private async compactSessions(): Promise<number> {
    const sessions = this.storage.getAll();
    let compactedCount = 0;

    for (const session of sessions) {
      try {
        if (this.compaction.needsCompaction(session)) {
          const compactedSession = await this.compaction.smartCompact(session);
          await this.storage.store(compactedSession);
          compactedCount++;
        }
      } catch (error) {
        this.logger.error(`Error compacting session ${session.key.id}`, error);
      }
    }

    return compactedCount;
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
  public async triggerMaintenance(): Promise<void> {
    this.logger.info("Manual maintenance triggered");
    await this.performMaintenance();
  }

  /**
   * 生成维护报告
   */
  public generateMaintenanceReport(): {
    total: number;
    active: number;
    expired: number;
    large: number;
    messageCount: number;
    averageSize: number;
    averageTokens: number;
    needsMaintenance: number;
  } {
    const sessions = this.storage.getAll();
    const now = Date.now();
    const reports = {
      total: sessions.length,
      active: 0,
      expired: 0,
      large: 0,
      messageCount: 0,
      averageSize: 0,
      averageTokens: 0,
      needsMaintenance: 0,
    };

    let totalSize = 0;
    let totalTokens = 0;

    for (const session of sessions) {
      if (session.key.expiresAt && session.key.expiresAt < now) {
        reports.expired++;
      } else {
        reports.active++;
      }

      const size = Buffer.byteLength(JSON.stringify(session), 'utf8');
      totalSize += size;

      if (size > 1024 * 1024) { // 1MB
        reports.large++;
      }

      const tokenCount = this.compaction.estimateMessagesTokens(session.messages);
      totalTokens += tokenCount;
      reports.messageCount += session.messages.length;

      if (this.compaction.needsCompaction(session)) {
        reports.needsMaintenance++;
      }
    }

    reports.averageSize = reports.total > 0 ? totalSize / reports.total : 0;
    reports.averageTokens = reports.total > 0 ? totalTokens / reports.total : 0;

    return reports;
  }

  /**
   * 执行定期维护
   */
  public async runScheduledMaintenance(dryRun: boolean = false): Promise<{
    cleaned: number;
    compacted: number;
    reports: ReturnType<SessionMaintenance['generateMaintenanceReport']>;
  }> {
    this.logger.info('Starting scheduled session maintenance');
    
    // 生成维护前报告
    const preReports = this.generateMaintenanceReport();
    this.logger.info('Pre-maintenance report:', preReports);
    
    // 执行维护
    await this.performMaintenance();
    
    // 生成维护后报告
    const postReports = this.generateMaintenanceReport();
    this.logger.info('Post-maintenance report:', postReports);
    
    const cleaned = preReports.expired + (preReports.total - postReports.total);
    const compacted = preReports.needsMaintenance - postReports.needsMaintenance;
    
    this.logger.info(`Scheduled maintenance completed: cleaned=${cleaned}, compacted=${compacted}`);
    
    return {
      cleaned,
      compacted,
      reports: postReports,
    };
  }
}
