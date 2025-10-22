import { AtomeseAtom, TranslationResult, AtomeseToNLResult } from "../types";

export class BiDirectionalTranslationService {
  private nlToAtomeseCache = new Map<string, TranslationResult>();
  private atomeseToNlCache = new Map<string, AtomeseToNLResult>();

  /**
   * Translate natural language to Atomese representation
   */
  async translateToAtomese(text: string): Promise<TranslationResult> {
    // Check cache first
    if (this.nlToAtomeseCache.has(text)) {
      return this.nlToAtomeseCache.get(text)!;
    }

    try {
      const result = await this.performNLToAtomeseTranslation(text);
      this.nlToAtomeseCache.set(text, result);
      return result;
    } catch (error) {
      console.error("Translation to Atomese failed:", error);
      // Return a fallback result
      return {
        originalText: text,
        atomese: [this.createFallbackAtom(text)],
        confidence: 0.1,
        explanation: "Failed to translate - using fallback representation"
      };
    }
  }

  /**
   * Translate Atomese to natural language
   */
  async translateToNaturalLanguage(atoms: AtomeseAtom[]): Promise<AtomeseToNLResult> {
    const atomKey = JSON.stringify(atoms);
    
    // Check cache first
    if (this.atomeseToNlCache.has(atomKey)) {
      return this.atomeseToNlCache.get(atomKey)!;
    }

    try {
      const result = await this.performAtomeseToNLTranslation(atoms);
      this.atomeseToNlCache.set(atomKey, result);
      return result;
    } catch (error) {
      console.error("Translation to natural language failed:", error);
      // Return a fallback result
      return {
        atomese: atoms,
        naturalLanguage: this.createFallbackNL(atoms),
        confidence: 0.1,
        context: "Failed translation - showing simplified representation"
      };
    }
  }

  private async performNLToAtomeseTranslation(text: string): Promise<TranslationResult> {
    // This is where the actual NL to Atomese translation would happen
    // In a real implementation, this would use:
    // 1. NLP pipeline for parsing
    // 2. Semantic role labeling
    // 3. Knowledge graph integration
    // 4. OpenCog's pattern matching
    
    const atoms: AtomeseAtom[] = [];
    
    // Simple rule-based translation for common patterns
    if (text.toLowerCase().includes("love")) {
      atoms.push({
        type: "EvaluationLink",
        outgoing: [
          {
            type: "PredicateNode",
            name: "love"
          },
          {
            type: "ListLink", 
            outgoing: [
              this.extractSubject(text),
              this.extractObject(text)
            ]
          }
        ],
        truthValue: { strength: 0.8, confidence: 0.7 }
      });
    } else if (text.toLowerCase().includes("is") || text.toLowerCase().includes("are")) {
      atoms.push({
        type: "InheritanceLink",
        outgoing: [
          this.extractSubject(text),
          this.extractPredicate(text)
        ],
        truthValue: { strength: 0.7, confidence: 0.6 }
      });
    } else {
      // Generic concept representation
      atoms.push({
        type: "ConceptNode",
        name: text.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').trim(),
        truthValue: { strength: 0.5, confidence: 0.5 }
      });
    }

    return {
      originalText: text,
      atomese: atoms,
      confidence: 0.75,
      explanation: "Translated using pattern-based rules with semantic analysis"
    };
  }

  private async performAtomeseToNLTranslation(atoms: AtomeseAtom[]): Promise<AtomeseToNLResult> {
    // This is where the actual Atomese to NL translation would happen
    // In a real implementation, this would use:
    // 1. Template-based generation
    // 2. Neural language models
    // 3. Context-aware rendering
    // 4. OpenCog's natural language generation
    
    let naturalLanguage = "";
    
    for (const atom of atoms) {
      const atomNL = this.atomToNaturalLanguage(atom);
      if (atomNL) {
        naturalLanguage += (naturalLanguage ? " " : "") + atomNL;
      }
    }
    
    if (!naturalLanguage) {
      naturalLanguage = this.createFallbackNL(atoms);
    }

    return {
      atomese: atoms,
      naturalLanguage: naturalLanguage,
      confidence: 0.7,
      context: "Generated using pattern-based templates"
    };
  }

  private atomToNaturalLanguage(atom: AtomeseAtom): string {
    switch (atom.type) {
      case "ConceptNode":
        return atom.name || "unknown concept";
      
      case "InheritanceLink":
        if (atom.outgoing && atom.outgoing.length === 2) {
          const subject = this.atomToNaturalLanguage(atom.outgoing[0]);
          const predicate = this.atomToNaturalLanguage(atom.outgoing[1]);
          return `${subject} is a ${predicate}`;
        }
        break;
      
      case "EvaluationLink":
        if (atom.outgoing && atom.outgoing.length === 2) {
          const predicate = this.atomToNaturalLanguage(atom.outgoing[0]);
          const args = atom.outgoing[1];
          if (args.type === "ListLink" && args.outgoing && args.outgoing.length === 2) {
            const subject = this.atomToNaturalLanguage(args.outgoing[0]);
            const object = this.atomToNaturalLanguage(args.outgoing[1]);
            return `${subject} ${predicate}s ${object}`;
          }
        }
        break;
      
      case "PredicateNode":
        return atom.name || "unknown relation";
      
      default:
        return atom.name || `${atom.type.toLowerCase()} concept`;
    }
    return "";
  }

  private extractSubject(text: string): AtomeseAtom {
    // Simple subject extraction - in real implementation would use NLP
    const words = text.split(" ");
    const subject = words[0] || "unknown";
    return {
      type: "ConceptNode",
      name: subject.toLowerCase(),
      truthValue: { strength: 0.7, confidence: 0.6 }
    };
  }

  private extractObject(text: string): AtomeseAtom {
    // Simple object extraction - in real implementation would use NLP
    const words = text.split(" ");
    const object = words[words.length - 1] || "unknown";
    return {
      type: "ConceptNode", 
      name: object.toLowerCase(),
      truthValue: { strength: 0.7, confidence: 0.6 }
    };
  }

  private extractPredicate(text: string): AtomeseAtom {
    // Simple predicate extraction - in real implementation would use NLP
    const words = text.split(" ");
    let predicate = "thing";
    
    for (let i = 0; i < words.length; i++) {
      if (words[i].toLowerCase() === "is" || words[i].toLowerCase() === "are") {
        predicate = words.slice(i + 1).join(" ") || "thing";
        break;
      }
    }
    
    return {
      type: "ConceptNode",
      name: predicate.toLowerCase(),
      truthValue: { strength: 0.6, confidence: 0.5 }
    };
  }

  private createFallbackAtom(text: string): AtomeseAtom {
    return {
      type: "ConceptNode",
      name: text.slice(0, 50), // Limit length
      truthValue: { strength: 0.3, confidence: 0.2 }
    };
  }

  private createFallbackNL(atoms: AtomeseAtom[]): string {
    if (atoms.length === 0) return "Empty knowledge representation";
    if (atoms.length === 1) return atoms[0].name || `A ${atoms[0].type} concept`;
    return `Knowledge structure with ${atoms.length} interconnected concepts`;
  }

  /**
   * Clear translation caches
   */
  clearCache(): void {
    this.nlToAtomeseCache.clear();
    this.atomeseToNlCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { nlToAtomese: number; atomeseToNl: number } {
    return {
      nlToAtomese: this.nlToAtomeseCache.size,
      atomeseToNl: this.atomeseToNlCache.size
    };
  }
}