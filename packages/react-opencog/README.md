# @assistant-ui/react-opencog

OpenCog integration for assistant-ui with bidirectional Atomese ↔ Natural Language translation.

## Features

- **Democratized Interface**: Transform expert Guile shell interactions into natural conversational UI
- **Bidirectional Translation**: Natural language ↔ Atomese with confidence scoring
- **CogServer Integration**: Real-time connection to OpenCog's CogServer
- **Autoconfiguration**: Intelligent UI adaptation based on user expertise level
- **Everything-is-a-Chatbot**: Make knowledge manipulation as simple as chatting

## Installation

```bash
npm install @assistant-ui/react-opencog
```

## Quick Start

### Basic OpenCog Chat Interface

```tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@assistant-ui/react/primitives";
import { useOpenCogRuntime } from "@assistant-ui/react-opencog";

export default function OpenCogChat() {
  const { runtime } = useOpenCogRuntime({
    config: {
      cogServer: {
        host: "localhost",
        port: 17001
      },
      ui: {
        theme: "democratized", // "expert" | "democratized" | "hybrid"
        enableAutoconfig: true
      }
    }
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
```

### Translation Panel

```tsx
import { TranslationPanel } from "@assistant-ui/react-opencog";

export function AtomeseTranslator() {
  return (
    <TranslationPanel 
      defaultMode="nl-to-atomese"
      className="max-w-4xl mx-auto"
    />
  );
}
```

### CogServer Status & Control

```tsx
import { CogServerStatus } from "@assistant-ui/react-opencog";

export function ServerControls() {
  return (
    <CogServerStatus 
      showControls={true}
      showCommands={true}
      className="mb-4"
    />
  );
}
```

## Configuration

### Runtime Configuration

```tsx
const config: OpenCogRuntimeConfig = {
  cogServer: {
    host: "localhost",
    port: 17001,
    protocol: "tcp", // "tcp" | "websocket"
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
    theme: "democratized", // "expert" | "democratized" | "hybrid"
    showGuileShell: false,
    enableAutoconfig: true
  }
};
```

### UI Themes

#### Democratized Theme (Default)
- Natural language focused
- Automatic translation behind the scenes
- Simplified conceptual explanations
- Perfect for non-experts

#### Expert Theme
- Direct Atomese manipulation
- Scheme shell access
- Full knowledge representation visibility
- For OpenCog developers

#### Hybrid Theme
- Best of both worlds
- Side-by-side natural language and Atomese
- Gradual learning curve
- Educational use cases

## API Reference

### Hooks

#### `useOpenCogRuntime(options?)`

Main hook for OpenCog runtime integration.

```tsx
const {
  runtime,              // AssistantRuntime instance
  connect,              // () => Promise<void>
  disconnect,           // () => void
  isConnected,          // boolean
  config,               // OpenCogRuntimeConfig
  translateToAtomese,   // (text: string) => Promise<TranslationResult>
  translateToNaturalLanguage, // (atoms: AtomeseAtom[]) => Promise<AtomeseToNLResult>
  executeCogServerCommand,    // (command: string) => Promise<string>
  executeScheme              // (scheme: string) => Promise<any>
} = useOpenCogRuntime({
  config: {...},
  autoConnect: true,
  onConnectionChange: (connected) => {...},
  onError: (error) => {...}
});
```

### Components

#### `<AtomeseDisplay>`

Renders Atomese knowledge structures with syntax highlighting.

```tsx
<AtomeseDisplay 
  atoms={atoms}
  showTruthValues={true}
  collapsible={true}
  maxDepth={5}
/>
```

#### `<TranslationPanel>`

Interactive bidirectional translation interface.

```tsx
<TranslationPanel 
  defaultMode="nl-to-atomese"
  className="custom-styles"
/>
```

#### `<CogServerStatus>`

Server connection status and command interface.

```tsx
<CogServerStatus 
  showControls={true}
  showCommands={true}
/>
```

## Examples

### Building a Knowledge Explorer

```tsx
import { 
  useOpenCogRuntime, 
  AtomeseDisplay, 
  CogServerStatus 
} from "@assistant-ui/react-opencog";
import { Thread } from "@assistant-ui/react/primitives";

export function KnowledgeExplorer() {
  const { runtime, translateToAtomese } = useOpenCogRuntime({
    config: {
      ui: { theme: "hybrid" },
      translationService: { showAtomese: true }
    }
  });
  
  const [query, setQuery] = useState("");
  const [atoms, setAtoms] = useState([]);
  
  const exploreKnowledge = async () => {
    const result = await translateToAtomese(query);
    setAtoms(result.atomese);
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-screen">
      <div>
        <CogServerStatus showCommands={true} />
        <Thread />
      </div>
      <div>
        <div className="p-4">
          <input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Explore knowledge..."
            className="w-full p-2 border rounded"
          />
          <button onClick={exploreKnowledge}>
            Translate & Explore
          </button>
        </div>
        <AtomeseDisplay atoms={atoms} />
      </div>
    </div>
  );
}
```

## Architecture

### Translation Pipeline

1. **Natural Language Input** → NLP parsing → Semantic analysis
2. **Semantic Structure** → Pattern matching → Atomese generation
3. **Atomese Atoms** → Template matching → Natural language generation
4. **Context Integration** → CogServer sync → Knowledge persistence

### CogServer Integration

- WebSocket/TCP connection to running CogServer instance
- Real-time Scheme command execution
- Atomspace query and manipulation
- Event-driven knowledge updates

## Contributing

This package is part of the assistant-ui ecosystem. See the main repository for contribution guidelines.

## License

MIT - See LICENSE file for details.