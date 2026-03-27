"use client";

import { useState, useEffect, useRef } from "react";
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
  return (
    <>
      <Tooltip content="Select Model" position="bottom" className="inline-block">
        <button
          onClick={onToggle}
          className="flex max-w-45 cursor-pointer items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-sm transition-colors hover:border-neutral-500 sm:max-w-none"
          aria-label={`Select AI model, current: ${selected}`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <Bot size={14} style={{ color: accent }} />
          <span className="truncate text-neutral-200">{selected}</span>
          <ChevronDown
            size={14}
            className={`text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </Tooltip>

      {isOpen && (
        <ModelDropdownContent
          models={models}
          selected={selected}
          accent={accent}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      )}
    </>
  );
}

function ModelDropdownContent({
  models,
  selected,
  accent,
  onSelect,
  onToggle,
}: {
  models: string[];
  selected: string;
  accent: string;
  onSelect: (model: string) => void;
  onToggle: () => void;
}) {
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = models.filter((m) => m.toLowerCase().includes(search.toLowerCase()));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % (filtered.length || 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[activeIndex]) {
          onSelect(filtered[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onToggle();
        break;
    }
  };

  // Ensure active item is visible in the scrollable list
  useEffect(() => {
    if (listRef.current) {
      const activeElement = listRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  return (
    <div
      className="absolute top-full right-0 z-40 mt-2 flex w-72 flex-col overflow-hidden rounded-xl border border-neutral-800/50 bg-[#0a0a0a] shadow-2xl shadow-black/50 backdrop-blur-xl"
      role="listbox"
      aria-label="AI Models"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-2 border-b border-neutral-800/50 px-3">
        <Search size={14} className="text-neutral-500" aria-hidden="true" />
        <input
          id="model-search"
          name="model-search"
          type="text"
          placeholder="Search models..."
          autoFocus
          className="w-full bg-transparent py-3 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none"
          onChange={(e) => {
            setSearch(e.target.value);
            setActiveIndex(0);
          }}
          value={search}
          aria-label="Search available AI models"
          aria-autocomplete="list"
          aria-controls="model-list"
          aria-activedescendant={`model-option-${activeIndex}`}
        />
      </div>
      <div id="model-list" ref={listRef} className="max-h-100 overflow-y-auto p-1">
        {filtered.length > 0 ? (
          filtered.map((model, index) => (
            <button
              key={model}
              id={`model-option-${index}`}
              role="option"
              aria-selected={model === selected}
              onClick={() => onSelect(model)}
              className={`group flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                index === activeIndex
                  ? "bg-neutral-800 text-white"
                  : model === selected
                    ? "bg-neutral-900/50 text-neutral-200"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
              }`}
              style={model === selected ? { borderLeft: `2px solid ${accent}` } : undefined}
            >
              <span className={`truncate ${model === selected ? "font-medium text-white" : ""}`}>
                {model}
              </span>
              {model === selected && (
                <span
                  className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-neutral-400 uppercase transition-colors group-hover:text-white"
                  style={{ color: accent }}
                >
                  active
                </span>
              )}
            </button>
          ))
        ) : (
          <div className="px-3 py-8 text-center text-sm text-neutral-500" role="status">
            No models found
          </div>
        )}
      </div>
    </div>
  );
}
