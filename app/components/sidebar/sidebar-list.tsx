'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Tooltip } from '@/app/components/ui/tooltip';
import type { ChatSession } from '@/app/types';
import {
  INITIAL_VISIBLE_CHATS,
  LOAD_MORE_CHATS_INCREMENT,
  SCROLL_THRESHOLD_BOTTOM,
} from '@/app/data/constants';

interface SidebarListProps {
  history: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function SidebarList({
  history,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  scrollContainerRef,
}: SidebarListProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CHATS);
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (
        scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD_BOTTOM &&
        visibleCount < history.length &&
        !isLoadingMoreRef.current
      ) {
        isLoadingMoreRef.current = true;
        setVisibleCount((prev) => Math.min(prev + LOAD_MORE_CHATS_INCREMENT, history.length));
        // Small delay to prevent double-triggering
        setTimeout(() => {
          isLoadingMoreRef.current = false;
        }, 100);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [history.length, visibleCount, scrollContainerRef]);

  const visibleHistory = history.slice(0, visibleCount);

  return (
    <>
      {visibleHistory.map((session) => (
        <div
          key={session.id}
          className={`group flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
            activeChatId === session.id
              ? ''
              : 'border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
          }`}
          style={{
            contentVisibility: 'auto',
            containIntrinsicSize: 'auto 40px',
            ...(activeChatId === session.id
              ? {
                  borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                  color: '#ffffff',
                }
              : {}),
          }}
          onClick={() => onSelectChat(session.id)}
        >
          <MessageSquare size={14} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">{session.title}</span>
          <Tooltip content="Delete Chat" position="right" className="inline-block">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(session.id);
              }}
              className="shrink-0 cursor-pointer py-1 text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
            >
              <Trash2 size={13} />
            </button>
          </Tooltip>
        </div>
      ))}
    </>
  );
}
