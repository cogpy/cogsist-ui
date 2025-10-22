"""
OpenCog integration for assistant-ui with bidirectional Atomese translation.

This package provides Python backend services for:
- Natural Language to Atomese translation
- Atomese to Natural Language generation  
- CogServer integration and communication
- Knowledge graph manipulation and inference
"""

from .translation import AtomeseTranslator, NaturalLanguageGenerator
from .cogserver import CogServerConnector
from .knowledge_manager import OpenCogKnowledgeManager
from .assistant_stream_integration import OpenCogAssistantStream

__version__ = "0.1.0"
__all__ = [
    "AtomeseTranslator",
    "NaturalLanguageGenerator", 
    "CogServerConnector",
    "OpenCogKnowledgeManager",
    "OpenCogAssistantStream"
]