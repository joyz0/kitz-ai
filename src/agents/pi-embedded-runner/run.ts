import type { RunEmbeddedPiAgentParams } from "./run/params.js";
import type { EmbeddedPiRunResult } from "./types.js";
import { runEmbeddedAttempt } from "./run/attempt.js";
import { buildEmbeddedRunPayloads } from "./run/payloads.js";
import { log } from "./logger.js";

export async function runEmbeddedPiAgent(
  params: RunEmbeddedPiAgentParams,
): Promise<EmbeddedPiRunResult> {
  const started = Date.now();
  log.info(`Starting embedded Pi agent run for session ${params.sessionId}`);
  
  try {
    const attempt = await runEmbeddedAttempt(params);
    
    const payloads = buildEmbeddedRunPayloads({
      lastAssistant: attempt.lastAssistant,
      aborted: attempt.aborted,
      timedOut: attempt.timedOut,
      promptError: attempt.promptError,
      toolResultFormat: params.toolResultFormat || "markdown",
      shouldEmitToolResult: params.shouldEmitToolResult,
      shouldEmitToolOutput: params.shouldEmitToolOutput,
    });
    
    const durationMs = Date.now() - started;
    
    return {
      payloads,
      meta: {
        durationMs,
        agentMeta: {
          sessionId: params.sessionId,
          provider: params.provider,
          model: params.modelId,
          usage: attempt.attemptUsage,
        },
        stopReason: attempt.lastAssistant?.stopReason || "completed",
      },
    };
  } catch (error) {
    log.error(`Error running embedded Pi agent: ${error}`);
    
    const durationMs = Date.now() - started;
    
    return {
      payloads: [{
        text: `Error: ${error.message}`,
        isError: true,
      }],
      meta: {
        durationMs,
        agentMeta: {
          sessionId: params.sessionId,
          provider: params.provider,
          model: params.modelId,
        },
        error: {
          kind: "retry_limit",
          message: error.message,
        },
      },
    };
  }
}
