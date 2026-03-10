import { getChildLogger, type Logger } from '../../logger/logger.js';
import type { SessionData } from './storage.js';
import { retryAsync } from '../../infra/retry.js';

export const BASE_CHUNK_RATIO = 0.4;
export const MIN_CHUNK_RATIO = 0.15;
export const SAFETY_MARGIN = 1.2; // 20% buffer for estimateTokens() inaccuracy
const DEFAULT_SUMMARY_FALLBACK = "No prior history.";
const DEFAULT_PARTS = 2;
const MERGE_SUMMARIES_INSTRUCTIONS =
  "Merge these partial summaries into a single cohesive summary. Preserve decisions,"
  + " TODOs, open questions, and any constraints.";
const IDENTIFIER_PRESERVATION_INSTRUCTIONS =
  "Preserve all opaque identifiers exactly as written (no shortening or reconstruction), "
  + "including UUIDs, hashes, IDs, tokens, API keys, hostnames, IPs, ports, URLs, and file names.";

export type CompactionSummarizationInstructions = {
  identifierPolicy?: string;
  identifierInstructions?: string;
};

export type AgentMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tool_use_id?: string;
  tool_result_id?: string;
};

export class SessionCompaction {
  private logger: Logger;

  constructor() {
    this.logger = getChildLogger({ name: 'session-compaction' });
  }

  /**
   * 估算消息的令牌数量
   */
  private estimateTokens(message: AgentMessage): number {
    // 简单的令牌估算：每个字符大约 1/4 个令牌
    const content = message.content || '';
    return Math.ceil(content.length / 4);
  }

  /**
   * 估算消息列表的令牌数量
   */
  public estimateMessagesTokens(messages: AgentMessage[]): number {
    return messages.reduce((sum, message) => sum + this.estimateTokens(message), 0);
  }

  /**
   * 解析标识符保留指令
   */
  private resolveIdentifierPreservationInstructions(
    instructions?: CompactionSummarizationInstructions,
  ): string | undefined {
    const policy = instructions?.identifierPolicy ?? "strict";
    if (policy === "off") {
      return undefined;
    }
    if (policy === "custom") {
      const custom = instructions?.identifierInstructions?.trim();
      return custom && custom.length > 0 ? custom : IDENTIFIER_PRESERVATION_INSTRUCTIONS;
    }
    return IDENTIFIER_PRESERVATION_INSTRUCTIONS;
  }

  /**
   * 构建压缩摘要指令
   */
  public buildCompactionSummarizationInstructions(
    customInstructions?: string,
    instructions?: CompactionSummarizationInstructions,
  ): string | undefined {
    const custom = customInstructions?.trim();
    const identifierPreservation = this.resolveIdentifierPreservationInstructions(instructions);
    if (!identifierPreservation && !custom) {
      return undefined;
    }
    if (!custom) {
      return identifierPreservation;
    }
    if (!identifierPreservation) {
      return `Additional focus:\n${custom}`;
    }
    return `${identifierPreservation}\n\nAdditional focus:\n${custom}`;
  }

  /**
   * 按令牌份额分割消息
   */
  public splitMessagesByTokenShare(
    messages: AgentMessage[],
    parts = DEFAULT_PARTS,
  ): AgentMessage[][] {
    if (messages.length === 0) {
      return [];
    }
    const normalizedParts = this.normalizeParts(parts, messages.length);
    if (normalizedParts <= 1) {
      return [messages];
    }

    const totalTokens = this.estimateMessagesTokens(messages);
    const targetTokens = totalTokens / normalizedParts;
    const chunks: AgentMessage[][] = [];
    let current: AgentMessage[] = [];
    let currentTokens = 0;

    for (const message of messages) {
      const messageTokens = this.estimateTokens(message);
      if (
        chunks.length < normalizedParts - 1 &&
        current.length > 0 &&
        currentTokens + messageTokens > targetTokens
      ) {
        chunks.push(current);
        current = [];
        currentTokens = 0;
      }

      current.push(message);
      currentTokens += messageTokens;
    }

    if (current.length > 0) {
      chunks.push(current);
    }

    return chunks;
  }

  /**
   * 按最大令牌数分块消息
   */
  public chunkMessagesByMaxTokens(
    messages: AgentMessage[],
    maxTokens: number,
  ): AgentMessage[][] {
    if (messages.length === 0) {
      return [];
    }

    // 应用安全边际以补偿估算不准确
    const effectiveMax = Math.max(1, Math.floor(maxTokens / SAFETY_MARGIN));

    const chunks: AgentMessage[][] = [];
    let currentChunk: AgentMessage[] = [];
    let currentTokens = 0;

    for (const message of messages) {
      const messageTokens = this.estimateTokens(message);
      if (currentChunk.length > 0 && currentTokens + messageTokens > effectiveMax) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentTokens = 0;
      }

      currentChunk.push(message);
      currentTokens += messageTokens;

      if (messageTokens > effectiveMax) {
        // 分割超大消息以避免无界块增长
        chunks.push(currentChunk);
        currentChunk = [];
        currentTokens = 0;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * 计算自适应分块比率
   */
  public computeAdaptiveChunkRatio(messages: AgentMessage[], contextWindow: number): number {
    if (messages.length === 0) {
      return BASE_CHUNK_RATIO;
    }

    const totalTokens = this.estimateMessagesTokens(messages);
    const avgTokens = totalTokens / messages.length;

    // 应用安全边际以补偿估算不准确
    const safeAvgTokens = avgTokens * SAFETY_MARGIN;
    const avgRatio = safeAvgTokens / contextWindow;

    // 如果平均消息大于上下文的 10%，减少分块比率
    if (avgRatio > 0.1) {
      const reduction = Math.min(avgRatio * 2, BASE_CHUNK_RATIO - MIN_CHUNK_RATIO);
      return Math.max(MIN_CHUNK_RATIO, BASE_CHUNK_RATIO - reduction);
    }

    return BASE_CHUNK_RATIO;
  }

  /**
   * 检查单个消息是否太大而无法摘要
   */
  public isOversizedForSummary(msg: AgentMessage, contextWindow: number): boolean {
    const tokens = this.estimateTokens(msg) * SAFETY_MARGIN;
    return tokens > contextWindow * 0.5;
  }

  /**
   * 规范化分块数量
   */
  private normalizeParts(parts: number, messageCount: number): number {
    if (!Number.isFinite(parts) || parts <= 1) {
      return 1;
    }
    return Math.min(Math.max(1, Math.floor(parts)), Math.max(1, messageCount));
  }

  /**
   * 生成摘要
   */
  private async generateSummary(
    messages: AgentMessage[],
    customInstructions?: string,
  ): Promise<string> {
    // 简单的摘要生成实现
    // 实际项目中应该使用 LLM 生成摘要
    if (messages.length === 0) {
      return DEFAULT_SUMMARY_FALLBACK;
    }

    const content = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    const summary = `Summary of ${messages.length} messages: ${content.substring(0, 500)}...`;
    return summary;
  }

  /**
   * 摘要分块
   */
  private async summarizeChunks(params: {
    messages: AgentMessage[];
    maxChunkTokens: number;
    customInstructions?: string;
    summarizationInstructions?: CompactionSummarizationInstructions;
    previousSummary?: string;
  }): Promise<string> {
    if (params.messages.length === 0) {
      return params.previousSummary ?? DEFAULT_SUMMARY_FALLBACK;
    }

    const chunks = this.chunkMessagesByMaxTokens(params.messages, params.maxChunkTokens);
    let summary = params.previousSummary;
    const effectiveInstructions = this.buildCompactionSummarizationInstructions(
      params.customInstructions,
      params.summarizationInstructions,
    );

    for (const chunk of chunks) {
      summary = await retryAsync(
        () => this.generateSummary(chunk),
        {
          attempts: 3,
          minDelayMs: 500,
          maxDelayMs: 5000,
          jitter: 0.2,
          label: "compaction/generateSummary",
          shouldRetry: (err) => !(err instanceof Error && err.name === "AbortError"),
        },
      );
    }

    return summary ?? DEFAULT_SUMMARY_FALLBACK;
  }

  /**
   * 使用回退进行摘要
   */
  public async summarizeWithFallback(params: {
    messages: AgentMessage[];
    maxChunkTokens: number;
    contextWindow: number;
    customInstructions?: string;
    summarizationInstructions?: CompactionSummarizationInstructions;
    previousSummary?: string;
  }): Promise<string> {
    const { messages, contextWindow } = params;

    if (messages.length === 0) {
      return params.previousSummary ?? DEFAULT_SUMMARY_FALLBACK;
    }

    // 首先尝试完整摘要
    try {
      return await this.summarizeChunks(params);
    } catch (fullError) {
      this.logger.warn(
        `Full summarization failed, trying partial: ${fullError instanceof Error ? fullError.message : String(fullError)}`,
      );
    }

    // 回退 1：仅摘要小消息，记录超大消息
    const smallMessages: AgentMessage[] = [];
    const oversizedNotes: string[] = [];

    for (const msg of messages) {
      if (this.isOversizedForSummary(msg, contextWindow)) {
        const role = msg.role;
        const tokens = this.estimateTokens(msg);
        oversizedNotes.push(
          `[Large ${role} (~${Math.round(tokens / 1000)}K tokens) omitted from summary]`,
        );
      } else {
        smallMessages.push(msg);
      }
    }

    if (smallMessages.length > 0) {
      try {
        const partialSummary = await this.summarizeChunks({
          ...params,
          messages: smallMessages,
        });
        const notes = oversizedNotes.length > 0 ? `\n\n${oversizedNotes.join("\n")}` : "";
        return partialSummary + notes;
      } catch (partialError) {
        this.logger.warn(
          `Partial summarization also failed: ${partialError instanceof Error ? partialError.message : String(partialError)}`,
        );
      }
    }

    // 最终回退：仅记录存在的内容
    return (
      `Context contained ${messages.length} messages (${oversizedNotes.length} oversized). `
      + `Summary unavailable due to size limits.`
    );
  }

  /**
   * 分阶段摘要
   */
  public async summarizeInStages(params: {
    messages: AgentMessage[];
    maxChunkTokens: number;
    contextWindow: number;
    customInstructions?: string;
    summarizationInstructions?: CompactionSummarizationInstructions;
    previousSummary?: string;
    parts?: number;
    minMessagesForSplit?: number;
  }): Promise<string> {
    const { messages } = params;
    if (messages.length === 0) {
      return params.previousSummary ?? DEFAULT_SUMMARY_FALLBACK;
    }

    const minMessagesForSplit = Math.max(2, params.minMessagesForSplit ?? 4);
    const parts = this.normalizeParts(params.parts ?? DEFAULT_PARTS, messages.length);
    const totalTokens = this.estimateMessagesTokens(messages);

    if (parts <= 1 || messages.length < minMessagesForSplit || totalTokens <= params.maxChunkTokens) {
      return this.summarizeWithFallback(params);
    }

    const splits = this.splitMessagesByTokenShare(messages, parts).filter((chunk) => chunk.length > 0);
    if (splits.length <= 1) {
      return this.summarizeWithFallback(params);
    }

    const partialSummaries: string[] = [];
    for (const chunk of splits) {
      partialSummaries.push(
        await this.summarizeWithFallback({
          ...params,
          messages: chunk,
          previousSummary: undefined,
        }),
      );
    }

    if (partialSummaries.length === 1) {
      return partialSummaries[0];
    }

    const summaryMessages: AgentMessage[] = partialSummaries.map((summary) => ({
      role: "user",
      content: summary,
      timestamp: Date.now(),
    }));

    const custom = params.customInstructions?.trim();
    const mergeInstructions = custom
      ? `${MERGE_SUMMARIES_INSTRUCTIONS}\n\n${custom}`
      : MERGE_SUMMARIES_INSTRUCTIONS;

    return this.summarizeWithFallback({
      ...params,
      messages: summaryMessages,
      customInstructions: mergeInstructions,
    });
  }

  /**
   * 为上下文份额修剪历史
   */
  public pruneHistoryForContextShare(params: {
    messages: AgentMessage[];
    maxContextTokens: number;
    maxHistoryShare?: number;
    parts?: number;
  }): {
    messages: AgentMessage[];
    droppedMessagesList: AgentMessage[];
    droppedChunks: number;
    droppedMessages: number;
    droppedTokens: number;
    keptTokens: number;
    budgetTokens: number;
  } {
    const maxHistoryShare = params.maxHistoryShare ?? 0.5;
    const budgetTokens = Math.max(1, Math.floor(params.maxContextTokens * maxHistoryShare));
    let keptMessages = params.messages;
    const allDroppedMessages: AgentMessage[] = [];
    let droppedChunks = 0;
    let droppedMessages = 0;
    let droppedTokens = 0;

    const parts = this.normalizeParts(params.parts ?? DEFAULT_PARTS, keptMessages.length);

    while (keptMessages.length > 0 && this.estimateMessagesTokens(keptMessages) > budgetTokens) {
      const chunks = this.splitMessagesByTokenShare(keptMessages, parts);
      if (chunks.length <= 1) {
        break;
      }
      const [dropped, ...rest] = chunks;
      const flatRest = rest.flat();

      // 修复工具使用/工具结果配对
      const repairedKept = this.repairToolUseResultPairing(flatRest);

      droppedChunks += 1;
      droppedMessages += dropped.length;
      droppedTokens += this.estimateMessagesTokens(dropped);
      allDroppedMessages.push(...dropped);
      keptMessages = repairedKept;
    }

    return {
      messages: keptMessages,
      droppedMessagesList: allDroppedMessages,
      droppedChunks,
      droppedMessages,
      droppedTokens,
      keptTokens: this.estimateMessagesTokens(keptMessages),
      budgetTokens,
    };
  }

  /**
   * 修复工具使用/工具结果配对
   */
  private repairToolUseResultPairing(messages: AgentMessage[]): AgentMessage[] {
    // 简单的修复实现
    // 实际项目中应该实现更复杂的修复逻辑
    return messages;
  }

  /**
   * 压缩会话
   */
  public async compact(
    session: SessionData,
    options: {
      maxMessages?: number;
      maxTokens?: number;
      contextWindow?: number;
      preserveSystemMessages?: boolean;
      customInstructions?: string;
    } = {},
  ): Promise<SessionData> {
    const { 
      maxMessages = 50, 
      maxTokens = 10000, 
      contextWindow = 4096, 
      preserveSystemMessages = true,
      customInstructions
    } = options;

    try {
      let messages = [...session.messages];

      // 如果需要保留系统消息，先分离出来
      let systemMessages: typeof messages = [];
      if (preserveSystemMessages) {
        systemMessages = messages.filter((msg) => msg.role === 'system');
        messages = messages.filter((msg) => msg.role !== 'system');
      }

      // 检查是否需要压缩
      const messageCount = messages.length;
      const totalTokens = this.estimateMessagesTokens(messages);
      const needsCompaction = messageCount > maxMessages || totalTokens > maxTokens;

      // 如果不需要压缩，直接返回原始会话
      if (!needsCompaction) {
        return session;
      }

      // 基于令牌数量的压缩
      const pruneResult = this.pruneHistoryForContextShare({
        messages,
        maxContextTokens: maxTokens,
        maxHistoryShare: 0.8,
      });

      // 为被丢弃的消息生成摘要
      let summary = "";
      if (pruneResult.droppedMessages > 0) {
        summary = await this.summarizeInStages({
          messages: pruneResult.droppedMessagesList,
          maxChunkTokens: contextWindow * 0.7,
          contextWindow,
          customInstructions,
        });
      }

      // 重新组合消息
      let compactedMessages = [...systemMessages];
      
      // 如果有摘要，添加为系统消息
      if (summary) {
        compactedMessages.push({
          role: 'system',
          content: `Summary of previous conversation:\n${summary}`,
          timestamp: Date.now(),
        });
      }

      // 添加保留的消息
      compactedMessages = [...compactedMessages, ...pruneResult.messages];

      return {
        ...session,
        messages: compactedMessages,
        metadata: {
          ...session.metadata,
          compacted: true,
          originalMessageCount: session.messages.length,
          compactedMessageCount: compactedMessages.length,
          originalTokenCount: totalTokens,
          compactedTokenCount: this.estimateMessagesTokens(compactedMessages),
          droppedMessages: pruneResult.droppedMessages,
          droppedTokens: pruneResult.droppedTokens,
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
  public async smartCompact(session: SessionData): Promise<SessionData> {
    // 根据会话大小和时间跨度进行智能压缩
    const now = Date.now();
    const sessionAge = now - session.key.createdAt;
    const messageCount = session.messages.length;
    const totalTokens = this.estimateMessagesTokens(session.messages);

    let maxMessages = 50;
    let maxTokens = 10000;

    // 对于较老的会话，保留更少的消息和令牌
    if (sessionAge > 7 * 24 * 60 * 60 * 1000) {
      // 7天以上
      maxMessages = 20;
      maxTokens = 5000;
    } else if (sessionAge > 24 * 60 * 60 * 1000) {
      // 1天以上
      maxMessages = 30;
      maxTokens = 7500;
    }

    // 对于消息特别多的会话，进一步减少保留数量
    if (messageCount > 500) {
      maxMessages = Math.max(10, maxMessages / 2);
      maxTokens = Math.max(2500, maxTokens / 2);
    }

    // 对于令牌特别多的会话，进一步减少保留数量
    if (totalTokens > 50000) {
      maxTokens = Math.max(2500, maxTokens / 2);
    }

    return this.compact(session, { maxMessages, maxTokens });
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
    maxMessages: number = 100,
    maxTokens: number = 20000,
  ): boolean {
    const size = this.calculateSize(session);
    const messageCount = session.messages.length;
    const totalTokens = this.estimateMessagesTokens(session.messages);
    
    return size > maxSizeBytes || messageCount > maxMessages || totalTokens > maxTokens;
  }

  /**
   * 批量压缩会话
   */
  public async compactBatch(sessions: SessionData[]): Promise<SessionData[]> {
    const compactedSessions: SessionData[] = [];
    
    for (const session of sessions) {
      if (this.needsCompaction(session)) {
        compactedSessions.push(await this.smartCompact(session));
      } else {
        compactedSessions.push(session);
      }
    }
    
    return compactedSessions;
  }
}
