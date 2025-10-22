import React, { useState, useCallback } from "react";
import { AtomeseAtom, TranslationResult, AtomeseToNLResult } from "../types";
import { AtomeseDisplay } from "./AtomeseDisplay";
import { useOpenCogRuntime } from "../hooks/useOpenCogRuntime";

interface TranslationPanelProps {
  className?: string;
  defaultMode?: "nl-to-atomese" | "atomese-to-nl";
}

export function TranslationPanel({ 
  className = "", 
  defaultMode = "nl-to-atomese" 
}: TranslationPanelProps) {
  const [mode, setMode] = useState<"nl-to-atomese" | "atomese-to-nl">(defaultMode);
  const [inputText, setInputText] = useState("");
  const [inputAtomese, setInputAtomese] = useState("");
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [nlResult, setNlResult] = useState<AtomeseToNLResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { translateToAtomese, translateToNaturalLanguage } = useOpenCogRuntime();

  const handleNLToAtomeseTranslation = useCallback(async () => {
    if (!inputText.trim()) return;
    
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await translateToAtomese(inputText);
      setTranslationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setIsTranslating(false);
    }
  }, [inputText, translateToAtomese]);

  const handleAtomeseToNLTranslation = useCallback(async () => {
    if (!inputAtomese.trim()) return;
    
    setIsTranslating(true);
    setError(null);
    
    try {
      // Parse the input Atomese (simplified JSON parsing)
      const atoms: AtomeseAtom[] = JSON.parse(inputAtomese);
      const result = await translateToNaturalLanguage(atoms);
      setNlResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setIsTranslating(false);
    }
  }, [inputAtomese, translateToNaturalLanguage]);

  const clearResults = useCallback(() => {
    setTranslationResult(null);
    setNlResult(null);
    setError(null);
  }, []);

  return (
    <div className={`p-6 bg-white rounded-lg shadow-lg ${className}`}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Bidirectional Translation
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setMode("nl-to-atomese");
              clearResults();
            }}
            className={`px-4 py-2 rounded-md ${
              mode === "nl-to-atomese"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Natural Language → Atomese
          </button>
          <button
            onClick={() => {
              setMode("atomese-to-nl");
              clearResults();
            }}
            className={`px-4 py-2 rounded-md ${
              mode === "atomese-to-nl"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Atomese → Natural Language
          </button>
        </div>
      </div>

      {mode === "nl-to-atomese" ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Natural Language Input:
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter natural language text to convert to Atomese..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
            />
          </div>
          
          <button
            onClick={handleNLToAtomeseTranslation}
            disabled={!inputText.trim() || isTranslating}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTranslating ? "Translating..." : "Translate to Atomese"}
          </button>

          {translationResult && (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-md">
                <p className="text-sm font-medium text-green-800">
                  Translation Confidence: {(translationResult.confidence * 100).toFixed(1)}%
                </p>
                {translationResult.explanation && (
                  <p className="text-sm text-green-700 mt-1">
                    {translationResult.explanation}
                  </p>
                )}
              </div>
              <AtomeseDisplay atoms={translationResult.atomese} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Atomese Input (JSON format):
            </label>
            <textarea
              value={inputAtomese}
              onChange={(e) => setInputAtomese(e.target.value)}
              placeholder={`Enter Atomese in JSON format, e.g.:
[
  {
    "type": "ConceptNode",
    "name": "love",
    "truthValue": {"strength": 0.8, "confidence": 0.7}
  }
]`}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              rows={6}
            />
          </div>
          
          <button
            onClick={handleAtomeseToNLTranslation}
            disabled={!inputAtomese.trim() || isTranslating}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTranslating ? "Translating..." : "Translate to Natural Language"}
          </button>

          {nlResult && (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-md">
                <p className="text-sm font-medium text-green-800">
                  Translation Confidence: {(nlResult.confidence * 100).toFixed(1)}%
                </p>
                {nlResult.context && (
                  <p className="text-sm text-green-700 mt-1">
                    Context: {nlResult.context}
                  </p>
                )}
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">Natural Language:</h3>
                <p className="text-blue-900">{nlResult.naturalLanguage}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}