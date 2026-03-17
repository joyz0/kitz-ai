/**
 * Opt-in context pruning ("microcompact"-style) for Pi sessions.
 *
 * This only affects the in-memory context for the current request; it does not rewrite session
 * history persisted on disk.
 */

export { default } from "./pi-extensions/context-pruning/extension.js";

export { pruneContextMessages } from "./pi-extensions/context-pruning/pruner.js";
export type {
  ContextPruningConfig,
  ContextPruningToolMatch,
  EffectiveContextPruningSettings,
} from "./pi-extensions/context-pruning/settings.js";
export {
  computeEffectiveSettings,
  DEFAULT_CONTEXT_PRUNING_SETTINGS,
} from "./pi-extensions/context-pruning/settings.js";