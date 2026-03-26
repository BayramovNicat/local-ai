"use client";

import { useState } from "react";
import { Bot, ChevronDown } from "lucide-react";
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
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#0a0a0a] shadow-2xl shadow-black/50 z-40 border border-neutral-800/50 p-2 space-y-1">
          <input
            id="model-search"
            name="model-search"
            type="text"
            placeholder="Search models..."
            autoFocus
            className="w-full px-3 py-2 text-sm bg-transparent rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-none"
            onChange={(e) => setSearch(e.target.value)}
            value={search}
          />
          {filtered.map((model) => (
            <button
              key={model}
              onClick={() => {
                onSelect(model);
                setSearch("");
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer rounded-lg border ${
                model === selected
                  ? ""
                  : "border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
              }`}
              style={
                model === selected
                  ? { borderColor: `${accent}4D`, color: "#ffffff" }
                  : undefined
              }
            >
              {model}
              {model === selected && (
                <span className="ml-2 text-xs text-neutral-500">active</span>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
