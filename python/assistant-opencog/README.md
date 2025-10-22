# assistant-opencog

Python backend services for OpenCog integration with assistant-ui, providing bidirectional Atomese ↔ Natural Language translation and knowledge management.

## Features

- **Bidirectional Translation**: Advanced natural language to Atomese translation and vice versa
- **CogServer Integration**: WebSocket and TCP connectivity to OpenCog's CogServer
- **Knowledge Management**: High-level knowledge manipulation and inference capabilities
- **Assistant-Stream Integration**: Streaming responses compatible with assistant-stream framework
- **Inference Engine**: Basic logical inference rules (transitivity, modus ponens, etc.)

## Installation

```bash
pip install assistant-opencog
```

For assistant-stream integration:
```bash
pip install assistant-opencog[assistant-stream]
```

## Quick Start

### Basic Translation

```python
from assistant_opencog import AtomeseTranslator, NaturalLanguageGenerator

# Natural Language to Atomese
translator = AtomeseTranslator()
atoms, confidence = translator.translate("John loves Mary")

print(f"Confidence: {confidence}")
for atom in atoms:
    print(atom.to_dict())

# Atomese to Natural Language  
generator = NaturalLanguageGenerator()
text, confidence = generator.generate(atoms)
print(f"Generated: {text} (confidence: {confidence})")
```

### CogServer Integration

```python
import asyncio
from assistant_opencog import CogServerConnector, CogServerConfig

async def main():
    config = CogServerConfig(
        host="localhost",
        port=17001,
        connection_type="websocket"
    )
    
    connector = CogServerConnector(config)
    await connector.connect()
    
    # Execute Scheme commands
    result = await connector.execute_scheme("(+ 1 2 3)")
    print(f"Result: {result}")
    
    await connector.disconnect()

asyncio.run(main())
```

### Knowledge Management

```python
import asyncio
from assistant_opencog import OpenCogKnowledgeManager, CogServerConfig

async def main():
    config = CogServerConfig()
    km = OpenCogKnowledgeManager(config)
    await km.initialize()
    
    # Add knowledge from text
    entries = await km.add_knowledge_from_text("Cats are animals")
    
    # Query knowledge
    results = await km.query_knowledge("What are cats?")
    for result in results:
        explanation = await km.explain_knowledge(result)
        print(explanation)
    
    await km.shutdown()

asyncio.run(main())
```

### Streaming Assistant Integration

```python
import asyncio
from assistant_opencog import OpenCogAssistantStream, CogServerConfig

async def main():
    config = CogServerConfig()
    stream = OpenCogAssistantStream(config)
    await stream.initialize()
    
    # Process message with streaming response
    async for chunk in stream.process_user_message(
        "Socrates is a human. Humans are mortal.",
        stream_atomese=True,
        perform_inference=True
    ):
        print(f"{chunk.type}: {chunk.content}")
        if chunk.confidence:
            print(f"  Confidence: {chunk.confidence}")
    
    await stream.shutdown()

asyncio.run(main())
```

## API Reference

### AtomeseTranslator

Translates natural language to Atomese representation using pattern matching and semantic analysis.

**Methods:**
- `translate(text: str) -> Tuple[List[AtomeseAtom], float]`: Translate text to atoms with confidence

### NaturalLanguageGenerator

Generates natural language from Atomese using template-based generation.

**Methods:**
- `generate(atoms: List[AtomeseAtom]) -> Tuple[str, float]`: Generate text from atoms with confidence

### CogServerConnector

Handles connection and communication with OpenCog's CogServer.

**Methods:**
- `connect() -> bool`: Establish connection
- `disconnect()`: Close connection
- `send_command(command: str) -> str`: Send raw command
- `execute_scheme(expr: str) -> Any`: Execute Scheme expression
- `add_atom(atom: AtomeseAtom) -> str`: Add atom to AtomSpace
- `query_atoms(pattern: str) -> List[AtomeseAtom]`: Query atoms by pattern

### OpenCogKnowledgeManager

High-level knowledge management with caching, inference, and relationship discovery.

**Methods:**
- `initialize() -> bool`: Initialize and connect
- `add_knowledge_from_text(text: str) -> List[KnowledgeEntry]`: Add knowledge from NL
- `query_knowledge(query: str) -> List[KnowledgeEntry]`: Query using NL
- `perform_inference(premises: List[AtomeseAtom]) -> List[AtomeseAtom]`: Run inference
- `suggest_related_knowledge(atom: AtomeseAtom) -> List[KnowledgeEntry]`: Find related knowledge

### OpenCogAssistantStream

Streaming assistant integration with assistant-stream framework.

**Methods:**
- `process_user_message() -> AsyncGenerator[OpenCogStreamChunk, None]`: Process with streaming
- `create_assistant_stream_response()`: Create assistant-stream compatible response

## Architecture

### Translation Pipeline

The translation system uses a multi-stage approach:

1. **Pattern Matching**: Rule-based patterns for common linguistic structures
2. **Semantic Analysis**: Entity extraction and relationship identification  
3. **Atomese Generation**: Creation of appropriate atom types and truth values
4. **Confidence Scoring**: Reliability assessment of translations

### Knowledge Management

The knowledge manager provides:

1. **Caching**: In-memory knowledge cache for fast access
2. **Persistence**: Integration with CogServer for permanent storage
3. **Inference**: Logical reasoning over knowledge structures
4. **Relationships**: Discovery of related knowledge entries

### Inference Rules

Built-in inference capabilities include:

- **Inheritance Transitivity**: A inherits B, B inherits C → A inherits C
- **Modus Ponens**: P implies Q, P is true → Q is true  
- **Evaluation Consistency**: Consistency checking for evaluations
- **Similarity Propagation**: Similarity relationship handling

## Development

### Running Tests

```bash
pip install -e .[dev]
pytest
```

### Code Formatting

```bash
black src/ tests/
isort src/ tests/
flake8 src/ tests/
mypy src/
```

## Integration with Frontend

This package works seamlessly with the `@assistant-ui/react-opencog` React package:

```typescript
// Frontend React code
const { runtime } = useOpenCogRuntime({
  config: {
    cogServer: { host: "localhost", port: 17001 },
    translationService: { enabled: true }
  }
});
```

```python
# Backend Python service
stream = OpenCogAssistantStream(CogServerConfig(port=17001))
# Processes frontend requests and returns streaming responses
```

## License

MIT - See LICENSE file for details.

## Contributing

Contributions welcome! Please see the main repository for contribution guidelines.