'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, MessageSquare, User, Bot, FileText, Loader2 } from 'lucide-react';
import type { SearchResult } from '@/app/types';
import { SEARCH_DEBOUNCE_MS } from '@/app/data/constants';

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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryIdRef = useRef<number>(0);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape and handle Arrow Keys
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        onSelectResult(results[selectedIndex].chatId);
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, results, selectedIndex, onSelectResult]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && results.length > 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const selectedItems = Array.from(container.children) as HTMLElement[];
      const selectedItem = selectedItems[selectedIndex];
      if (selectedItem) {
        const itemTop = selectedItem.offsetTop;
        const itemBottom = itemTop + selectedItem.offsetHeight;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.offsetHeight;

        if (itemTop < containerTop) {
          container.scrollTo({ top: itemTop - 8, behavior: 'smooth' });
        } else if (itemBottom > containerBottom) {
          container.scrollTo({
            top: itemBottom - container.offsetHeight + 8,
            behavior: 'smooth',
          });
        }
      }
    }
  }, [selectedIndex, results.length]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      setSelectedIndex(0);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value.trim()) {
        setResults([]);
        setHasSearched(false);
        latestQueryIdRef.current++; // Invalidate any pending search
        return;
      }

      const queryId = ++latestQueryIdRef.current;

      debounceRef.current = setTimeout(async () => {
        try {
          const res = await onSearch(value);
          // Only update if this is still the latest query
          if (queryId === latestQueryIdRef.current) {
            setResults(res);
            setSelectedIndex(0);
            setHasSearched(true);
          }
        } catch (err) {
          console.error('Search error:', err);
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    [onSearch],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-[fadeIn_0.15s_ease-out] items-start justify-center bg-black/60 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 flex max-h-[70vh] w-full max-w-160 animate-[slideUp_0.2s_ease-out] flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-[#111111] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-neutral-800 px-5 py-4">
          <Search size={18} className="shrink-0" style={{ color: accent }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search your conversations semantically..."
            className="flex-1 border-none bg-transparent text-sm text-neutral-200 outline-none placeholder:text-neutral-500"
          />
          {isSearching && (
            <Loader2 size={16} className="spinner shrink-0" style={{ color: accent }} />
          )}
          <button
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
          >
            <X size={14} />
          </button>
        </div>

        {/* Status bar */}
        {(isIndexing || !isEmbeddingReady) && (
          <div className="flex items-center gap-2 border-b border-neutral-800 px-5 py-2.5 text-xs text-neutral-500">
            <Loader2 size={12} className="spinner" style={{ color: accent }} />
            <span>{!isEmbeddingReady ? 'Loading embedding model...' : 'Indexing messages...'}</span>
          </div>
        )}

        {/* Results */}
        <div ref={scrollContainerRef} className="relative min-h-40 flex-1 overflow-y-auto p-2">
          {/* Empty state — initial */}
          {!hasSearched && !query.trim() && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <MessageSquare size={36} style={{ color: `${accent}44` }} />
              <p className="text-sm text-neutral-400">Search your conversations semantically</p>
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
              <p className="text-xs text-neutral-600">Try rephrasing your search query</p>
            </div>
          )}

          {/* Result items */}
          {results.map((result, idx) => (
            <button
              key={`${result.messageId}-${idx}`}
              className={`mb-1 w-full cursor-pointer rounded-xl border border-transparent px-4 py-3 text-left transition-all ${
                selectedIndex === idx ? 'border-white/5 bg-white/5' : 'hover:bg-white/3'
              }`}
              onClick={() => {
                onSelectResult(result.chatId);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                  <MessageSquare size={11} />
                  {result.chatTitle}
                </span>
                <div className="flex items-center gap-2 text-neutral-500">
                  {result.role === 'document' ? (
                    <FileText size={11} />
                  ) : result.role === 'user' ? (
                    <User size={11} />
                  ) : (
                    <Bot size={11} />
                  )}
                  <span
                    className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      color: accent,
                      borderColor: `${accent}4D`,
                    }}
                  >
                    {Math.round(result.score * 100)}%
                  </span>
                </div>
              </div>
              <p
                className={`line-clamp-3 text-xs leading-relaxed transition-colors ${
                  selectedIndex === idx ? 'text-neutral-200' : 'text-neutral-400'
                }`}
              >
                {result.text}
              </p>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-5 border-t border-neutral-800 px-5 py-2.5 text-[11px] text-neutral-600">
          <span>
            <kbd className="mr-1 inline-block rounded bg-neutral-800 px-1.5 py-0.5 font-sans text-[10px] text-neutral-400">
              esc
            </kbd>
            close
          </span>
          <span>
            <kbd className="mr-1 inline-block rounded bg-neutral-800 px-1.5 py-0.5 font-sans text-[10px] text-neutral-400">
              ↵
            </kbd>
            select
          </span>
        </div>
      </div>
    </div>
  );
}
