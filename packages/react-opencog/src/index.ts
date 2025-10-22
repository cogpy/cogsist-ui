// Main OpenCog runtime
export { OpenCogRuntime } from "./runtime/opencog-runtime";

// CogServer client
export { CogServerClient } from "./runtime/cogserver-client";

// Translation service
export { BiDirectionalTranslationService } from "./runtime/translation-service";

// React hooks
export { useOpenCogRuntime } from "./hooks/useOpenCogRuntime";
export type { UseOpenCogRuntimeOptions } from "./hooks/useOpenCogRuntime";

// React components
export { AtomeseDisplay } from "./components/AtomeseDisplay";
export { TranslationPanel } from "./components/TranslationPanel";
export { CogServerStatus } from "./components/CogServerStatus";

// Types
export type {
  AtomeseAtom,
  CogServerConfig,
  TranslationResult,
  AtomeseToNLResult,
  OpenCogMessage,
  OpenCogRuntimeConfig
} from "./types";

export {
  AtomeseAtomSchema,
  CogServerConfigSchema,
  DEFAULT_OPENCOG_CONFIG
} from "./types";

// Re-export assistant-ui types for convenience
export type {
  AssistantRuntime,
  ThreadMessage,
  AssistantMessage,
  UserMessage
} from "@assistant-ui/react";