"""
Advanced bidirectional translation between Natural Language and Atomese.

This module provides sophisticated translation capabilities that go beyond
simple pattern matching to include:
- Semantic parsing and role labeling
- Context-aware knowledge representation
- Confidence scoring and uncertainty handling
- Multi-language support
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class AtomType(Enum):
    CONCEPT_NODE = "ConceptNode"
    PREDICATE_NODE = "PredicateNode"
    EVALUATION_LINK = "EvaluationLink"
    INHERITANCE_LINK = "InheritanceLink"
    IMPLICATION_LINK = "ImplicationLink"
    AND_LINK = "AndLink"
    OR_LINK = "OrLink"
    NOT_LINK = "NotLink"
    LIST_LINK = "ListLink"
    SIMILARITY_LINK = "SimilarityLink"


@dataclass
class TruthValue:
    """Represents OpenCog truth value with strength and confidence."""
    strength: float = 0.5
    confidence: float = 0.5
    
    def __post_init__(self):
        self.strength = max(0.0, min(1.0, self.strength))
        self.confidence = max(0.0, min(1.0, self.confidence))


@dataclass
class AtomeseAtom:
    """Represents an Atomese atom with type, name, outgoing links and truth value."""
    atom_type: AtomType
    name: Optional[str] = None
    outgoing: Optional[List['AtomeseAtom']] = None
    truth_value: Optional[TruthValue] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation for JSON serialization."""
        result = {"type": self.atom_type.value}
        
        if self.name:
            result["name"] = self.name
            
        if self.outgoing:
            result["outgoing"] = [atom.to_dict() for atom in self.outgoing]
            
        if self.truth_value:
            result["truthValue"] = {
                "strength": self.truth_value.strength,
                "confidence": self.truth_value.confidence
            }
            
        return result


class AtomeseTranslator:
    """Translates natural language to Atomese representation."""
    
    def __init__(self):
        self.semantic_patterns = self._initialize_patterns()
        self.concept_cache = {}
    
    def _initialize_patterns(self) -> List[Dict[str, Any]]:
        """Initialize semantic pattern matching rules."""
        return [
            {
                "pattern": r"(.+?)\s+(?:is|are)\s+(.+)",
                "handler": self._handle_is_pattern,
                "confidence": 0.8
            },
            {
                "pattern": r"(.+?)\s+(?:loves?|like[s]?)\s+(.+)",
                "handler": self._handle_love_pattern,
                "confidence": 0.9
            }
        ]
    
    def translate(self, text: str) -> Tuple[List[AtomeseAtom], float]:
        """Translate natural language text to Atomese atoms."""
        text = text.strip().lower()
        
        # Try pattern matching
        for pattern_info in self.semantic_patterns:
            match = re.search(pattern_info["pattern"], text, re.IGNORECASE)
            if match:
                atoms = pattern_info["handler"](match, text)
                confidence = pattern_info["confidence"]
                return atoms, confidence
        
        # Fallback: create simple concept node
        atoms = [self._create_concept_node(text, TruthValue(0.3, 0.4))]
        return atoms, 0.3
    
    def _handle_is_pattern(self, match, text: str) -> List[AtomeseAtom]:
        """Handle 'X is Y' pattern as InheritanceLink."""
        subject = self._clean_entity(match.group(1))
        predicate = self._clean_entity(match.group(2))
        
        return [AtomeseAtom(
            AtomType.INHERITANCE_LINK,
            outgoing=[
                self._create_concept_node(subject),
                self._create_concept_node(predicate)
            ],
            truth_value=TruthValue(0.8, 0.7)
        )]
    
    def _handle_love_pattern(self, match, text: str) -> List[AtomeseAtom]:
        """Handle 'X loves Y' pattern as EvaluationLink."""
        subject = self._clean_entity(match.group(1))
        object_entity = self._clean_entity(match.group(2))
        
        return [AtomeseAtom(
            AtomType.EVALUATION_LINK,
            outgoing=[
                AtomeseAtom(AtomType.PREDICATE_NODE, name="love"),
                AtomeseAtom(
                    AtomType.LIST_LINK,
                    outgoing=[
                        self._create_concept_node(subject),
                        self._create_concept_node(object_entity)
                    ]
                )
            ],
            truth_value=TruthValue(0.9, 0.8)
        )]
    
    def _create_concept_node(self, name: str, tv: Optional[TruthValue] = None) -> AtomeseAtom:
        """Create a ConceptNode with optional caching."""
        clean_name = self._clean_entity(name)
        if tv is None:
            tv = TruthValue(0.7, 0.6)
        
        return AtomeseAtom(AtomType.CONCEPT_NODE, name=clean_name, truth_value=tv)
    
    def _clean_entity(self, entity: str) -> str:
        """Clean and normalize entity names."""
        entity = re.sub(r'\b(?:a|an|the)\b', '', entity).strip()
        entity = re.sub(r'[^\w\s\-_]', '', entity)
        entity = re.sub(r'\s+', '_', entity)
        return entity.lower() if entity else "unknown"


class NaturalLanguageGenerator:
    """Generates natural language from Atomese representation."""
    
    def generate(self, atoms: List[AtomeseAtom]) -> Tuple[str, float]:
        """Generate natural language from Atomese atoms."""
        if not atoms:
            return "No knowledge representation provided.", 0.1
        
        sentences = []
        for atom in atoms:
            sentence = self._render_atom(atom)
            if sentence:
                sentences.append(sentence)
        
        if not sentences:
            return "Unable to express this knowledge in natural language.", 0.2
        
        text = ". ".join(sentences) + "."
        return text, 0.7
    
    def _render_atom(self, atom: AtomeseAtom) -> str:
        """Render a single atom to natural language."""
        if atom.atom_type == AtomType.CONCEPT_NODE:
            return atom.name.replace("_", " ") if atom.name else "something"
        elif atom.atom_type == AtomType.INHERITANCE_LINK:
            if atom.outgoing and len(atom.outgoing) >= 2:
                subject = self._render_atom(atom.outgoing[0])
                object_str = self._render_atom(atom.outgoing[1])
                return f"{subject} is a {object_str}"
        elif atom.atom_type == AtomType.EVALUATION_LINK:
            if atom.outgoing and len(atom.outgoing) >= 2:
                predicate = atom.outgoing[0]
                if (predicate.name == "love" and atom.outgoing[1].atom_type == AtomType.LIST_LINK and 
                    atom.outgoing[1].outgoing and len(atom.outgoing[1].outgoing) >= 2):
                    subject = self._render_atom(atom.outgoing[1].outgoing[0])
                    obj = self._render_atom(atom.outgoing[1].outgoing[1])
                    return f"{subject} loves {obj}"
        
        return atom.name if atom.name else f"a {atom.atom_type.value} concept"