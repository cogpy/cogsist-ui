import { EventEmitter } from "events";
// For browser compatibility, we'll create a mock WebSocket interface
interface WSLike {
  readyState: number;
  OPEN: number;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: ((error: any) => void) | null;
}
import { CogServerConfig, AtomeseAtom } from "../types";

export class CogServerClient extends EventEmitter {
  private config: CogServerConfig;
  private connection: WSLike | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(config: CogServerConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `ws://${this.config.host}:${this.config.port}`;
        // Create WebSocket-like interface for browser/node compatibility
        if (typeof window !== "undefined" && window.WebSocket) {
          this.connection = new window.WebSocket(url) as WSLike;
        } else {
          // Mock implementation for node environment
          this.connection = {
            readyState: 0,
            OPEN: 1,
            send: () => {},
            close: () => {},
            onopen: null,
            onmessage: null,
            onclose: null,
            onerror: null
          } as WSLike;
          // Simulate connection failure in non-browser environment
          setTimeout(() => this.connection?.onerror?.(new Error("No browser WebSocket available")), 100);
        }

        this.connection.onopen = () => {
          console.log("Connected to CogServer");
          this.reconnectAttempts = 0;
          this.emit("connected");
          resolve();
        };

        this.connection.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.emit("message", message);
          } catch (error) {
            console.error("Failed to parse CogServer message:", error);
          }
        };

        this.connection.onclose = () => {
          console.log("CogServer connection closed");
          this.emit("disconnected");
          
          if (this.config.reconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++;
              console.log(`Reconnecting to CogServer (attempt ${this.reconnectAttempts})...`);
              this.connect().catch(console.error);
            }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
          }
        };

        this.connection.onerror = (error) => {
          console.error("CogServer connection error:", error);
          this.emit("error", error);
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.connection?.readyState !== this.connection?.OPEN) {
            this.connection?.close();
            reject(new Error("Connection timeout"));
          }
        }, this.config.timeout);

      } catch (error) {
        reject(error);
      }
    });
  }

  async sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.connection || this.connection.readyState !== this.connection.OPEN) {
        reject(new Error("Not connected to CogServer"));
        return;
      }

      const requestId = Math.random().toString(36).substring(7);
      const message = {
        id: requestId,
        type: "command",
        command: command
      };

      const timeout = setTimeout(() => {
        reject(new Error("Command timeout"));
      }, this.config.timeout);

      const handleResponse = (response: any) => {
        if (response.id === requestId) {
          clearTimeout(timeout);
          this.off("message", handleResponse);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.result || "");
          }
        }
      };

      this.on("message", handleResponse);
      this.connection.send(JSON.stringify(message));
    });
  }

  async executeScheme(scheme: string): Promise<any> {
    try {
      const result = await this.sendCommand(`(cog-execute! ${scheme})`);
      return this.parseSchemeResult(result);
    } catch (error) {
      console.error("Failed to execute Scheme:", error);
      throw error;
    }
  }

  async queryAtomspace(pattern: string): Promise<AtomeseAtom[]> {
    try {
      const result = await this.sendCommand(`(cog-get-atoms '${pattern})`);
      return this.parseAtomList(result);
    } catch (error) {
      console.error("Failed to query atomspace:", error);
      throw error;
    }
  }

  async addAtom(atom: AtomeseAtom): Promise<string> {
    try {
      const atomExpression = this.atomToScheme(atom);
      const result = await this.sendCommand(atomExpression);
      return result;
    } catch (error) {
      console.error("Failed to add atom:", error);
      throw error;
    }
  }

  private parseSchemeResult(result: string): any {
    // Basic Scheme result parsing - in a real implementation,
    // this would be more sophisticated
    try {
      if (result.startsWith("(") && result.endsWith(")")) {
        return JSON.parse(result.replace(/'/g, '"'));
      }
      return result;
    } catch {
      return result;
    }
  }

  private parseAtomList(result: string): AtomeseAtom[] {
    // Basic atom parsing - in a real implementation,
    // this would use a proper Atomese parser
    const atoms: AtomeseAtom[] = [];
    // This is a simplified implementation
    return atoms;
  }

  private atomToScheme(atom: AtomeseAtom): string {
    // Convert AtomeseAtom to Scheme expression
    if (atom.name) {
      return `(${atom.type} "${atom.name}")`;
    } else if (atom.outgoing) {
      const outgoingScheme = atom.outgoing.map(a => this.atomToScheme(a)).join(" ");
      return `(${atom.type} ${outgoingScheme})`;
    }
    return `(${atom.type})`;
  }

  disconnect(): void {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }

  isConnected(): boolean {
    return this.connection?.readyState === this.connection?.OPEN;
  }
}