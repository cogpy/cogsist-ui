"""Tests for translation module."""

import pytest
from assistant_opencog.translation import AtomeseTranslator, NaturalLanguageGenerator, AtomType, AtomeseAtom, TruthValue


class TestAtomeseTranslator:
    
    def setup_method(self):
        self.translator = AtomeseTranslator()
    
    def test_simple_concept_translation(self):
        atoms, confidence = self.translator.translate("cat")
        
        assert len(atoms) == 1
        assert atoms[0].atom_type == AtomType.CONCEPT_NODE
        assert atoms[0].name == "cat"
        assert confidence > 0.0
    
    def test_is_pattern_translation(self):
        atoms, confidence = self.translator.translate("Socrates is a human")
        
        assert len(atoms) == 1
        assert atoms[0].atom_type == AtomType.INHERITANCE_LINK
        assert len(atoms[0].outgoing) == 2
        assert atoms[0].outgoing[0].name == "socrates"
        assert atoms[0].outgoing[1].name == "human"
        assert confidence > 0.5
    
    def test_love_pattern_translation(self):
        atoms, confidence = self.translator.translate("John loves Mary")
        
        assert len(atoms) == 1
        atom = atoms[0]
        assert atom.atom_type == AtomType.EVALUATION_LINK
        assert len(atom.outgoing) == 2
        
        # Check predicate
        predicate = atom.outgoing[0]
        assert predicate.atom_type == AtomType.PREDICATE_NODE
        assert predicate.name == "love"
        
        # Check arguments
        args = atom.outgoing[1]
        assert args.atom_type == AtomType.LIST_LINK
        assert len(args.outgoing) == 2
        assert args.outgoing[0].name == "john"
        assert args.outgoing[1].name == "mary"
        
        assert confidence > 0.8
    
    def test_entity_cleaning(self):
        atoms, _ = self.translator.translate("The big cat is an animal")
        
        # Should remove articles and normalize
        inheritance = atoms[0]
        subject = inheritance.outgoing[0]
        predicate = inheritance.outgoing[1]
        
        assert subject.name == "big_cat"  # spaces to underscores
        assert predicate.name == "animal"  # article removed


class TestNaturalLanguageGenerator:
    
    def setup_method(self):
        self.generator = NaturalLanguageGenerator()
    
    def test_concept_node_generation(self):
        atom = AtomeseAtom(AtomType.CONCEPT_NODE, name="cat")
        text, confidence = self.generator.generate([atom])
        
        assert "cat" in text.lower()
        assert confidence > 0.0
    
    def test_inheritance_link_generation(self):
        atoms = [AtomeseAtom(
            AtomType.INHERITANCE_LINK,
            outgoing=[
                AtomeseAtom(AtomType.CONCEPT_NODE, name="socrates"),
                AtomeseAtom(AtomType.CONCEPT_NODE, name="human")
            ]
        )]
        
        text, confidence = self.generator.generate(atoms)
        
        assert "socrates" in text.lower()
        assert "human" in text.lower()
        assert "is a" in text.lower()
        assert confidence > 0.0
    
    def test_evaluation_link_generation(self):
        atoms = [AtomeseAtom(
            AtomType.EVALUATION_LINK,
            outgoing=[
                AtomeseAtom(AtomType.PREDICATE_NODE, name="love"),
                AtomeseAtom(
                    AtomType.LIST_LINK,
                    outgoing=[
                        AtomeseAtom(AtomType.CONCEPT_NODE, name="john"),
                        AtomeseAtom(AtomType.CONCEPT_NODE, name="mary")
                    ]
                )
            ]
        )]
        
        text, confidence = self.generator.generate(atoms)
        
        assert "john" in text.lower()
        assert "loves" in text.lower()  # Should conjugate
        assert "mary" in text.lower()
        assert confidence > 0.0
    
    def test_empty_atoms_generation(self):
        text, confidence = self.generator.generate([])
        
        assert "no knowledge" in text.lower()
        assert confidence < 0.5


class TestTruthValue:
    
    def test_truth_value_creation(self):
        tv = TruthValue(0.8, 0.9)
        assert tv.strength == 0.8
        assert tv.confidence == 0.9
    
    def test_truth_value_clamping(self):
        tv = TruthValue(1.5, -0.2)
        assert tv.strength == 1.0  # Clamped to max
        assert tv.confidence == 0.0  # Clamped to min


class TestAtomeseAtom:
    
    def test_atom_to_dict(self):
        atom = AtomeseAtom(
            AtomType.CONCEPT_NODE,
            name="test",
            truth_value=TruthValue(0.7, 0.6)
        )
        
        data = atom.to_dict()
        
        assert data["type"] == "ConceptNode"
        assert data["name"] == "test"
        assert data["truthValue"]["strength"] == 0.7
        assert data["truthValue"]["confidence"] == 0.6
    
    def test_atom_from_dict(self):
        data = {
            "type": "ConceptNode",
            "name": "test",
            "truthValue": {
                "strength": 0.7,
                "confidence": 0.6
            }
        }
        
        atom = AtomeseAtom.from_dict(data)
        
        assert atom.atom_type == AtomType.CONCEPT_NODE
        assert atom.name == "test"
        assert atom.truth_value.strength == 0.7
        assert atom.truth_value.confidence == 0.6
    
    def test_complex_atom_serialization(self):
        # Create complex nested structure
        atom = AtomeseAtom(
            AtomType.INHERITANCE_LINK,
            outgoing=[
                AtomeseAtom(AtomType.CONCEPT_NODE, name="child"),
                AtomeseAtom(AtomType.CONCEPT_NODE, name="parent")
            ],
            truth_value=TruthValue(0.9, 0.8)
        )
        
        # Test round-trip serialization
        data = atom.to_dict()
        restored_atom = AtomeseAtom.from_dict(data)
        
        assert restored_atom.atom_type == atom.atom_type
        assert len(restored_atom.outgoing) == 2
        assert restored_atom.outgoing[0].name == "child"
        assert restored_atom.outgoing[1].name == "parent"
        assert restored_atom.truth_value.strength == 0.9