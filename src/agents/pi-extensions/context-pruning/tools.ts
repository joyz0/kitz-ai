import type { Message } from "./pruner.js";

export function estimateMessageTokens(message: string): number {
  // 简单的令牌估算：每个单词大约1.3个令牌
  const words = message.split(/\s+/).filter(word => word.length > 0);
  return Math.floor(words.length * 1.3);
}

export function addTokenEstimates(messages: Array<{ content: string; role?: string }>): Message[] {
  return messages.map((msg, index) => ({
    id: `msg-${index}`,
    role: msg.role || "user",
    content: msg.content,
    tokens: estimateMessageTokens(msg.content),
    timestamp: Date.now() - (messages.length - index) * 1000,
  }));
}

export function sortMessagesByTimestamp(messages: Message[]): Message[] {
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}
