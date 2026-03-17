import type { ContextPruningSettings } from "./settings.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("context-pruning");

export type Message = {
  id: string;
  role: string;
  content: string;
  tokens: number;
  timestamp: number;
  important?: boolean;
};

export function isImportantMessage(
  message: Message,
  patterns: string[]
): boolean {
  if (message.important) {
    return true;
  }
  
  const content = message.content.toLowerCase();
  return patterns.some(pattern => content.includes(pattern.toLowerCase()));
}

export function calculateTotalTokens(messages: Message[]): number {
  return messages.reduce((total, message) => total + message.tokens, 0);
}

export function pruneContext(params: {
  messages: Message[];
  settings: ContextPruningSettings;
  currentTokens: number;
}): { messages: Message[]; prunedCount: number; prunedTokens: number } {
  const { messages, settings, currentTokens } = params;
  
  if (!settings.enabled || messages.length < settings.minMessages || currentTokens <= settings.maxTokens) {
    return { messages, prunedCount: 0, prunedTokens: 0 };
  }
  
  // 计算需要剪枝的令牌数
  const targetTokens = currentTokens * (1 - settings.pruneRatio);
  let prunedTokens = 0;
  let prunedCount = 0;
  
  // 分离消息：保留最近的消息和重要消息
  const recentMessages = messages.slice(-settings.keepRecentMessages);
  const olderMessages = messages.slice(0, -settings.keepRecentMessages);
  
  // 标记重要消息
  const importantMessages = olderMessages.filter(msg => 
    isImportantMessage(msg, settings.importantMessagePatterns)
  );
  
  // 计算剩余可剪枝的消息
  const prunableMessages = olderMessages.filter(msg => 
    !isImportantMessage(msg, settings.importantMessagePatterns)
  );
  
  // 按时间顺序排序（最早的优先剪枝）
  prunableMessages.sort((a, b) => a.timestamp - b.timestamp);
  
  // 剪枝消息直到达到目标令牌数
  let remainingTokens = currentTokens;
  const prunedMessages: Message[] = [];
  
  for (const msg of prunableMessages) {
    if (remainingTokens <= targetTokens) {
      break;
    }
    prunedMessages.push(msg);
    remainingTokens -= msg.tokens;
    prunedTokens += msg.tokens;
    prunedCount += 1;
  }
  
  // 构建新的消息列表
  const newMessages = [...importantMessages, ...recentMessages];
  
  log.info(
    `Pruned ${prunedCount} messages (${prunedTokens} tokens) from context. ` +
    `New message count: ${newMessages.length}, new token count: ${remainingTokens}`
  );
  
  return {
    messages: newMessages,
    prunedCount,
    prunedTokens,
  };
}
