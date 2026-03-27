import { useRef } from "react";
import { Plus } from "lucide-react";
import { Tooltip } from "@/app/components/ui/tooltip";
import { SidebarList } from "./sidebar-list";
import type { ChatSession } from "@/app/types";

export function Sidebar({
  isOpen,
  history,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onClose,
}: {
  isOpen: boolean;
  history: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

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
          <Tooltip content="New Chat" shortcut="⌘⇧O" position="right">
            <button
              onClick={onNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium cursor-pointer border truncate whitespace-nowrap"
              style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--accent)" }}
            >
              <Plus size={16} className="shrink-0" />
              <span className="truncate">New Chat</span>
            </button>
          </Tooltip>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-3 space-y-1"
        >
          <p className="px-2 py-1 text-xs font-medium text-neutral-500 uppercase tracking-wider truncate">
            History
          </p>
          <SidebarList
            history={history}
            activeChatId={activeChatId}
            onSelectChat={onSelectChat}
            onDeleteChat={onDeleteChat}
            scrollContainerRef={scrollRef}
          />
        </div>
      </aside>
    </>
  );
}
