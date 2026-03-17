import type { OpenClawConfig } from "../../config/config.js";
import type { PluginContext, PluginExtension } from "../../plugins/types.js";
import { createContextPruningRuntime } from "./runtime.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("context-pruning-extension");

export class ContextPruningExtension implements PluginExtension {
  name = "context-pruning";
  private runtime: ReturnType<typeof createContextPruningRuntime>;
  
  constructor(config: OpenClawConfig) {
    this.runtime = createContextPruningRuntime(config);
  }
  
  async initialize(ctx: PluginContext): Promise<void> {
    log.info("Initializing context pruning extension");
  }
  
  async shutdown(ctx: PluginContext): Promise<void> {
    log.info("Shutting down context pruning extension");
  }
  
  public getRuntime() {
    return this.runtime;
  }
}

export function createContextPruningExtension(config: OpenClawConfig): ContextPruningExtension {
  return new ContextPruningExtension(config);
}
