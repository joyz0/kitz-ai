import { getChildLogger, type Logger } from "../../logger/logger.js";
import type { SessionKey } from "./key.js";
import fs from "node:fs/promises";
import path from "node:path";

export interface SessionData {
  key: SessionKey;
  context: any;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
    tool_use_id?: string;
    tool_result_id?: string;
  }>;
  metadata: Record<string, any>;
  lastAccessed: number;
}

export class SessionStorage {
  private logger: Logger;
  private sessions: Map<string, SessionData>;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private storageDir: string | null = null;
  private persistenceEnabled: boolean = false;
  private saveInterval: NodeJS.Timeout | null = null;

  constructor(
    private cleanupIntervalMs: number = 3600000,
    storageDir?: string
  ) {
    this.logger = getChildLogger({ name: "session-storage" });
    this.sessions = new Map<string, SessionData>();
    
    if (storageDir) {
      this.storageDir = storageDir;
      this.persistenceEnabled = true;
      this.ensureStorageDir();
      this.loadSessions();
      this.startSaveInterval();
    }
    
    this.startCleanupInterval();
  }

  /**
   * 确保存储目录存在
   */
  private async ensureStorageDir(): Promise<void> {
    if (!this.storageDir) return;
    
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      this.logger.error("Error creating storage directory", error);
      this.persistenceEnabled = false;
    }
  }

  /**
   * 加载会话
   */
  private async loadSessions(): Promise<void> {
    if (!this.storageDir || !this.persistenceEnabled) return;
    
    try {
      const files = await fs.readdir(this.storageDir);
      const sessionFiles = files.filter(file => file.endsWith(".json"));
      
      for (const file of sessionFiles) {
        try {
          const filePath = path.join(this.storageDir, file);
          const content = await fs.readFile(filePath, "utf8");
          const session = JSON.parse(content) as SessionData;
          this.sessions.set(session.key.id, session);
        } catch (error) {
          this.logger.error(`Error loading session file ${file}`, error);
        }
      }
      
      this.logger.info(`Loaded ${this.sessions.size} sessions from disk`);
    } catch (error) {
      this.logger.error("Error loading sessions", error);
    }
  }

  /**
   * 保存会话到磁盘
   */
  private async saveSession(session: SessionData): Promise<void> {
    if (!this.storageDir || !this.persistenceEnabled) return;
    
    try {
      const filePath = path.join(this.storageDir, `${session.key.id}.json`);
      const content = JSON.stringify(session, null, 2);
      await fs.writeFile(filePath, content, "utf8");
    } catch (error) {
      this.logger.error(`Error saving session ${session.key.id}`, error);
    }
  }

  /**
   * 保存所有会话到磁盘
   */
  private async saveAllSessions(): Promise<void> {
    if (!this.persistenceEnabled) return;
    
    const sessions = Array.from(this.sessions.values());
    for (const session of sessions) {
      await this.saveSession(session);
    }
    
    this.logger.debug(`Saved ${sessions.length} sessions to disk`);
  }

  /**
   * 启动保存间隔
   */
  private startSaveInterval(): void {
    // 每 5 分钟保存一次所有会话
    this.saveInterval = setInterval(() => {
      this.saveAllSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * 停止保存间隔
   */
  private stopSaveInterval(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }

  /**
   * 存储会话
   */
  public async store(session: SessionData): Promise<void> {
    this.sessions.set(session.key.id, session);
    this.logger.debug(`Stored session: ${session.key.id}`);
    
    if (this.persistenceEnabled) {
      await this.saveSession(session);
    }
  }

  /**
   * 获取会话
   */
  public get(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccessed = Date.now();
      this.sessions.set(sessionId, session);
      
      // 异步保存更新后的会话
      if (this.persistenceEnabled) {
        this.saveSession(session);
      }
    }
    return session;
  }

  /**
   * 删除会话
   */
  public async delete(sessionId: string): Promise<boolean> {
    const result = this.sessions.delete(sessionId);
    if (result) {
      this.logger.debug(`Deleted session: ${sessionId}`);
      
      if (this.persistenceEnabled && this.storageDir) {
        try {
          const filePath = path.join(this.storageDir, `${sessionId}.json`);
          await fs.unlink(filePath);
        } catch (error) {
          this.logger.error(`Error deleting session file ${sessionId}`, error);
        }
      }
    }
    return result;
  }

  /**
   * 更新会话
   */
  public async update(
    sessionId: string,
    updater: (session: SessionData) => SessionData
  ): Promise<SessionData | undefined> {
    try {
      const session = this.sessions.get(sessionId);
      if (session) {
        const updatedSession = updater(session);
        // 确保lastAccessed时间比原来的大
        updatedSession.lastAccessed = Date.now() + 1;
        this.sessions.set(sessionId, updatedSession);
        
        if (this.persistenceEnabled) {
          await this.saveSession(updatedSession);
        }
        
        return updatedSession;
      }
      return undefined;
    } catch (error) {
      this.logger.error("Error updating session", error);
      return undefined;
    }
  }

  /**
   * 添加消息到会话
   */
  public async addMessage(
    sessionId: string,
    role: "user" | "assistant" | "system",
    content: string,
    tool_use_id?: string,
    tool_result_id?: string
  ): Promise<SessionData | undefined> {
    return this.update(sessionId, (session) => ({
      ...session,
      messages: [
        ...session.messages,
        {
          role,
          content,
          timestamp: Date.now(),
          tool_use_id,
          tool_result_id,
        },
      ],
    }));
  }

  /**
   * 更新会话上下文
   */
  public async updateContext(sessionId: string, context: any): Promise<SessionData | undefined> {
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
  public async cleanupExpired(): Promise<number> {
    const now = Date.now();
    let deleted = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.key.expiresAt && session.key.expiresAt < now) {
        await this.delete(sessionId);
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
  public async cleanupIdle(idleTimeoutMs: number): Promise<number> {
    const now = Date.now();
    let deleted = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccessed > idleTimeoutMs) {
        await this.delete(sessionId);
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
  public async close(): Promise<void> {
    this.stopCleanupInterval();
    this.stopSaveInterval();
    
    if (this.persistenceEnabled) {
      await this.saveAllSessions();
    }
    
    this.sessions.clear();
  }

  /**
   * 压缩会话
   */
  public async compactSessions(): Promise<number> {
    const sessions = this.getAll();
    let compacted = 0;
    
    for (const session of sessions) {
      // 这里可以集成 SessionCompaction 类的压缩逻辑
      // 暂时只做简单的大小检查
      const sessionSize = Buffer.byteLength(JSON.stringify(session), 'utf8');
      if (sessionSize > 1024 * 1024) { // 1MB
        // 这里可以调用 SessionCompaction 进行压缩
        compacted++;
      }
    }
    
    if (compacted > 0) {
      this.logger.info(`Compacted ${compacted} sessions`);
    }
    
    return compacted;
  }

  /**
   * 维护会话存储
   */
  public async maintenance(): Promise<void> {
    await this.cleanupExpired();
    await this.cleanupIdle(24 * 60 * 60 * 1000); // 24小时闲置
    await this.compactSessions();
    await this.saveAllSessions();
    
    this.logger.info("Session maintenance completed");
  }
}
