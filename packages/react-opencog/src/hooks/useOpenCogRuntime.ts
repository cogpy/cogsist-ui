import { useMemo, useCallback, useEffect } from "react";
import { OpenCogRuntime } from "../runtime/opencog-runtime";
import { OpenCogRuntimeConfig } from "../types";

export interface UseOpenCogRuntimeOptions {
  config?: Partial<OpenCogRuntimeConfig>;
  autoConnect?: boolean;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

export function useOpenCogRuntime(options: UseOpenCogRuntimeOptions = {}) {
  const { config, autoConnect = true, onConnectionChange, onError } = options;

  // Create runtime instance
  const runtime = useMemo(() => {
    const openCogRuntime = new OpenCogRuntime(config);
    
    // Set up event listeners
    const cogServer = openCogRuntime.getCogServer();
    
    const handleConnect = () => {
      onConnectionChange?.(true);
    };
    
    const handleDisconnect = () => {
      onConnectionChange?.(false);
    };
    
    const handleError = (error: Error) => {
      onError?.(error);
    };
    
    cogServer.on("connected", handleConnect);
    cogServer.on("disconnected", handleDisconnect);
    cogServer.on("error", handleError);
    
    return openCogRuntime;
  }, [config, onConnectionChange, onError]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      runtime.connect().catch(console.error);
    }
    
    // Cleanup on unmount
    return () => {
      runtime.disconnect();
    };
  }, [runtime, autoConnect]);

  // Control methods
  const connect = useCallback(async () => {
    try {
      await runtime.connect();
    } catch (error) {
      console.error("Failed to connect:", error);
      onError?.(error as Error);
    }
  }, [runtime, onError]);

  const disconnect = useCallback(() => {
    runtime.disconnect();
  }, [runtime]);

  const updateConfig = useCallback((newConfig: Partial<OpenCogRuntimeConfig>) => {
    runtime.updateConfig(newConfig);
  }, [runtime]);

  // Translation helpers
  const translateToAtomese = useCallback(async (text: string) => {
    return runtime.getTranslationService().translateToAtomese(text);
  }, [runtime]);

  const translateToNaturalLanguage = useCallback(async (atoms: any[]) => {
    return runtime.getTranslationService().translateToNaturalLanguage(atoms);
  }, [runtime]);

  // CogServer command execution
  const executeCogServerCommand = useCallback(async (command: string) => {
    if (!runtime.getCogServer().isConnected()) {
      throw new Error("Not connected to CogServer");
    }
    return runtime.getCogServer().sendCommand(command);
  }, [runtime]);

  const executeScheme = useCallback(async (scheme: string) => {
    return runtime.getCogServer().executeScheme(scheme);
  }, [runtime]);

  return {
    runtime,
    connect,
    disconnect,
    updateConfig,
    translateToAtomese,
    translateToNaturalLanguage,
    executeCogServerCommand,
    executeScheme,
    isConnected: runtime.getCogServer().isConnected(),
    config: runtime.getConfig(),
    translationService: runtime.getTranslationService(),
    cogServer: runtime.getCogServer()
  };
}