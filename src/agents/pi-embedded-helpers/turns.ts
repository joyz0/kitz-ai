// 参考 openclaw 的 pi-embedded-helpers/turns.ts 实现
// 实现嵌入式助手的对话轮次管理功能

import { getChildLogger } from "../../logger/logger.js";
import type { EmbeddedMessage } from "./types.js";

const log = getChildLogger({ name: "pi-embedded-helpers-turns" });

export function validateTurns(messages: EmbeddedMessage[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!Array.isArray(messages)) {
    return { valid: false, errors: ["Messages must be an array"] };
  }

  if (messages.length === 0) {
    return { valid: true, errors: [] };
  }

  // 检查消息类型
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (!message) {
      errors.push(`Message at index ${i} is null or undefined`);
      continue;
    }

    if (!message.role || !["user", "assistant", "system"].includes(message.role)) {
      errors.push(`Message at index ${i} has invalid role: ${message.role}`);
    }

    if (!message.content || typeof message.content !== "string") {
      errors.push(`Message at index ${i} has invalid content`);
    }

    if (!message.timestamp || typeof message.timestamp !== "number") {
      errors.push(`Message at index ${i} has invalid timestamp`);
    }
  }

  // 检查消息顺序
  for (let i = 1; i < messages.length; i++) {
    const current = messages[i];
    const previous = messages[i - 1];

    if (current.timestamp < previous.timestamp) {
      errors.push(`Message at index ${i} has timestamp older than previous message`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function limitHistoryTurns(params: {
  messages: EmbeddedMessage[];
  maxTurns: number;
  systemPrompt?: string;
}): EmbeddedMessage[] {
  const { messages, maxTurns, systemPrompt } = params;
  
  // 分离系统提示
  const systemMessages = messages.filter(msg => msg.role === "system");
  const nonSystemMessages = messages.filter(msg => msg.role !== "system");
  
  // 限制非系统消息的数量
  const limitedNonSystemMessages = nonSystemMessages.slice(-maxTurns);
  
  // 重新组合消息
  if (systemPrompt && systemMessages.length === 0) {
    return [
      { role: "system", content: systemPrompt, timestamp: 0 },
      ...limitedNonSystemMessages
    ];
  }
  
  return [
    ...systemMessages,
    ...limitedNonSystemMessages
  ];
}

export function sanitizeSessionMessagesImages(messages: EmbeddedMessage[]): EmbeddedMessage[] {
  return messages.map(message => ({
    ...message,
    content: sanitizeMessageContent(message.content)
  }));
}

function sanitizeMessageContent(content: string): string {
  // 移除潜在的恶意内容
  let sanitized = content;
  
  // 移除脚本标签
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, "");
  
  // 移除危险的URL
  sanitized = sanitized.replace(/javascript:[^\s]+/gi, "");
  
  // 移除HTML实体
  sanitized = sanitized.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  
  return sanitized;
}
