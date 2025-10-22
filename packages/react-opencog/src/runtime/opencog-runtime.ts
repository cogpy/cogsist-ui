import type { AssistantRuntime, ThreadRuntime, ThreadMessage, Unsubscribe } from "@assistant-ui/react";
import { CogServerClient } from "./cogserver-client";
import { BiDirectionalTranslationService } from "./translation-service";
import { OpenCogRuntimeConfig, OpenCogMessage, AtomeseAtom, DEFAULT_OPENCOG_CONFIG } from "../types";

export class OpenCogRuntime {
  private cogServer: CogServerClient;
  private translationService: BiDirectionalTranslationService;
  private config: OpenCogRuntimeConfig;
  private messages: OpenCogMessage[] = [];
  private subscribers = new Set<() => void>();
  private isRunning = false;

  constructor(config: Partial<OpenCogRuntimeConfig> = {}) {
    this.config = { ...DEFAULT_OPENCOG_CONFIG, ...config };
    this.cogServer = new CogServerClient(this.config.cogServer);
    this.translationService = new BiDirectionalTranslationService();
    this.initializeCogServer();
  }

  private initializeCogServer(): void {
    this.cogServer.on("connected", () => {
      console.log("OpenCog Runtime: Connected to CogServer");
      this.notifySubscribers();
    });

    this.cogServer.on("disconnected", () => {
      console.log("OpenCog Runtime: Disconnected from CogServer");
      this.notifySubscribers();
    });

    this.cogServer.on("error", (error) => {
      console.error("OpenCog Runtime: CogServer error", error);
      this.addSystemMessage(`CogServer error: ${error.message}`, "error");
    });
  }

  async connect(): Promise<void> {
    try {
      await this.cogServer.connect();
      this.addSystemMessage("Connected to OpenCog CogServer", "success");
    } catch (error) {
      console.error("Failed to connect to CogServer:", error);
      this.addSystemMessage("Failed to connect to CogServer. Running in offline mode.", "warning");
    }
  }

  disconnect(): void {
    this.cogServer.disconnect();
    this.addSystemMessage("Disconnected from CogServer", "info");
  }

  async handleUserMessage(message: string): Promise<void> {
    this.isRunning = true;
    this.notifySubscribers();

    // Add user message
    const userMessage: OpenCogMessage = {
      id: this.generateId(),
      type: "user",
      content: message,
      timestamp: Date.now()
    };
    this.messages.push(userMessage);

    try {
      // Process message through translation and OpenCog
      await this.processMessage(userMessage);
    } catch (error) {
      console.error("Error processing message:", error);
      this.addSystemMessage(`Error: ${error}`, "error");
    } finally {
      this.isRunning = false;
      this.notifySubscribers();
    }
  }

  private async processMessage(userMessage: OpenCogMessage): Promise<void> {
    const content = userMessage.content;

    // Auto-translate to Atomese if enabled
    if (this.config.translationService.enabled && this.config.translationService.autoTranslate) {
      const translationResult = await this.translationService.translateToAtomese(content);
      
      // Add translation message if configured to show
      if (this.config.translationService.showAtomese) {
        const translationMessage: OpenCogMessage = {
          id: this.generateId(),
          type: "translation",
          content: this.formatAtomeseForDisplay(translationResult.atomese),
          atomese: translationResult.atomese,
          translationResult,
          timestamp: Date.now()
        };
        this.messages.push(translationMessage);
      }

      // Execute in CogServer if connected
      if (this.cogServer.isConnected()) {
        try {
          await this.executeInCogServer(translationResult.atomese);
        } catch (error) {
          console.error("Failed to execute in CogServer:", error);
        }
      }
    }

    // Generate response based on configuration
    await this.generateResponse(content, userMessage.atomese);
  }

  private async executeInCogServer(atoms: AtomeseAtom[]): Promise<void> {
    for (const atom of atoms) {
      try {
        await this.cogServer.addAtom(atom);
      } catch (error) {
        console.error("Failed to add atom to CogServer:", error);
      }
    }
  }

  private async generateResponse(userContent: string, userAtomese?: AtomeseAtom[]): Promise<void> {
    let responseContent = "";
    let responseAtomese: AtomeseAtom[] = [];

    if (this.config.ui.theme === "democratized") {
      // Democratized interface - natural language focused
      responseContent = await this.generateNaturalLanguageResponse(userContent);
    } else if (this.config.ui.theme === "expert") {
      // Expert interface - Atomese focused
      responseAtomese = await this.generateAtomeseResponse(userAtomese);
      if (this.config.translationService.bidirectional) {
        const nlResult = await this.translationService.translateToNaturalLanguage(responseAtomese);
        responseContent = nlResult.naturalLanguage;
      } else {
        responseContent = this.formatAtomeseForDisplay(responseAtomese);
      }
    } else {
      // Hybrid interface
      responseContent = await this.generateHybridResponse(userContent, userAtomese);
    }

    // Add assistant response
    const assistantMessage: OpenCogMessage = {
      id: this.generateId(),
      type: "assistant",
      content: responseContent,
      atomese: responseAtomese.length > 0 ? responseAtomese : undefined,
      timestamp: Date.now()
    };
    this.messages.push(assistantMessage);
    this.notifySubscribers();
  }

  private async generateNaturalLanguageResponse(userContent: string): Promise<string> {
    // In democratized mode, focus on natural conversation
    if (this.cogServer.isConnected()) {
      try {
        // Query the atomspace for relevant knowledge
        const queryResult = await this.cogServer.queryAtomspace(`(ConceptNode "${userContent}")`);
        if (queryResult.length > 0) {
          const nlResult = await this.translationService.translateToNaturalLanguage(queryResult);
          return `Based on my knowledge: ${nlResult.naturalLanguage}`;
        }
      } catch (error) {
        console.error("Query failed:", error);
      }
    }
    
    return `I understand you're saying: "${userContent}". Let me help you explore this concept through our conversation.`;
  }

  private async generateAtomeseResponse(userAtomese?: AtomeseAtom[]): Promise<AtomeseAtom[]> {
    // Expert mode - work directly with Atomese
    if (!userAtomese || userAtomese.length === 0) {
      return [{
        type: "ConceptNode",
        name: "acknowledgment",
        truthValue: { strength: 0.9, confidence: 0.8 }
      }];
    }

    // Generate inference or related concepts
    return [{
      type: "ImplicationLink",
      outgoing: userAtomese.concat([{
        type: "ConceptNode",
        name: "processed",
        truthValue: { strength: 0.8, confidence: 0.7 }
      }]),
      truthValue: { strength: 0.7, confidence: 0.6 }
    }];
  }

  private async generateHybridResponse(userContent: string, userAtomese?: AtomeseAtom[]): Promise<string> {
    // Hybrid mode - show both natural language and Atomese insights
    const nlResponse = await this.generateNaturalLanguageResponse(userContent);
    
    if (userAtomese && userAtomese.length > 0) {
      const atomeseDisplay = this.formatAtomeseForDisplay(userAtomese);
      return `${nlResponse}\n\n**Knowledge Structure:**\n${atomeseDisplay}`;
    }
    
    return nlResponse;
  }

  private formatAtomeseForDisplay(atoms: AtomeseAtom[]): string {
    return atoms.map(atom => this.atomToString(atom)).join('\n');
  }

  private atomToString(atom: AtomeseAtom, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let result = `${spaces}(${atom.type}`;
    
    if (atom.name) {
      result += ` "${atom.name}"`;
    }
    
    if (atom.outgoing && atom.outgoing.length > 0) {
      result += '\n';
      result += atom.outgoing.map(outgoing => 
        this.atomToString(outgoing, indent + 1)
      ).join('\n');
      result += `\n${spaces}`;
    }
    
    result += ')';
    
    if (atom.truthValue) {
      result += ` ; TV: [${atom.truthValue.strength.toFixed(2)}, ${atom.truthValue.confidence.toFixed(2)}]`;
    }
    
    return result;
  }

  private addSystemMessage(content: string, level: "info" | "warning" | "error" | "success"): void {
    const message: OpenCogMessage = {
      id: this.generateId(),
      type: "assistant",
      content: `[${level.toUpperCase()}] ${content}`,
      timestamp: Date.now()
    };
    this.messages.push(message);
    this.notifySubscribers();
  }

  getMessages(): OpenCogMessage[] {
    return [...this.messages];
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback());
  }

  private generateId(): string {
    return Math.random().toString(36).substring(7);
  }

  // Runtime configuration methods
  updateConfig(newConfig: Partial<OpenCogRuntimeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.notifySubscribers();
  }

  getConfig(): OpenCogRuntimeConfig {
    return { ...this.config };
  }

  // Translation service access
  getTranslationService(): BiDirectionalTranslationService {
    return this.translationService;
  }

  // CogServer access
  getCogServer(): CogServerClient {
    return this.cogServer;
  }
}