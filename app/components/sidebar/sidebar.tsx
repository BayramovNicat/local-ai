"use client";

import { MessageSquare, Plus, Trash2 } from "lucide-react";

import type { ChatSession } from "@/app/types";

export function Sidebar({
  isOpen,
  accent,
  history,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onClose,
}: {
  isOpen: boolean;
  accent: string;
  history: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0"
        } fixed md:relative z-30 md:z-auto w-72 h-full transition-all duration-300 flex flex-col bg-[#0a0a0a] ${
          isOpen ? "overflow-hidden" : "md:w-0 md:overflow-hidden"
        }`}
      >
        <div className="p-4">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium cursor-pointer border truncate whitespace-nowrap"
            style={{ borderColor: `${accent}4D`, color: accent }}
          >
            <Plus size={16} className="shrink-0" />
            <span className="truncate">New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="px-2 py-1 text-xs font-medium text-neutral-500 uppercase tracking-wider truncate">
            History
          </p>
          {history.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm border min-w-0 ${
                activeChatId === session.id
                  ? ""
                  : "border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
              }`}
              style={activeChatId === session.id ? { borderColor: `${accent}4D`, color: "#ffffff" } : undefined}
              onClick={() => onSelectChat(session.id)}
            >
              <MessageSquare size={14} className="shrink-0" />
              <span className="truncate flex-1 min-w-0">{session.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-red-400 cursor-pointer shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
