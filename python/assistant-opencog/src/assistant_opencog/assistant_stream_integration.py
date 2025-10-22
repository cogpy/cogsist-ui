"""
Integration with assistant-stream for OpenCog streaming responses.

Provides streaming response generation that integrates OpenCog knowledge
with the assistant-stream framework.
"""

import asyncio
import json
from typing import AsyncGenerator, Dict, Any, List, Optional
from dataclasses import dataclass

try:
    from assistant_stream import AssistantStreamResponse, RunController
    ASSISTANT_STREAM_AVAILABLE = True
except ImportError:
    ASSISTANT_STREAM_AVAILABLE = False
    # Fallback classes for when assistant-stream is not available
    class AssistantStreamResponse:
        def __init__(self, chunks):
            self.chunks = chunks
    
    class RunController:
        def __init__(self):
            self.cancelled = False

from .knowledge_manager import OpenCogKnowledgeManager, KnowledgeEntry
from .translation import AtomeseAtom, AtomeseTranslator, NaturalLanguageGenerator
from .cogserver import CogServerConfig


@dataclass
class OpenCogStreamChunk:
    """Represents a chunk of OpenCog streaming response."""
    type: str  # "text", "atomese", "knowledge", "inference"
    content: str
    metadata: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None


class OpenCogAssistantStream:
    """Streaming assistant that integrates OpenCog knowledge processing."""
    
    def __init__(self, cogserver_config: CogServerConfig):
        self.knowledge_manager = OpenCogKnowledgeManager(cogserver_config)
        self.translator = AtomeseTranslator()
        self.generator = NaturalLanguageGenerator()
        self.is_initialized = False
    
    async def initialize(self) -> bool:
        """Initialize the OpenCog assistant stream."""
        self.is_initialized = await self.knowledge_manager.initialize()
        return self.is_initialized
    
    async def shutdown(self):
        """Shutdown the assistant stream."""
        await self.knowledge_manager.shutdown()
        self.is_initialized = False
    
    async def process_user_message(
        self, 
        message: str,
        stream_atomese: bool = False,
        stream_knowledge: bool = False,
        perform_inference: bool = True,
        run_controller: Optional[RunController] = None
    ) -> AsyncGenerator[OpenCogStreamChunk, None]:
        """Process user message and generate streaming response with OpenCog integration."""
        
        if not self.is_initialized:
            yield OpenCogStreamChunk(
                type="text",
                content="OpenCog system not initialized. Please check CogServer connection.",
                confidence=0.1
            )
            return
        
        # Initial acknowledgment
        yield OpenCogStreamChunk(
            type="text",
            content="Processing your message with OpenCog...",
            confidence=0.9
        )
        
        try:
            # Step 1: Translate to Atomese
            atoms, translation_confidence = self.translator.translate(message)
            
            if stream_atomese:
                atomese_display = self._format_atoms_for_display(atoms)
                yield OpenCogStreamChunk(
                    type="atomese",
                    content=atomese_display,
                    metadata={"atoms": [atom.to_dict() for atom in atoms]},
                    confidence=translation_confidence
                )
            
            # Step 2: Add knowledge to system
            knowledge_entries = await self.knowledge_manager.add_knowledge_from_text(
                message, source="user"
            )
            
            # Step 3: Query related knowledge
            if stream_knowledge:
                related_entries = []
                for atom in atoms:
                    suggestions = await self.knowledge_manager.suggest_related_knowledge(atom, 3)
                    related_entries.extend(suggestions)
                
                if related_entries:
                    yield OpenCogStreamChunk(
                        type="knowledge",
                        content="Found related knowledge:",
                        confidence=0.8
                    )
                    
                    for entry in related_entries[:5]:  # Limit to top 5
                        if run_controller and run_controller.cancelled:
                            return
                            
                        explanation = await self.knowledge_manager.explain_knowledge(entry)
                        yield OpenCogStreamChunk(
                            type="knowledge",
                            content=explanation,
                            metadata={"entry_id": entry.timestamp.isoformat()},
                            confidence=entry.confidence
                        )
            
            # Step 4: Perform inference
            if perform_inference:
                inferred_atoms = await self.knowledge_manager.perform_inference(atoms)
                
                if inferred_atoms:
                    yield OpenCogStreamChunk(
                        type="inference",
                        content="Inference results:",
                        confidence=0.7
                    )
                    
                    for inferred_atom in inferred_atoms:
                        if run_controller and run_controller.cancelled:
                            return
                            
                        nl_text, nl_confidence = self.generator.generate([inferred_atom])
                        yield OpenCogStreamChunk(
                            type="inference",
                            content=f"Inferred: {nl_text}",
                            metadata={"atom": inferred_atom.to_dict()},
                            confidence=nl_confidence
                        )
            
            # Step 5: Generate comprehensive response
            response_text = await self._generate_comprehensive_response(
                message, atoms, knowledge_entries, translation_confidence
            )
            
            # Stream the response in chunks
            words = response_text.split()
            chunk_size = 5  # Words per chunk
            
            for i in range(0, len(words), chunk_size):
                if run_controller and run_controller.cancelled:
                    return
                    
                chunk_words = words[i:i + chunk_size]
                chunk_text = " ".join(chunk_words)
                
                yield OpenCogStreamChunk(
                    type="text",
                    content=chunk_text + " ",
                    confidence=0.8
                )
                
                # Small delay to simulate streaming
                await asyncio.sleep(0.1)
            
        except Exception as e:
            yield OpenCogStreamChunk(
                type="text",
                content=f"Error processing message: {str(e)}",
                confidence=0.1
            )
    
    async def _generate_comprehensive_response(
        self, 
        user_message: str,
        atoms: List[AtomeseAtom],
        knowledge_entries: List[KnowledgeEntry],
        confidence: float
    ) -> str:
        """Generate a comprehensive response based on OpenCog processing."""
        
        # Generate natural language from atoms
        nl_text, nl_confidence = self.generator.generate(atoms)
        
        response_parts = [
            f"I understand that: {nl_text}"
        ]
        
        # Add knowledge context
        if knowledge_entries:
            response_parts.append(
                f"I've added {len(knowledge_entries)} new knowledge entries to my understanding."
            )
        
        # Add confidence information
        if confidence < 0.5:
            response_parts.append(
                "I'm not entirely certain about this interpretation. Could you provide more context?"
            )
        elif confidence > 0.8:
            response_parts.append(
                "I have high confidence in this understanding."
            )
        
        # Query for related information
        try:
            query_results = await self.knowledge_manager.query_knowledge(user_message)
            if query_results:
                related_info = []
                for result in query_results[:3]:  # Top 3 results
                    explanation = await self.knowledge_manager.explain_knowledge(result)
                    related_info.append(explanation.split('\n')[0])  # Just the first line
                
                if related_info:
                    response_parts.append(
                        f"Related knowledge I have: {'; '.join(related_info)}"
                    )
        except Exception:
            pass  # Don't fail if query doesn't work
        
        return " ".join(response_parts)
    
    def _format_atoms_for_display(self, atoms: List[AtomeseAtom]) -> str:
        """Format atoms for display in the UI."""
        if not atoms:
            return "No Atomese representation generated."
        
        lines = []
        for i, atom in enumerate(atoms):
            lines.append(f"Atom {i + 1}:")
            lines.append(self._atom_to_string(atom, indent=1))
            if atom.truth_value:
                lines.append(f"  Truth Value: [{atom.truth_value.strength:.3f}, {atom.truth_value.confidence:.3f}]")
            lines.append("")
        
        return "\n".join(lines)
    
    def _atom_to_string(self, atom: AtomeseAtom, indent: int = 0) -> str:
        """Convert atom to string representation."""
        spaces = "  " * indent
        result = f"{spaces}({atom.atom_type.value}"
        
        if atom.name:
            result += f' "{atom.name}"'
        
        if atom.outgoing:
            result += "\n"
            for outgoing in atom.outgoing:
                result += self._atom_to_string(outgoing, indent + 1) + "\n"
            result += f"{spaces}"
        
        result += ")"
        return result
    
    def create_assistant_stream_response(
        self, 
        message: str,
        **kwargs
    ) -> AssistantStreamResponse:
        """Create an AssistantStreamResponse for integration with assistant-stream."""
        if not ASSISTANT_STREAM_AVAILABLE:
            raise ImportError("assistant-stream package not available")
        
        async def chunk_generator():
            """Generate chunks for assistant-stream."""
            async for chunk in self.process_user_message(message, **kwargs):
                # Convert OpenCogStreamChunk to assistant-stream format
                if chunk.type == "text":
                    yield {
                        "type": "text-delta",
                        "text_delta": chunk.content
                    }
                elif chunk.type == "atomese":
                    yield {
                        "type": "data",
                        "data": {
                            "type": "atomese",
                            "content": chunk.content,
                            "metadata": chunk.metadata
                        }
                    }
                elif chunk.type == "knowledge":
                    yield {
                        "type": "data", 
                        "data": {
                            "type": "knowledge",
                            "content": chunk.content,
                            "metadata": chunk.metadata
                        }
                    }
                elif chunk.type == "inference":
                    yield {
                        "type": "data",
                        "data": {
                            "type": "inference",
                            "content": chunk.content,
                            "metadata": chunk.metadata
                        }
                    }
        
        return AssistantStreamResponse(chunk_generator())