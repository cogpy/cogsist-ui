import React, { useState, useEffect } from "react";
import { useOpenCogRuntime } from "../hooks/useOpenCogRuntime";

interface CogServerStatusProps {
  className?: string;
  showControls?: boolean;
  showCommands?: boolean;
}

export function CogServerStatus({ 
  className = "", 
  showControls = true, 
  showCommands = false 
}: CogServerStatusProps) {
  const [command, setCommand] = useState("");
  const [commandResult, setCommandResult] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<Array<{ command: string; result: string; timestamp: number }>>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const { 
    isConnected, 
    connect, 
    disconnect, 
    config, 
    executeCogServerCommand,
    executeScheme
  } = useOpenCogRuntime();

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const executeCommand = async () => {
    if (!command.trim() || !isConnected) return;
    
    setIsExecuting(true);
    try {
      let result: string;
      
      if (command.trim().startsWith("(")) {
        // Scheme expression
        result = await executeScheme(command);
      } else {
        // Regular command
        result = await executeCogServerCommand(command);
      }
      
      setCommandResult(result);
      setCommandHistory(prev => [
        { command, result, timestamp: Date.now() },
        ...prev.slice(0, 9) // Keep last 10 commands
      ]);
      setCommand("");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Command failed";
      setCommandResult(`Error: ${errorMsg}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      executeCommand();
    }
  };

  const statusColor = isConnected ? "green" : "red";
  const statusText = isConnected ? "Connected" : "Disconnected";

  return (
    <div className={`p-4 bg-white rounded-lg shadow ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full bg-${statusColor}-500`}></div>
          <span className="font-semibold text-gray-700">
            CogServer Status: {statusText}
          </span>
        </div>
        
        {showControls && (
          <div className="flex space-x-2">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Connect
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Disconnect
              </button>
            )}
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <div>Host: {config.cogServer.host}:{config.cogServer.port}</div>
        <div>Protocol: {config.cogServer.protocol}</div>
        <div>UI Theme: {config.ui.theme}</div>
        <div>Auto-translate: {config.translationService.autoTranslate ? "Enabled" : "Disabled"}</div>
      </div>

      {showCommands && isConnected && (
        <div className="mt-4 space-y-3">
          <div className="border-t pt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Execute CogServer Command:
            </label>
            <div className="flex space-x-2">
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter command or Scheme expression... (Ctrl+Enter to execute)"
                className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono"
                rows={2}
              />
              <button
                onClick={executeCommand}
                disabled={!command.trim() || isExecuting}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {isExecuting ? "..." : "Execute"}
              </button>
            </div>
          </div>

          {commandResult && (
            <div className="p-3 bg-gray-50 rounded border">
              <div className="text-xs text-gray-500 mb-1">Result:</div>
              <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800">
                {commandResult}
              </pre>
            </div>
          )}

          {commandHistory.length > 0 && (
            <div className="border-t pt-3">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Command History:
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {commandHistory.map((item, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                    <div className="font-mono text-gray-600 mb-1">
                      &gt; {item.command}
                    </div>
                    <div className="font-mono text-gray-800 pl-2 border-l-2 border-gray-300">
                      {item.result}
                    </div>
                    <div className="text-gray-400 text-right mt-1">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}