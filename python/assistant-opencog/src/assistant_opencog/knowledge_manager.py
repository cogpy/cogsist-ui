"""
Knowledge management and inference for OpenCog integration.

Provides high-level knowledge manipulation, inference capabilities,
and intelligent knowledge graph operations.
"""

import asyncio
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass
from datetime import datetime

from .translation import AtomeseAtom, AtomeseTranslator, NaturalLanguageGenerator, AtomType, TruthValue
from .cogserver import CogServerConnector, CogServerConfig


@dataclass
class KnowledgeEntry:
    """Represents a knowledge entry with metadata."""
    atom: AtomeseAtom
    source: str
    timestamp: datetime
    confidence: float
    context: Optional[str] = None


class OpenCogKnowledgeManager:
    """High-level knowledge management for OpenCog integration."""
    
    def __init__(self, cogserver_config: CogServerConfig):
        self.cogserver = CogServerConnector(cogserver_config)
        self.translator = AtomeseTranslator()
        self.generator = NaturalLanguageGenerator()
        self.knowledge_cache: Dict[str, KnowledgeEntry] = {}
        self.inference_rules = self._initialize_inference_rules()
    
    async def initialize(self) -> bool:
        """Initialize the knowledge manager and connect to CogServer."""
        success = await self.cogserver.connect()
        if success:
            await self._load_initial_knowledge()
        return success
    
    async def shutdown(self):
        """Shutdown the knowledge manager."""
        await self.cogserver.disconnect()
    
    async def add_knowledge_from_text(self, text: str, source: str = "user") -> List[KnowledgeEntry]:
        """Add knowledge from natural language text."""
        atoms, confidence = self.translator.translate(text)
        
        entries = []
        for atom in atoms:
            # Add to CogServer if connected
            if self.cogserver.is_connected:
                try:
                    await self.cogserver.add_atom(atom)
                except Exception as e:
                    print(f"Failed to add atom to CogServer: {e}")
            
            # Create knowledge entry
            entry = KnowledgeEntry(
                atom=atom,
                source=source,
                timestamp=datetime.now(),
                confidence=confidence,
                context=text
            )
            
            # Cache the entry
            entry_id = self._generate_entry_id(atom)
            self.knowledge_cache[entry_id] = entry
            entries.append(entry)
        
        return entries
    
    async def query_knowledge(self, query: str) -> List[KnowledgeEntry]:
        """Query knowledge using natural language."""
        # Translate query to Atomese
        query_atoms, _ = self.translator.translate(query)
        
        # Search in cache
        results = []
        for entry in self.knowledge_cache.values():
            if self._matches_query(entry.atom, query_atoms):
                results.append(entry)
        
        # Query CogServer if connected
        if self.cogserver.is_connected:
            try:
                for query_atom in query_atoms:
                    pattern = self._atom_to_query_pattern(query_atom)
                    remote_atoms = await self.cogserver.query_atoms(pattern)
                    
                    for atom in remote_atoms:
                        entry = KnowledgeEntry(
                            atom=atom,
                            source="cogserver",
                            timestamp=datetime.now(),
                            confidence=0.8
                        )
                        results.append(entry)
                        
            except Exception as e:
                print(f"CogServer query failed: {e}")
        
        return results
    
    async def explain_knowledge(self, entry: KnowledgeEntry) -> str:
        """Generate natural language explanation of knowledge entry."""
        nl_text, confidence = self.generator.generate([entry.atom])
        
        explanation = f"Knowledge: {nl_text}\n"
        explanation += f"Source: {entry.source}\n"
        explanation += f"Confidence: {entry.confidence:.2f}\n"
        explanation += f"Added: {entry.timestamp.strftime('%Y-%m-%d %H:%M:%S')}\n"
        
        if entry.context:
            explanation += f"Original context: {entry.context}\n"
        
        return explanation
    
    async def perform_inference(self, premises: List[AtomeseAtom]) -> List[AtomeseAtom]:
        """Perform logical inference on given premises."""
        inferred_atoms = []
        
        for rule in self.inference_rules:
            new_atoms = await rule(premises, self)
            inferred_atoms.extend(new_atoms)
        
        return inferred_atoms
    
    async def suggest_related_knowledge(self, atom: AtomeseAtom, max_suggestions: int = 5) -> List[KnowledgeEntry]:
        """Suggest related knowledge entries."""
        suggestions = []
        
        # Simple similarity matching
        for entry in self.knowledge_cache.values():
            similarity = self._calculate_similarity(atom, entry.atom)
            if similarity > 0.3:  # Threshold for relatedness
                suggestions.append((entry, similarity))
        
        # Sort by similarity and return top suggestions
        suggestions.sort(key=lambda x: x[1], reverse=True)
        return [entry for entry, _ in suggestions[:max_suggestions]]
    
    def _initialize_inference_rules(self):
        """Initialize basic inference rules."""
        return [
            self._inheritance_transitivity_rule,
            self._evaluation_consistency_rule,
            self._implication_modus_ponens_rule
        ]
    
    async def _inheritance_transitivity_rule(self, premises: List[AtomeseAtom], km) -> List[AtomeseAtom]:
        """If A inherits from B and B inherits from C, then A inherits from C."""
        inferred = []
        
        inheritance_links = [p for p in premises if p.atom_type == AtomType.INHERITANCE_LINK]
        
        for i, link1 in enumerate(inheritance_links):
            for j, link2 in enumerate(inheritance_links):
                if i != j and link1.outgoing and link2.outgoing:
                    # Check if link1.B == link2.A
                    if (len(link1.outgoing) >= 2 and len(link2.outgoing) >= 2 and
                        self._atoms_equal(link1.outgoing[1], link2.outgoing[0])):
                        
                        # Create A inherits from C
                        new_link = AtomeseAtom(
                            AtomType.INHERITANCE_LINK,
                            outgoing=[link1.outgoing[0], link2.outgoing[1]],
                            truth_value=TruthValue(
                                min(link1.truth_value.strength, link2.truth_value.strength) * 0.9,
                                min(link1.truth_value.confidence, link2.truth_value.confidence) * 0.9
                            ) if link1.truth_value and link2.truth_value else TruthValue(0.7, 0.6)
                        )
                        inferred.append(new_link)
        
        return inferred
    
    async def _evaluation_consistency_rule(self, premises: List[AtomeseAtom], km) -> List[AtomeseAtom]:
        """Basic consistency checking for evaluation links."""
        return []  # Placeholder
    
    async def _implication_modus_ponens_rule(self, premises: List[AtomeseAtom], km) -> List[AtomeseAtom]:
        """If P implies Q and P is true, then Q is true."""
        inferred = []
        
        implications = [p for p in premises if p.atom_type == AtomType.IMPLICATION_LINK]
        facts = [p for p in premises if p.atom_type != AtomType.IMPLICATION_LINK]
        
        for impl in implications:
            if impl.outgoing and len(impl.outgoing) >= 2:
                antecedent = impl.outgoing[0]
                consequent = impl.outgoing[1]
                
                # Check if antecedent matches any fact
                for fact in facts:
                    if self._atoms_match(antecedent, fact):
                        # Infer consequent
                        new_atom = AtomeseAtom(
                            consequent.atom_type,
                            name=consequent.name,
                            outgoing=consequent.outgoing,
                            truth_value=TruthValue(
                                min(impl.truth_value.strength, fact.truth_value.strength) * 0.95,
                                min(impl.truth_value.confidence, fact.truth_value.confidence) * 0.95
                            ) if impl.truth_value and fact.truth_value else TruthValue(0.8, 0.7)
                        )
                        inferred.append(new_atom)
        
        return inferred
    
    def _matches_query(self, atom: AtomeseAtom, query_atoms: List[AtomeseAtom]) -> bool:
        """Check if an atom matches any of the query atoms."""
        for query_atom in query_atoms:
            if self._atoms_match(atom, query_atom):
                return True
        return False
    
    def _atoms_match(self, atom1: AtomeseAtom, atom2: AtomeseAtom) -> bool:
        """Check if two atoms match (including partial matching)."""
        if atom1.atom_type != atom2.atom_type:
            return False
        
        if atom1.name and atom2.name:
            return atom1.name == atom2.name
        
        if atom1.outgoing and atom2.outgoing:
            if len(atom1.outgoing) != len(atom2.outgoing):
                return False
            return all(self._atoms_match(a1, a2) for a1, a2 in zip(atom1.outgoing, atom2.outgoing))
        
        return True
    
    def _atoms_equal(self, atom1: AtomeseAtom, atom2: AtomeseAtom) -> bool:
        """Check if two atoms are exactly equal."""
        return (atom1.atom_type == atom2.atom_type and 
                atom1.name == atom2.name and
                atom1.outgoing == atom2.outgoing)
    
    def _calculate_similarity(self, atom1: AtomeseAtom, atom2: AtomeseAtom) -> float:
        """Calculate similarity score between two atoms."""
        if atom1.atom_type != atom2.atom_type:
            return 0.0
        
        similarity = 0.5  # Base similarity for same type
        
        if atom1.name and atom2.name:
            if atom1.name == atom2.name:
                similarity += 0.4
            else:
                # Simple string similarity
                common_chars = set(atom1.name) & set(atom2.name)
                total_chars = set(atom1.name) | set(atom2.name)
                if total_chars:
                    similarity += 0.2 * (len(common_chars) / len(total_chars))
        
        if atom1.outgoing and atom2.outgoing:
            # Calculate structural similarity
            min_len = min(len(atom1.outgoing), len(atom2.outgoing))
            max_len = max(len(atom1.outgoing), len(atom2.outgoing))
            
            if max_len > 0:
                structural_sim = min_len / max_len
                similarity += 0.1 * structural_sim
        
        return min(similarity, 1.0)
    
    def _atom_to_query_pattern(self, atom: AtomeseAtom) -> str:
        """Convert atom to query pattern for CogServer."""
        if atom.name:
            return f"({atom.atom_type.value} \"{atom.name}\")"
        return f"({atom.atom_type.value} *)"
    
    def _generate_entry_id(self, atom: AtomeseAtom) -> str:
        """Generate unique ID for knowledge entry."""
        import hashlib
        content = f"{atom.atom_type.value}_{atom.name or ''}_{len(atom.outgoing or [])}"
        return hashlib.md5(content.encode()).hexdigest()
    
    async def _load_initial_knowledge(self):
        """Load any initial knowledge from CogServer."""
        if not self.cogserver.is_connected:
            return
        
        try:
            # Query for common atom types
            basic_patterns = [
                "ConceptNode",
                "PredicateNode", 
                "InheritanceLink",
                "EvaluationLink"
            ]
            
            for pattern in basic_patterns:
                atoms = await self.cogserver.query_atoms(pattern)
                for atom in atoms[:10]:  # Limit to avoid overwhelming
                    entry = KnowledgeEntry(
                        atom=atom,
                        source="cogserver_initial",
                        timestamp=datetime.now(),
                        confidence=0.8
                    )
                    entry_id = self._generate_entry_id(atom)
                    self.knowledge_cache[entry_id] = entry
                    
        except Exception as e:
            print(f"Failed to load initial knowledge: {e}")