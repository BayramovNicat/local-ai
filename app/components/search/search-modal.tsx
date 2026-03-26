"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, MessageSquare, User, Bot, Loader2 } from "lucide-react";
import type { SearchResult } from "@/app/types";

export function SearchModal({
  isOpen,
  accent,
  isSearching,
  isIndexing,
  isEmbeddingReady,
  onSearch,
  onSelectResult,
  onClose,
}: {
  isOpen: boolean;
  accent: string;
  isSearching: boolean;
  isIndexing: boolean;
  isEmbeddingReady: boolean;
  onSearch: (query: string) => Promise<SearchResult[]>;
  onSelectResult: (chatId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setQuery("");
        setResults([]);
        setHasSearched(false);
      });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        const res = await onSearch(value);
        setResults(res);
        setHasSearched(true);
      }, 300);
    },
    [onSearch],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-160 mx-4 bg-[#111111] border border-neutral-800 rounded-2xl overflow-hidden flex flex-col max-h-[70vh] shadow-2xl animate-[slideUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-800">
          <Search size={18} className="shrink-0" style={{ color: accent }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search your conversations semantically..."
            className="flex-1 bg-transparent border-none outline-none text-neutral-200 text-sm placeholder:text-neutral-500"
          />
          {isSearching && (
            <Loader2 size={16} className="shrink-0 spinner" style={{ color: accent }} />
          )}
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Status bar */}
        {(isIndexing || !isEmbeddingReady) && (
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-neutral-800 text-xs text-neutral-500">
            <Loader2 size={12} className="spinner" style={{ color: accent }} />
            <span>
              {!isEmbeddingReady
                ? "Loading embedding model..."
                : "Indexing messages..."}
            </span>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 min-h-40">
          {/* Empty state — initial */}
          {!hasSearched && !query.trim() && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <MessageSquare size={36} style={{ color: `${accent}44` }} />
              <p className="text-sm text-neutral-400">
                Search your conversations semantically
              </p>
              <p className="text-xs text-neutral-600">
                Type to find messages by meaning, not just keywords
              </p>
            </div>
          )}

          {/* Empty state — no results */}
          {hasSearched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Search size={36} style={{ color: `${accent}44` }} />
              <p className="text-sm text-neutral-400">No results found</p>
              <p className="text-xs text-neutral-600">
                Try rephrasing your search query
              </p>
            </div>
          )}

          {/* Result items */}
          {results.map((result, idx) => (
            <button
              key={`${result.messageId}-${idx}`}
              className="w-full text-left px-4 py-3 rounded-xl border border-transparent hover:bg-neutral-900 hover:border-neutral-800 transition-colors cursor-pointer mb-1"
              onClick={() => {
                onSelectResult(result.chatId);
                onClose();
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                  <MessageSquare size={11} />
                  {result.chatTitle}
                </span>
                <div className="flex items-center gap-2 text-neutral-500">
                  {result.role === "user" ? (
                    <User size={11} />
                  ) : (
                    <Bot size={11} />
                  )}
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border"
                    style={{
                      color: accent,
                      borderColor: `${accent}4D`,
                    }}
                  >
                    {Math.round(result.score * 100)}%
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-neutral-300 line-clamp-3">
                {result.text}
              </p>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-5 px-5 py-2.5 border-t border-neutral-800 text-[11px] text-neutral-600">
          <span>
            <kbd className="inline-block px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px] mr-1 font-sans">
              esc
            </kbd>
            close
          </span>
          <span>
            <kbd className="inline-block px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px] mr-1 font-sans">
              ↵
            </kbd>
            select
          </span>
        </div>
      </div>
    </div>
  );
}
