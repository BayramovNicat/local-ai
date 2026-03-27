'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from './chat-message';
import type { Message } from '@/app/types';
import {
  INITIAL_VISIBLE_MESSAGES,
  LOAD_MORE_MESSAGES_INCREMENT,
  SCROLL_THRESHOLD_TOP,
} from '@/app/data/constants';

interface MessageListProps {
  messages: Message[];
  onEdit: (id: string) => void;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

export function MessageList({ messages, onEdit, scrollContainerRef }: MessageListProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_MESSAGES);
  const isLoadingMoreRef = useRef(false);

  // Handle loading more when scrolling to top
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // If user is near top and there are more messages to show
      if (
        container.scrollTop < SCROLL_THRESHOLD_TOP &&
        visibleCount < messages.length &&
        !isLoadingMoreRef.current
      ) {
        isLoadingMoreRef.current = true;

        const prevScrollHeight = container.scrollHeight;
        const prevScrollTop = container.scrollTop;

        setVisibleCount((prev) => {
          const nextCount = Math.min(prev + LOAD_MORE_MESSAGES_INCREMENT, messages.length);

          // Use requestAnimationFrame to adjust scroll after the new messages are rendered
          requestAnimationFrame(() => {
            if (!container) return;
            const newScrollHeight = container.scrollHeight;
            const heightDiff = newScrollHeight - prevScrollHeight;

            if (heightDiff > 0) {
              container.scrollTop = prevScrollTop + heightDiff;
            }
            isLoadingMoreRef.current = false;
          });

          return nextCount;
        });
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages.length, visibleCount, scrollContainerRef]);

  // Only render the last N messages
  const visibleMessages = messages.slice(-visibleCount);

  return (
    <>
      {visibleMessages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} onEdit={onEdit} />
      ))}
    </>
  );
}
