import type { EmbeddedPiRunResult } from "../types.js";

export function buildEmbeddedRunPayloads(params: {
  lastAssistant?: any;
  aborted: boolean;
  timedOut: boolean;
  promptError?: Error;
  toolResultFormat: "plain" | "markdown";
  shouldEmitToolResult?: boolean;
  shouldEmitToolOutput?: boolean;
}): EmbeddedPiRunResult["payloads"] {
  // 这里实现构建嵌入式运行结果的逻辑
  // 由于这是一个复杂的实现，暂时返回一个模拟的结果
  const { lastAssistant, aborted, timedOut, promptError } = params;
  
  if (aborted) {
    return [{
      text: "Operation aborted.",
      isError: true,
    }];
  }
  
  if (timedOut) {
    return [{
      text: "Request timed out.",
      isError: true,
    }];
  }
  
  if (promptError) {
    return [{
      text: `Error: ${promptError.message}`,
      isError: true,
    }];
  }
  
  if (lastAssistant) {
    return [{
      text: lastAssistant.message || "No response from assistant.",
    }];
  }
  
  return [{
    text: "No response from assistant.",
  }];
}
