import React from "react";
import { AtomeseAtom } from "../types";

interface AtomeseDisplayProps {
  atoms: AtomeseAtom[];
  showTruthValues?: boolean;
  collapsible?: boolean;
  maxDepth?: number;
  className?: string;
}

export function AtomeseDisplay({
  atoms,
  showTruthValues = true,
  collapsible = true,
  maxDepth = 5,
  className = ""
}: AtomeseDisplayProps) {
  const formatTruthValue = (tv?: { strength: number; confidence: number }) => {
    if (!tv || !showTruthValues) return "";
    return ` <${tv.strength.toFixed(3)}, ${tv.confidence.toFixed(3)}>`;
  };

  const renderAtom = (atom: AtomeseAtom, depth = 0): React.ReactNode => {
    const indent = "  ".repeat(depth);
    const key = `${atom.type}-${atom.name || "anon"}-${depth}`;

    if (depth > maxDepth) {
      return (
        <div key={key} className="text-gray-500 italic">
          {indent}... (max depth reached)
        </div>
      );
    }

    const tvDisplay = formatTruthValue(atom.truthValue);
    
    if (!atom.outgoing || atom.outgoing.length === 0) {
      // Leaf node
      return (
        <div key={key} className="font-mono">
          <span className="text-blue-600">({atom.type}</span>
          {atom.name && (
            <span className="text-green-700"> "{atom.name}"</span>
          )}
          <span className="text-blue-600">)</span>
          <span className="text-gray-500 text-sm">{tvDisplay}</span>
        </div>
      );
    }

    // Node with outgoing links
    return (
      <div key={key} className="font-mono">
        <div>
          <span className="text-blue-600">({atom.type}</span>
          {atom.name && (
            <span className="text-green-700"> "{atom.name}"</span>
          )}
          <span className="text-gray-500 text-sm">{tvDisplay}</span>
        </div>
        <div className="ml-4 border-l border-gray-300 pl-2">
          {atom.outgoing.map((child: AtomeseAtom, index: number) => (
            <div key={`${key}-${index}`}>
              {renderAtom(child, depth + 1)}
            </div>
          ))}
        </div>
        <div className="text-blue-600">)</div>
      </div>
    );
  };

  if (!atoms || atoms.length === 0) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
        <div className="text-gray-500 italic">No Atomese representation available</div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
      <div className="mb-2 text-sm font-semibold text-gray-700">
        Atomese Representation ({atoms.length} atom{atoms.length !== 1 ? "s" : ""})
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {atoms.map((atom, index) => (
          <div key={index} className="border-b border-gray-200 pb-2 last:border-b-0">
            {renderAtom(atom)}
          </div>
        ))}
      </div>
    </div>
  );
}