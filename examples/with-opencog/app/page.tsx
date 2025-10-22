"use client";

import { useState } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@assistant-ui/react/primitives";
import { 
  useOpenCogRuntime, 
  TranslationPanel, 
  CogServerStatus,
  OpenCogRuntimeConfig 
} from "@assistant-ui/react-opencog";

export default function OpenCogDemo() {
  const [activeTab, setActiveTab] = useState<"chat" | "translator" | "explorer">("chat");
  const [uiTheme, setUiTheme] = useState<"democratized" | "expert" | "hybrid">("democratized");

  const { runtime, updateConfig, config } = useOpenCogRuntime({
    config: {
      cogServer: {
        host: "localhost",
        port: 17001,
        protocol: "tcp"
      },
      ui: {
        theme: uiTheme,
        enableAutoconfig: true
      },
      translationService: {
        enabled: true,
        bidirectional: true,
        autoTranslate: true,
        showAtomese: uiTheme !== "democratized"
      }
    },
    autoConnect: false, // Manual connection for demo
    onConnectionChange: (connected) => {
      console.log("CogServer connection:", connected ? "established" : "lost");
    },
    onError: (error) => {
      console.error("OpenCog Runtime Error:", error);
    }
  });

  const handleThemeChange = (newTheme: "democratized" | "expert" | "hybrid") => {
    setUiTheme(newTheme);
    updateConfig({
      ui: { 
        ...config.ui,
        theme: newTheme 
      },
      translationService: {
        ...config.translationService,
        showAtomese: newTheme !== "democratized"
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">
              OpenCog + Assistant-UI Demo
            </h1>
            <div className="flex items-center space-x-4">
              <select
                value={uiTheme}
                onChange={(e) => handleThemeChange(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="democratized">Democratized UI</option>
                <option value="expert">Expert Mode</option>
                <option value="hybrid">Hybrid Mode</option>
              </select>
            </div>
          </div>
          
          <div className="flex space-x-1 mt-3">
            {[
              { key: "chat", label: "Chat Interface" },
              { key: "translator", label: "Translation Panel" },
              { key: "explorer", label: "Knowledge Explorer" }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  activeTab === key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Server Status Panel */}
          <div className="lg:col-span-1">
            <CogServerStatus 
              showControls={true}
              showCommands={activeTab === "explorer"}
              className="mb-4"
            />
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold text-gray-700 mb-3">Current Theme: {uiTheme}</h3>
              <div className="text-sm text-gray-600 space-y-2">
                {uiTheme === "democratized" && (
                  <div>
                    <p className="font-medium">Democratized Mode:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Natural language focused</li>
                      <li>Auto-translation enabled</li>
                      <li>Simplified explanations</li>
                      <li>Perfect for non-experts</li>
                    </ul>
                  </div>
                )}
                {uiTheme === "expert" && (
                  <div>
                    <p className="font-medium">Expert Mode:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Direct Atomese manipulation</li>
                      <li>Scheme shell access</li>
                      <li>Full knowledge visibility</li>
                      <li>For OpenCog developers</li>
                    </ul>
                  </div>
                )}
                {uiTheme === "hybrid" && (
                  <div>
                    <p className="font-medium">Hybrid Mode:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Best of both worlds</li>
                      <li>Side-by-side translations</li>
                      <li>Educational interface</li>
                      <li>Gradual learning curve</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === "chat" && (
              <AssistantRuntimeProvider runtime={runtime}>
                <div className="bg-white rounded-lg shadow h-[600px]">
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">
                      OpenCog Chat Interface
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Interact with OpenCog using natural language. 
                      {uiTheme === "democratized" 
                        ? " Everything is automatically translated to Atomese behind the scenes."
                        : " See both natural language and Atomese representations."
                      }
                    </p>
                  </div>
                  <div className="h-full">
                    <Thread />
                  </div>
                </div>
              </AssistantRuntimeProvider>
            )}

            {activeTab === "translator" && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h2 className="text-lg font-semibold text-blue-800 mb-2">
                    Bidirectional Translation
                  </h2>
                  <p className="text-blue-700 text-sm">
                    Translate between natural language and Atomese representations.
                    This is the core technology that enables the "everything-is-a-chatbot" interface.
                  </p>
                </div>
                <TranslationPanel />
              </div>
            )}

            {activeTab === "explorer" && (
              <div className="space-y-6">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h2 className="text-lg font-semibold text-purple-800 mb-2">
                    Knowledge Explorer
                  </h2>
                  <p className="text-purple-700 text-sm">
                    Advanced interface combining chat interaction with direct CogServer commands.
                    Perfect for exploring and manipulating knowledge structures.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <AssistantRuntimeProvider runtime={runtime}>
                    <div className="bg-white rounded-lg shadow">
                      <div className="p-4 border-b">
                        <h3 className="font-semibold text-gray-700">Chat Interface</h3>
                      </div>
                      <div className="h-96">
                        <Thread />
                      </div>
                    </div>
                  </AssistantRuntimeProvider>
                  
                  <div>
                    <TranslationPanel defaultMode="nl-to-atomese" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center text-gray-600 text-sm">
            <p className="mb-2">
              <strong>OpenCog UI/UX Autoconfiguration System</strong>
            </p>
            <p>
              Transforming expert Guile shell interactions into democratized "everything-is-a-chatbot" interface
              with bidirectional Natural Language ↔ Atomese translation.
            </p>
            <div className="flex justify-center space-x-6 mt-4 text-xs">
              <span>🧠 OpenCog Integration</span>
              <span>🔄 Bidirectional Translation</span>
              <span>💬 Natural Language Interface</span>
              <span>⚙️ Auto-Configuration</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}