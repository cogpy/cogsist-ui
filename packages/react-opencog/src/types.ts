import { z } from "zod";

// OpenCog Atomese types
export const AtomeseAtomSchema = z.object({
  type: z.string(),
  name: z.string().optional(),
  truthValue: z.object({
    strength: z.number(),
    confidence: z.number()
  }).optional(),
  outgoing: z.array(z.lazy(() => AtomeseAtomSchema)).optional()
});

export type AtomeseAtom = z.infer<typeof AtomeseAtomSchema>;

// CogServer connection configuration
export const CogServerConfigSchema = z.object({
  host: z.string().default("localhost"),
  port: z.number().default(17001),
  protocol: z.enum(["tcp", "websocket"]).default("tcp"),
  reconnect: z.boolean().default(true),
  timeout: z.number().default(5000)
});

export type CogServerConfig = z.infer<typeof CogServerConfigSchema>;

// Translation service types
export interface TranslationResult {
  originalText: string;
  atomese: AtomeseAtom[];
  confidence: number;
  explanation?: string;
}

export interface AtomeseToNLResult {
  atomese: AtomeseAtom[];
  naturalLanguage: string;
  confidence: number;
  context?: string;
}

// OpenCog runtime message types
export interface OpenCogMessage {
  id: string;
  type: "user" | "assistant" | "atomese" | "translation";
  content: string;
  atomese?: AtomeseAtom[];
  translationResult?: TranslationResult;
  timestamp: number;
}

// Runtime configuration for OpenCog integration
export interface OpenCogRuntimeConfig {
  cogServer: CogServerConfig;
  translationService: {
    enabled: boolean;
    bidirectional: boolean;
    autoTranslate: boolean;
    showAtomese: boolean;
  };
  ui: {
    theme: "expert" | "democratized" | "hybrid";
    showGuileShell: boolean;
    enableAutoconfig: boolean;
  };
}

export const DEFAULT_OPENCOG_CONFIG: OpenCogRuntimeConfig = {
  cogServer: {
    host: "localhost",
    port: 17001,
    protocol: "tcp",
    reconnect: true,
    timeout: 5000
  },
  translationService: {
    enabled: true,
    bidirectional: true,
    autoTranslate: true,
    showAtomese: false
  },
  ui: {
    theme: "democratized",
    showGuileShell: false,
    enableAutoconfig: true
  }
};