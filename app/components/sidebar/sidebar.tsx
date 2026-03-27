import { useRef } from 'react';
import { Plus } from 'lucide-react';
import { Tooltip } from '@/app/components/ui/tooltip';
import { SidebarList } from './sidebar-list';
import type { ChatSession } from '@/app/types';

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
      {isOpen && <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={onClose} />}

      <aside
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:translate-x-0'
        } fixed z-30 flex h-full w-72 flex-col bg-[#0a0a0a] transition-all duration-300 md:relative md:z-auto ${
          isOpen ? 'overflow-hidden' : 'md:w-0 md:overflow-hidden'
        }`}
      >
        <div className="p-4">
          <Tooltip content="New Chat" shortcut="⌘⇧O" position="right">
            <button
              onClick={onNewChat}
              className="flex w-full cursor-pointer items-center justify-center gap-2 truncate rounded-xl border px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                color: 'var(--accent)',
              }}
            >
              <Plus size={16} className="shrink-0" />
              <span className="truncate">New Chat</span>
            </button>
          </Tooltip>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="truncate px-2 py-1 text-xs font-medium tracking-wider text-neutral-500 uppercase">
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
