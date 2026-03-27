"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { Tooltip } from "@/app/components/ui/tooltip";
import type { ChatSession } from "@/app/types";

interface SidebarListProps {
  history: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

const INITIAL_VISIBLE = 40;
const LOAD_MORE_INCREMENT = 40;

export function SidebarList({
  history,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  scrollContainerRef,
}: SidebarListProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (
        scrollHeight - scrollTop - clientHeight < 200 &&
        visibleCount < history.length &&
        !isLoadingMoreRef.current
      ) {
        isLoadingMoreRef.current = true;
        setVisibleCount((prev) => Math.min(prev + LOAD_MORE_INCREMENT, history.length));
        // Small delay to prevent double-triggering
        setTimeout(() => {
          isLoadingMoreRef.current = false;
        }, 100);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [history.length, visibleCount, scrollContainerRef]);

  const visibleHistory = history.slice(0, visibleCount);

  return (
    <>
      {visibleHistory.map((session) => (
        <div
          key={session.id}
          className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm border min-w-0 ${
            activeChatId === session.id
              ? ""
              : "border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
          }`}
          style={{
            contentVisibility: "auto",
            containIntrinsicSize: "auto 40px",
            ...(activeChatId === session.id
              ? { borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", color: "#ffffff" }
              : {}),
          }}
          onClick={() => onSelectChat(session.id)}
        >
          <MessageSquare size={14} className="shrink-0" />
          <span className="truncate flex-1 min-w-0">{session.title}</span>
          <Tooltip
            content="Delete Chat"
            position="right"
            className="inline-block"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-red-400 cursor-pointer shrink-0 py-1"
            >
              <Trash2 size={13} />
            </button>
          </Tooltip>
        </div>
      ))}
    </>
  );
}
