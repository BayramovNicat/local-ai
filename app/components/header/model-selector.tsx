"use client";

import { useState } from "react";
import { Bot, ChevronDown, Search } from "lucide-react";
import { Tooltip } from "../ui/tooltip";

export function ModelSelector({
  isOpen,
  models,
  selected,
  accent,
  onToggle,
  onSelect,
}: {
  isOpen: boolean;
  models: string[];
  selected: string;
  accent: string;
  onToggle: () => void;
  onSelect: (model: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = models.filter((m) =>
    m.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <Tooltip content="Select Model" position="bottom" className="inline-block">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-700 hover:border-neutral-500 transition-colors text-sm cursor-pointer max-w-45 sm:max-w-none"
          aria-label={`Select AI model, current: ${selected}`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <Bot size={14} style={{ color: accent }} />
          <span className="text-neutral-200 truncate">{selected}</span>
          <ChevronDown
            size={14}
            className={`text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </Tooltip>

      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-[#0a0a0a] shadow-2xl shadow-black/50 z-40 border border-neutral-800/50 flex flex-col overflow-hidden backdrop-blur-xl"
          role="listbox"
          aria-label="AI Models"
        >
          <div className="flex items-center gap-2 px-3 border-b border-neutral-800/50">
            <Search size={14} className="text-neutral-500" aria-hidden="true" />
            <input
              id="model-search"
              name="model-search"
              type="text"
              placeholder="Search models..."
              autoFocus
              className="w-full py-3 text-sm bg-transparent text-neutral-200 placeholder-neutral-500 focus:outline-none"
              onChange={(e) => setSearch(e.target.value)}
              value={search}
              aria-label="Search available AI models"
            />
          </div>
          <div className="p-1 max-h-100 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((model) => (
                <button
                  key={model}
                  role="option"
                  aria-selected={model === selected}
                  onClick={() => {
                    onSelect(model);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-all cursor-pointer rounded-lg flex items-center justify-between group ${
                    model === selected
                      ? "bg-neutral-900/50"
                      : "hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200"
                  }`}
                  style={
                    model === selected
                      ? { borderLeft: `2px solid ${accent}` }
                      : undefined
                  }
                >
                  <span className={`truncate ${model === selected ? "text-white font-medium" : ""}`}>
                    {model}
                  </span>
                  {model === selected && (
                    <span 
                      className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 group-hover:text-white transition-colors"
                      style={{ color: accent }}
                    >
                      active
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-8 text-center text-neutral-500 text-sm" role="status">
                No models found
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
